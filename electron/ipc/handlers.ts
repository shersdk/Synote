import { ipcMain, app } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { noteRepository } from '../repositories/note.repository';
import { folderRepository } from '../repositories/folder.repository';
import { fileService } from '../services/file.service';
import { aiService } from '../services/ai.service';
import { embeddingService } from '../services/embedding.service';
import { executeToolCall } from '../services/tool-executor';
import { parseIntent, resolveIntent, getIntentParseSystemPrompt } from '../services/intent-parser';
import type { NoteContext } from '../services/ai.service';
import type { ToolName } from '../services/ai-tools';

const THEME_FILE = path.join(app.getPath('userData'), '.color-theme');

/**
 * Register all IPC handlers for the main process
 */
export function registerIpcHandlers() {
  // ----- Notes -----
  
  ipcMain.handle('notes:list', async () => {
    return noteRepository.findAll();
  });

  ipcMain.handle('notes:get', async (_event, id: string) => {
    const note = await noteRepository.findById(id);
    if (note) {
      const content = await fileService.readNote(note.filePath);
      return { ...note, content };
    }
    return null;
  });

  ipcMain.handle('notes:create', async (_event, data: { title: string; content?: string; folderId?: string }) => {
    const filePath = fileService.generateFilePath(data.title);
    const markdown = data.content ? fileService.htmlToMarkdown(data.content) : '';
    await fileService.writeNote(filePath, markdown);
    
    const note = await noteRepository.create({
      title: data.title,
      filePath,
      folderId: data.folderId,
    });

    embeddingService.embedNote(note.id).catch(console.error);
    return note;
  });

  ipcMain.handle('notes:update', async (_event, id: string, data: { title?: string; content?: string; folderId?: string | null }) => {
    const note = await noteRepository.findById(id);
    if (!note) return null;

    if (data.content) {
      const markdown = fileService.htmlToMarkdown(data.content);
      await fileService.writeNote(note.filePath, markdown);
      embeddingService.embedNote(id).catch(console.error);
    }

    return noteRepository.update(id, { 
      title: data.title,
      folderId: data.folderId,
    });
  });

  ipcMain.handle('notes:delete', async (_event, id: string) => {
    const note = await noteRepository.findById(id);
    if (note) {
      await fileService.deleteNote(note.filePath);
      await noteRepository.delete(id);
    }
    return true;
  });

  // ----- Folders -----

  ipcMain.handle('folders:list', async () => {
    return folderRepository.findAll();
  });

  ipcMain.handle('folders:tree', async () => {
    return folderRepository.getTree();
  });

  ipcMain.handle('folders:create', async (_event, data: { name: string; parentId?: string }) => {
    return folderRepository.create(data);
  });

  ipcMain.handle('folders:update', async (_event, id: string, data: { name?: string }) => {
    return folderRepository.update(id, data);
  });

  ipcMain.handle('folders:delete', async (_event, id: string) => {
    return folderRepository.delete(id);
  });

  // ----- AI Chat with Intent Parsing -----

  ipcMain.handle('ai:chat', async (_event, messages: Array<{ role: 'user' | 'assistant'; content: string }>, query: string) => {
    // Use the query parameter which is the current user message
    const userMessage = query;
    if (!userMessage || !userMessage.trim()) {
      return { content: 'No message to process', pendingActions: null };
    }

    // STEP 1: Use AI to parse intent (extract entity names)
    console.log('[AI] Parsing intent from:', userMessage);
    const intent = await parseIntent(userMessage);
    console.log('[AI] Parsed intent:', intent);

    // STEP 2: If it's a question, use full AI response
    if (intent.action === 'question' || intent.action === 'unknown') {
      // Build context for answering questions
      const allNotes = await noteRepository.findAll();
      let context: NoteContext[] = [];
      for (const note of allNotes.slice(0, 10)) {
        const content = await fileService.readNote(note.filePath);
        context.push({ id: note.id, title: note.title, content: content.slice(0, 500) });
      }
      
      // Include the current message in the conversation
      const fullMessages = [...messages, { role: 'user' as const, content: userMessage }];
      const response = await aiService.chat(fullMessages, context, false);
      return { content: response.content, pendingActions: null };
    }

    // STEP 3: Resolve intent to action with real IDs
    const resolution = await resolveIntent(intent);
    
    if (!resolution.resolved || !resolution.action) {
      return { 
        content: resolution.error || 'Could not understand the command', 
        pendingActions: null 
      };
    }

    // STEP 4: Return pending action for user confirmation
    return {
      content: 'I understood your command:',
      pendingActions: [{
        id: 'intent-' + Date.now(),
        name: resolution.action.type,
        arguments: resolution.action.arguments, // Pass resolved IDs
        description: resolution.action.description,
      }],
    };
  });

  // Execute user-approved actions
  ipcMain.handle('ai:execute', async (_event, actions: Array<{ name: string; arguments: Record<string, any> }>) => {
    const results: string[] = [];
    
    for (const action of actions) {
      console.log(`[AI] Executing:`, action.name, action.arguments);
      
      try {
        const result = await executeToolCall(action.name as ToolName, action.arguments);
        
        if (result.success) {
          if (result.data?.message) {
            results.push(result.data.message);
          } else {
            results.push(`Executed ${action.name} successfully`);
          }
        } else {
          results.push(`Failed: ${result.error || 'Unknown error'}`);
        }
      } catch (error: any) {
        console.error('[AI] Execution error:', error);
        results.push(`Failed to execute ${action.name}: ${error.message}`);
      }
    }
    
    return { actions: results };
  });

  ipcMain.handle('ai:generateEmbedding', async (_event, text: string) => {
    return aiService.generateEmbedding(text);
  });

  ipcMain.handle('ai:embedAllNotes', async () => {
    await embeddingService.embedAllNotes();
    return true;
  });

  // ----- Settings -----

  ipcMain.handle('settings:getNotesDir', () => {
    return fileService.getNotesDir();
  });

  ipcMain.handle('settings:getModel', () => {
    return aiService.getModel();
  });

  ipcMain.handle('settings:setModel', async (_event, model: string) => {
    await aiService.setModel(model);
    return true;
  });

  // Color theme handlers
  ipcMain.handle('settings:getColorTheme', async () => {
    try {
      return await fs.promises.readFile(THEME_FILE, 'utf-8');
    } catch {
      return 'blue';
    }
  });

  ipcMain.handle('settings:setColorTheme', async (_event, theme: string) => {
    await fs.promises.writeFile(THEME_FILE, theme, 'utf-8');
    return true;
  });
}

// Helper to describe actions in human-readable form
function describeAction(name: string, args: Record<string, any>, notes: any[], folders: any[]): string {
  switch (name) {
    case 'create_folder':
      return `Create folder "${args.name}"`;
    case 'move_note_to_folder': {
      const note = notes.find(n => n.id === args.noteId);
      const folder = folders.find(f => f.id === args.folderId);
      return `Move "${note?.title || 'note'}" → "${folder?.name || 'folder'}"`;
    }
    case 'create_note':
      return `Create note "${args.title}"`;
    case 'rename_note': {
      const n = notes.find(x => x.id === args.noteId);
      return `Rename "${n?.title || 'note'}" → "${args.newTitle}"`;
    }
    case 'rename_folder': {
      const f = folders.find(x => x.id === args.folderId);
      return `Rename folder "${f?.name || 'folder'}" → "${args.newName}"`;
    }
    case 'delete_folder': {
      const f = folders.find(x => x.id === args.folderId);
      return `Delete folder "${f?.name || 'folder'}"`;
    }
    default:
      return `${name}`;
  }
}
