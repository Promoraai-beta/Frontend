import OpenAI from 'openai';
import { LLMProvider } from './types';
import { buildFullWorkflowSystemPrompt } from './context';

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
    
    // Log only once per session when key is missing (avoid console spam)
    if (process.env.NODE_ENV === 'development' && !this.apiKey && typeof window !== 'undefined') {
      const logged = (window as any).__openai_config_logged;
      if (!logged) {
        console.warn('[OpenAI Service] No NEXT_PUBLIC_OPENAI_API_KEY — AI chat will be unavailable.');
        (window as any).__openai_config_logged = true;
      }
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
    return !!this.apiKey && !!this.client;
  }

  async chat(messages: Array<{role: string, content: string}>, context?: import('./context').FullWorkflowContext): Promise<string> {
    if (!this.client) {
      const errorMsg = this.apiKey 
        ? 'OpenAI API key is present but client initialization failed. Please check your API key format and restart the dev server.'
        : 'OpenAI API key not configured. Add NEXT_PUBLIC_OPENAI_API_KEY to .env.local and restart the dev server.';
      throw new Error(errorMsg);
    }

    try {
      const systemPrompt = buildFullWorkflowSystemPrompt(context);
      const hasSystem = messages.some(m => m.role === 'system');
      const allMessages = hasSystem
        ? (messages as any[])
        : [{ role: 'system', content: systemPrompt }, ...messages];

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
