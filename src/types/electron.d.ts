// Global type declarations for Electron's preload API

interface PendingAction {
  id: string;
  name: string;
  arguments: Record<string, any>;
  description: string;
}

interface ChatResponse {
  content: string;
  pendingActions: PendingAction[] | null;
}

export interface ElectronAPI {
  apiKey: {
    set: (key: string) => Promise<boolean>;
    has: () => Promise<boolean>;
    delete: () => Promise<boolean>;
  };
  notes: {
    list: () => Promise<any[]>;
    get: (id: string) => Promise<any | null>;
    create: (data: { title: string; content?: string; folderId?: string }) => Promise<any>;
    update: (id: string, data: { title?: string; content?: string }) => Promise<any | null>;
    delete: (id: string) => Promise<boolean>;
  };
  folders: {
    list: () => Promise<any[]>;
    tree: () => Promise<any[]>;
    create: (data: { name: string; parentId?: string }) => Promise<any>;
    update: (id: string, data: { name?: string }) => Promise<any | null>;
    delete: (id: string) => Promise<boolean>;
  };
  ai: {
    chat: (messages: Array<{ role: 'user' | 'assistant'; content: string }>, query: string) => Promise<ChatResponse>;
    execute: (actions: Array<{ name: string; arguments: Record<string, any> }>) => Promise<{ actions: string[] }>;
    generateEmbedding: (text: string) => Promise<number[]>;
  };
  settings: {
    getNotesDir: () => Promise<string>;
    getModel: () => Promise<string>;
    setModel: (model: string) => Promise<boolean>;
    getColorTheme: () => Promise<string>;
    setColorTheme: (theme: string) => Promise<boolean>;
  };
  theme: {
    get: () => Promise<'dark' | 'light'>;
    onChanged: (callback: (theme: 'dark' | 'light') => void) => void;
  };
  platform: NodeJS.Platform;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
