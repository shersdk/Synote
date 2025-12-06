import OpenAI from 'openai';
import { safeStorage } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

const API_KEY_FILE = path.join(app.getPath('userData'), '.api-key');
const MODEL_FILE = path.join(app.getPath('userData'), '.ai-model');
const DEFAULT_MODEL = 'amazon/nova-2-lite-v1:free';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface NoteContext {
  id: string;
  title: string;
  content: string;
  similarity?: number;
}

/**
 * AIService handles OpenRouter API interactions for RAG-powered chat
 */
export class AIService {
  private client: OpenAI | null = null;
  private apiKey: string | null = null;
  private modelId: string | null = null;

  /**
   * Set the OpenRouter API key (stored encrypted in Keychain)
   */
  async setApiKey(key: string): Promise<void> {
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption not available on this system');
    }
    const encrypted = safeStorage.encryptString(key);
    await fs.promises.writeFile(API_KEY_FILE, encrypted);
    this.apiKey = key;
    this.client = null; // Reset client to use new key
  }

  /**
   * Check if API key is configured
   */
  async hasApiKey(): Promise<boolean> {
    try {
      await fs.promises.access(API_KEY_FILE);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete the API key
   */
  async deleteApiKey(): Promise<void> {
    try {
      await fs.promises.unlink(API_KEY_FILE);
      this.apiKey = null;
      this.client = null;
    } catch {
      // Ignore if file doesn't exist
    }
  }

  /**
   * Get the current model ID
   */
  async getModel(): Promise<string> {
    if (this.modelId) return this.modelId;
    
    try {
      this.modelId = await fs.promises.readFile(MODEL_FILE, 'utf-8');
      return this.modelId;
    } catch {
      return DEFAULT_MODEL;
    }
  }

  /**
   * Set the model ID
   */
  async setModel(model: string): Promise<void> {
    await fs.promises.writeFile(MODEL_FILE, model, 'utf-8');
    this.modelId = model;
  }

  /**
   * Get the OpenAI client (lazy initialization)
   */
  private async getClient(): Promise<OpenAI> {
    if (this.client) return this.client;

    if (!this.apiKey) {
      try {
        const encrypted = await fs.promises.readFile(API_KEY_FILE);
        this.apiKey = safeStorage.decryptString(encrypted);
      } catch {
        throw new Error('API key not configured. Please add your OpenRouter API key in settings.');
      }
    }

    this.client = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: this.apiKey,
      defaultHeaders: {
        'HTTP-Referer': 'https://synote.app',
        'X-Title': 'Synote',
      },
    });

    return this.client;
  }

  /**
   * Chat with AI, optionally with note context and tool calling
   */
  async chat(
    messages: ChatMessage[],
    context: NoteContext[] = [],
    enableTools: boolean = true,
    model?: string
  ): Promise<{ content: string; toolCalls?: Array<{ id: string; name: string; arguments: Record<string, any> }> }> {
    const client = await this.getClient();
    const useModel = model || await this.getModel();

    // Build system prompt with context
    let systemPrompt = `You are an AI assistant for Synote. You manage notes and folders using tools.

RULES:
1. The user message shows "=== YOUR ONLY DATA ===" with notes and folders
2. ONLY use the IDs shown in parentheses from that section
3. If a folder exists with the requested name, use its exact ID
4. NEVER make up IDs - only use what is listed
5. NEVER call list_notes or list_folders`;

    if (context.length > 0) {
      systemPrompt += `\n\nHere are some relevant notes from the user's collection that may help answer their question:\n\n`;
      for (const note of context) {
        systemPrompt += `--- Note: ${note.title} (ID: ${note.id}) ---\n${note.content}\n\n`;
      }
      systemPrompt += `Use this context to provide accurate, relevant answers. Reference specific notes when appropriate.`;
    }

    const messagesWithSystem = [
      { role: 'system' as const, content: systemPrompt },
      ...messages,
    ];

    try {
      // Import tools dynamically to avoid circular deps
      const { AI_TOOLS } = await import('./ai-tools');
      
      const completion = await client.chat.completions.create({
        model: useModel,
        messages: messagesWithSystem,
        max_tokens: 2048,
        temperature: 0.7,
        ...(enableTools ? { tools: AI_TOOLS, tool_choice: 'auto' } : {}),
      });

      const message = completion.choices[0]?.message;
      
      if (!message) {
        return { content: 'No response generated.' };
      }

      // Check for tool calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        const toolCalls = message.tool_calls.map(tc => ({
          id: tc.id,
          name: tc.function.name,
          arguments: JSON.parse(tc.function.arguments || '{}'),
        }));
        return {
          content: message.content || '',
          toolCalls,
        };
      }

      return { content: message.content || 'No response generated.' };
    } catch (error: any) {
      console.error('AI chat error:', error);
      throw new Error(error.message || 'Failed to get AI response');
    }
  }

  /**
   * Continue chat after tool execution with results
   */
  async continueWithToolResults(
    messages: ChatMessage[],
    toolResults: Array<{ toolCallId: string; result: string }>,
    context: NoteContext[] = [],
    model?: string
  ): Promise<{ content: string; toolCalls?: Array<{ id: string; name: string; arguments: Record<string, any> }> }> {
    const client = await this.getClient();
    const useModel = model || await this.getModel();

    // Build messages including tool results
    const fullMessages: any[] = [
      { role: 'system', content: 'You are a helpful AI assistant for the Synote note-taking app. Summarize the results of the actions you took.' },
      ...messages,
    ];

    // Add tool results as assistant messages
    for (const result of toolResults) {
      fullMessages.push({
        role: 'tool',
        tool_call_id: result.toolCallId,
        content: result.result,
      });
    }

    try {
      const completion = await client.chat.completions.create({
        model: useModel,
        messages: fullMessages,
        max_tokens: 1024,
        temperature: 0.7,
      });

      const message = completion.choices[0]?.message;
      return { content: message?.content || 'Action completed.' };
    } catch (error: any) {
      console.error('AI continue error:', error);
      throw new Error(error.message || 'Failed to continue conversation');
    }
  }

  /**
   * Generate embedding for text (for vector search)
   * Uses a smaller, fast embedding model
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const client = await this.getClient();

    try {
      const response = await client.embeddings.create({
        model: 'openai/text-embedding-3-small',
        input: text.slice(0, 8000), // Limit input length
      });

      return response.data[0]?.embedding || [];
    } catch (error: any) {
      console.error('Embedding generation error:', error);
      // Return empty array on error - caller should handle gracefully
      return [];
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}

// Singleton instance
export const aiService = new AIService();
