import { useCallback, useRef } from 'react';
import { API_BASE_URL } from '@/lib/config';

interface TrackEventParams {
  sessionId?: string | null;
  eventType: string;
  model?: string;
  promptText?: string;
  responseText?: string;
  tokensUsed?: number;
  codeSnippet?: string;
  codeLineNumber?: number;
  codeBefore?: string;
  codeAfter?: string;
  metadata?: any;
}

interface CopiedCode {
  text: string;
  timestamp: number;
  model?: string;
  source: 'ai_response' | 'clipboard';
}

export function useAIWatcher() {
  // Track recently copied code to detect AI-generated code pastes
  const lastCopiedCodeRef = useRef<CopiedCode | null>(null);
  const codeFromAIRef = useRef<Map<string, boolean>>(new Map()); // Track which lines are AI-generated

  const trackEvent = useCallback(async (params: TrackEventParams) => {
    try {
      if (!params.sessionId) {
        console.warn('AI Watcher: No sessionId, skipping tracking');
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/ai-interactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: params.sessionId,
          eventType: params.eventType,
          model: params.model,
          promptText: params.promptText,
          responseText: params.responseText,
          tokensUsed: params.tokensUsed,
          codeSnippet: params.codeSnippet,
          codeLineNumber: params.codeLineNumber,
          codeBefore: params.codeBefore,
          codeAfter: params.codeAfter,
          metadata: params.metadata
        })
      });

      if (!response.ok) {
        console.error('AI Watcher: Failed to track event', response.statusText);
      }
    } catch (error) {
      // Silent fail - don't interrupt user experience
      console.error('AI Watcher error:', error);
    }
  }, []);

  // Track when code is copied from AI chat
  const trackCodeCopy = useCallback((codeSnippet: string, model?: string) => {
    lastCopiedCodeRef.current = {
      text: codeSnippet,
      timestamp: Date.now(),
      model,
      source: 'ai_response'
    };
  }, []);

  // Track when code is pasted into editor
  const trackCodePaste = useCallback(async (
    sessionId: string | null, 
    pastedText: string, 
    lineNumber: number,
    codeBefore: string,
    codeAfter: string
  ) => {
    const lastCopied = lastCopiedCodeRef.current;
    
    // Check if paste happened within 30 seconds of copy
    const timeSinceCopy = Date.now() - (lastCopied?.timestamp || 0);
    const isFromAI = lastCopied && timeSinceCopy < 30000 && lastCopied.source === 'ai_response';

    if (isFromAI) {
      // Mark these lines as AI-generated
      const lines = pastedText.split('\n');
      lines.forEach((_, index) => {
        codeFromAIRef.current.set(`${lineNumber + index}`, true);
      });

      // Track the paste event
      await trackEvent({
        sessionId,
        eventType: 'code_pasted_from_ai',
        model: lastCopied.model,
        codeSnippet: pastedText,
        codeLineNumber: lineNumber,
        codeBefore: codeBefore.substring(0, 500), // Limit to avoid huge payloads
        codeAfter: codeAfter.substring(0, 500),
        metadata: {
          timeSinceCopy: timeSinceCopy / 1000, // seconds
          lineCount: lines.length
        }
      });

      // Also track the copy event retroactively
      await trackEvent({
        sessionId,
        eventType: 'code_copied_from_ai',
        model: lastCopied.model,
        codeSnippet: lastCopied.text,
        metadata: {
          lineCount: lastCopied.text.split('\n').length,
          copiedAt: lastCopied.timestamp
        }
      });
    }
  }, [trackEvent]);

  // Track code modifications to AI-generated code
  const trackCodeModification = useCallback(async (
    sessionId: string | null,
    lineNumber: number,
    codeBefore: string,
    codeAfter: string,
    oldText: string,
    newText: string
  ) => {
    // Check if the modified line was AI-generated
    const isAIGenerated = codeFromAIRef.current.has(lineNumber.toString());

    if (isAIGenerated) {
      // Calculate modification depth (0 = no change, 10 = complete rewrite)
      let modificationDepth = 5; // default medium change
      
      if (oldText === newText) {
        modificationDepth = 0;
      } else if (oldText.length < 10 || newText.length < 10) {
        // Simple edits (rename, small changes)
        modificationDepth = 3;
      } else {
        // Compare similarity
        const similarity = calculateSimilarity(oldText, newText);
        modificationDepth = (1 - similarity) * 10; // Higher depth = more different
      }

      await trackEvent({
        sessionId,
        eventType: 'code_modified',
        codeLineNumber: lineNumber,
        codeBefore: codeBefore.substring(0, 500),
        codeAfter: codeAfter.substring(0, 500),
        metadata: {
          modificationDepth,
          oldText: oldText.substring(0, 200),
          newText: newText.substring(0, 200),
          isFromAI: true
        }
      });
    }
  }, [trackEvent]);

  return { 
    trackEvent, 
    trackCodeCopy, 
    trackCodePaste, 
    trackCodeModification 
  };
}

// Helper function to calculate similarity between two strings (0-1)
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  // Simple Levenshtein-like similarity
  let matches = 0;
  const window = Math.floor(longer.length / 3);
  
  for (let i = 0; i <= longer.length - window; i++) {
    const substring = longer.substring(i, i + window);
    if (shorter.includes(substring)) {
      matches++;
    }
  }
  
  return matches / (longer.length - window + 1);
}

