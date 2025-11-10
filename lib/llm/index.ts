/**
 * LLM Service Factory
 * 
 * To add a new LLM provider:
 * 1. Create lib/llm/[provider-name].ts implementing LLMProvider
 * 2. Import it here
 * 3. Add case in getLLMService()
 * 4. Add NEXT_PUBLIC_[PROVIDER]_API_KEY to .env.local
 */

import { LLMProvider } from './types';
import { OpenAIService } from './openai';
// Add other LLM imports here when ready:
// import { ClaudeService } from './claude';
// import { GeminiService } from './gemini';

export type LLMType = 'openai' | 'claude' | 'gemini' | 'anthropic';

/**
 * Get an LLM service instance
 * @param llmType - The LLM provider type
 * @returns LLMProvider instance
 * @throws Error if provider is not configured or not found
 */
export function getLLMService(llmType: LLMType): LLMProvider {
  switch (llmType) {
    case 'openai': {
      const service = new OpenAIService();
      if (!service.isConfigured()) {
        throw new Error('OpenAI is not configured. Add NEXT_PUBLIC_OPENAI_API_KEY to .env.local');
      }
      return service;
    }
    
    // Add new LLM providers here:
    // case 'claude': {
    //   const service = new ClaudeService();
    //   if (!service.isConfigured()) {
    //     throw new Error('Claude is not configured. Add NEXT_PUBLIC_CLAUDE_API_KEY to .env.local');
    //   }
    //   return service;
    // }
    
    // case 'gemini': {
    //   const service = new GeminiService();
    //   if (!service.isConfigured()) {
    //     throw new Error('Gemini is not configured. Add NEXT_PUBLIC_GEMINI_API_KEY to .env.local');
    //   }
    //   return service;
    // }
    
    default:
      throw new Error(`LLM provider "${llmType}" is not implemented yet.`);
  }
}

/**
 * Check if an LLM provider is available (configured and implemented)
 */
export function isLLMAvailable(llmType: LLMType): boolean {
  try {
    // Check if provider is implemented first
    switch (llmType) {
      case 'openai':
        // OpenAI is implemented
        break;
      case 'claude':
      case 'gemini':
      case 'anthropic':
        // Not implemented yet, return false
        return false;
      default:
        return false;
    }
    
    // If implemented, check if configured
    const service = getLLMService(llmType);
    return service.isConfigured();
  } catch {
    return false;
  }
}

/**
 * Get list of available (configured) LLM providers
 */
export function getAvailableLLMs(): LLMType[] {
  const providers: LLMType[] = ['openai', 'claude', 'gemini', 'anthropic'];
  return providers.filter(p => isLLMAvailable(p));
}
