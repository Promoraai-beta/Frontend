/**
 * LLM Service Interface
 * 
 * All LLM providers must implement this interface.
 * To add a new LLM:
 * 1. Create a new service class in lib/llm/
 * 2. Implement LLMProvider interface
 * 3. Add it to getLLMService() in lib/llm/index.ts
 * 4. Add API key to .env.local as NEXT_PUBLIC_[LLM]_API_KEY
 */

export interface LLMProvider {
  /**
   * Send a chat message and get response
   * @param messages - Array of message objects with role and content
   * @param problemContext - Optional problem context to help the LLM understand the coding problem
   * @returns The AI response as a string
   */
  chat(messages: Array<{role: string, content: string}>, problemContext?: string): Promise<string>;
  
  /**
   * Check if this LLM provider is properly configured
   * @returns true if API key exists and service is ready
   */
  isConfigured(): boolean;
}
