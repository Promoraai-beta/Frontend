import OpenAI from 'openai';
import { LLMProvider } from './types';

/**
 * OpenAI GPT Service
 * 
 * Requires: NEXT_PUBLIC_OPENAI_API_KEY in .env.local
 */
export class OpenAIService implements LLMProvider {
  private client: OpenAI | null = null;
  private apiKey: string | undefined;
  private model: string;
  private temperature: number;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
    this.model = process.env.NEXT_PUBLIC_CHAT_OPENAI_MODEL || 'gpt-3.5-turbo';
    this.temperature = parseFloat(process.env.NEXT_PUBLIC_CHAT_TEMPERATURE || '0.7');
    
    // Debug logging (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('[OpenAI Service] Configuration:', {
        hasApiKey: !!this.apiKey,
        apiKeyLength: this.apiKey?.length || 0,
        apiKeyPrefix: this.apiKey ? `${this.apiKey.substring(0, Math.min(10, this.apiKey.length))}...` : 'N/A',
        model: this.model,
        temperature: this.temperature,
        envVarExists: typeof process.env.NEXT_PUBLIC_OPENAI_API_KEY !== 'undefined'
      });
    }
    
    if (this.apiKey) {
      // Trim whitespace from API key
      this.apiKey = this.apiKey.trim();
      
    if (this.apiKey) {
      this.client = new OpenAI({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true
      });
      }
    }
  }

  isConfigured(): boolean {
    const configured = !!this.apiKey && !!this.client;
    
    // Debug logging (only in development)
    if (process.env.NODE_ENV === 'development' && !configured) {
      console.warn('[OpenAI Service] Not configured:', {
        hasApiKey: !!this.apiKey,
        hasClient: !!this.client,
        apiKeyPreview: this.apiKey ? `${this.apiKey.substring(0, Math.min(10, this.apiKey.length))}...` : 'undefined',
        envVarExists: typeof process.env.NEXT_PUBLIC_OPENAI_API_KEY !== 'undefined',
        envVarLength: process.env.NEXT_PUBLIC_OPENAI_API_KEY?.length || 0
      });
    }
    
    return configured;
  }

  async chat(messages: Array<{role: string, content: string}>, _problemContext?: string): Promise<string> {
    if (!this.client) {
      const errorMsg = this.apiKey 
        ? 'OpenAI API key is present but client initialization failed. Please check your API key format and restart the dev server.'
        : 'OpenAI API key not configured. Add NEXT_PUBLIC_OPENAI_API_KEY to .env.local and restart the dev server.';
      throw new Error(errorMsg);
    }

    try {
      // Messages can include system, user, and assistant roles
      // Behave like standard ChatGPT: open-ended, no constraints
      const allMessages = messages as any;

      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: allMessages,
        temperature: this.temperature,
        top_p: 1,
        max_tokens: 4000
      });
      
      return completion.choices[0].message.content || "I'm sorry, I couldn't generate a response.";
    } catch (error: any) {
      console.error('OpenAI API Error:', error);
      throw new Error(`OpenAI API Error: ${error.message || 'Failed to get response'}`);
    }
  }
}
