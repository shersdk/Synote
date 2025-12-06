import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // API Key management (secure - never exposes raw key to renderer)
  apiKey: {
    set: (key: string) => ipcRenderer.invoke('api-key:set', key),
    has: () => ipcRenderer.invoke('api-key:has'),
    delete: () => ipcRenderer.invoke('api-key:delete'),
  },

  // Notes
  notes: {
    list: () => ipcRenderer.invoke('notes:list'),
    get: (id: string) => ipcRenderer.invoke('notes:get', id),
    create: (data: { title: string; content?: string; folderId?: string }) => 
      ipcRenderer.invoke('notes:create', data),
    update: (id: string, data: { title?: string; content?: string }) => 
      ipcRenderer.invoke('notes:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('notes:delete', id),
  },

  // Folders
  folders: {
    list: () => ipcRenderer.invoke('folders:list'),
    tree: () => ipcRenderer.invoke('folders:tree'),
    create: (data: { name: string; parentId?: string }) => 
      ipcRenderer.invoke('folders:create', data),
    update: (id: string, data: { name?: string }) => 
      ipcRenderer.invoke('folders:update', id, data),
    delete: (id: string) => ipcRenderer.invoke('folders:delete', id),
  },

  // AI
  ai: {
    chat: (messages: Array<{ role: 'user' | 'assistant'; content: string }>, query: string) =>
      ipcRenderer.invoke('ai:chat', messages, query),
    execute: (actions: Array<{ name: string; arguments: Record<string, any> }>) =>
      ipcRenderer.invoke('ai:execute', actions),
    generateEmbedding: (text: string) => ipcRenderer.invoke('ai:generateEmbedding', text),
  },

  // Settings
  settings: {
    getNotesDir: () => ipcRenderer.invoke('settings:getNotesDir'),
    getModel: () => ipcRenderer.invoke('settings:getModel'),
    setModel: (model: string) => ipcRenderer.invoke('settings:setModel', model),
  },

  // Theme
  theme: {
    get: () => ipcRenderer.invoke('theme:get'),
    onChanged: (callback: (theme: 'dark' | 'light') => void) => {
      ipcRenderer.on('theme:changed', (_event, theme) => callback(theme));
    },
  },

  // App info
  platform: process.platform,
});

// Type definitions for the exposed API
declare global {
  interface Window {
    electronAPI: {
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
        chat: (messages: Array<{ role: 'user' | 'assistant'; content: string }>, query: string) => Promise<{
          content: string;
          pendingActions: Array<{ id: string; name: string; arguments: Record<string, any>; description: string }> | null;
        }>;
        execute: (actions: Array<{ name: string; arguments: Record<string, any> }>) => Promise<{ actions: string[] }>;
        generateEmbedding: (text: string) => Promise<number[]>;
      };
      settings: {
        getNotesDir: () => Promise<string>;
        getModel: () => Promise<string>;
        setModel: (model: string) => Promise<boolean>;
      };
      theme: {
        get: () => Promise<'dark' | 'light'>;
        onChanged: (callback: (theme: 'dark' | 'light') => void) => void;
      };
      platform: NodeJS.Platform;
    };
  }
}
