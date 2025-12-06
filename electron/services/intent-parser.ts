import { noteRepository } from '../repositories/note.repository';
import { folderRepository } from '../repositories/folder.repository';
import { aiService } from './ai.service';
import { fileService } from './file.service';

/**
 * Parsed intent from AI
 */
export interface ParsedIntent {
  action: 'move_note' | 'create_folder' | 'create_note' | 'delete_folder' | 'delete_note' | 'rename_note' | 'rename_folder' | 'list' | 'question' | 'unknown';
  noteName?: string;
  folderName?: string;
  newName?: string; // For renaming
  question?: string;
}

/**
 * Resolved action with real IDs
 */
export interface ResolvedAction {
  type: string;
  description: string;
  arguments: Record<string, any>; // Store IDs for execution
  execute: () => Promise<{ success: boolean; message: string }>;
}

/**
 * Calculate Levenshtein distance for fuzzy matching
 */
function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

/**
 * Find best matching item by name with fuzzy matching
 */
function findByName<T extends { id: string; name?: string; title?: string }>(
  query: string,
  items: T[],
  maxDistance: number = 3
): T | null {
  if (!query || items.length === 0) return null;
  
  const queryLower = query.toLowerCase().trim();
  let bestMatch: T | null = null;
  let bestScore = Infinity;
  
  for (const item of items) {
    const itemName = ((item as any).name || (item as any).title || '').toLowerCase();
    
    // Exact match - highest priority
    if (itemName === queryLower) return item;
    
    // Contains match
    if (itemName.includes(queryLower) || queryLower.includes(itemName)) {
      const score = Math.abs(itemName.length - queryLower.length);
      if (score < bestScore) {
        bestScore = score;
        bestMatch = item;
      }
      continue;
    }
    
    // Fuzzy match
    const distance = levenshtein(queryLower, itemName);
    if (distance <= maxDistance && distance < bestScore) {
      bestScore = distance;
      bestMatch = item;
    }
  }
  
  return bestMatch;
}

/**
 * System prompt for intent parsing (simple JSON extraction)
 */
const INTENT_PARSE_PROMPT = `You are a command parser. Extract the user's intent as JSON.

ONLY return valid JSON, nothing else. Use this schema:
{
  "action": "move_note" | "create_folder" | "create_note" | "delete_folder" | "delete_note" | "rename_note" | "rename_folder" | "list" | "question",
  "noteName": "name of note mentioned (if any)",
  "folderName": "name of folder mentioned (if any)",
  "newName": "new name/title for rename actions (if any)",
  "question": "the question if action is 'question'"
}

Examples:
User: "Move Sher1234 to Speed12"
{"action":"move_note","noteName":"Sher1234","folderName":"Speed12"}

User: "Create a folder called Projects"
{"action":"create_folder","folderName":"Projects"}

User: "Create a new note called Meeting Notes in Projects"
{"action":"create_note","noteName":"Meeting Notes","folderName":"Projects"}

User: "Delete the test folder"
{"action":"delete_folder","folderName":"test"}

User: "Delete note Sher1234"
{"action":"delete_note","noteName":"Sher1234"}

User: "Rename Speed12 to Work"
{"action":"rename_folder","folderName":"Speed12","newName":"Work"}

User: "Rename Sher1234 to Important Doc"
{"action":"rename_note","noteName":"Sher1234","newName":"Important Doc"}

User: "What are my notes about?"
{"action":"question","question":"What are my notes about?"}

User: "List my notes"
{"action":"list"}

ONLY output the JSON object. No explanation.`;

/**
 * Parse user message to extract intent using AI
 */
export async function parseIntent(message: string): Promise<ParsedIntent> {
  try {
    // Use system message to guide JSON extraction
    const response = await aiService.chat(
      [
        { role: 'system' as const, content: INTENT_PARSE_PROMPT },
        { role: 'user', content: message },
      ],
      [], // no context needed for parsing
      false, // disable tools - we just want text
    );
    
    // Extract JSON from response
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log('[Intent Parser] Parsed:', parsed);
      return parsed;
    }
    
    return { action: 'unknown' };
  } catch (error) {
    console.error('[Intent Parser] Error:', error);
    return { action: 'unknown' };
  }
}

/**
 * Get the system prompt for intent parsing
 */
export function getIntentParseSystemPrompt(): string {
  return INTENT_PARSE_PROMPT;
}

/**
 * Resolve intent to executable action with real IDs
 */
export async function resolveIntent(intent: ParsedIntent): Promise<{
  resolved: boolean;
  action?: ResolvedAction;
  error?: string;
}> {
  const notes = await noteRepository.findAll();
  const folders = await folderRepository.findAll();
  
  switch (intent.action) {
    case 'move_note': {
      if (!intent.noteName) return { resolved: false, error: 'No note name specified' };
      if (!intent.folderName) return { resolved: false, error: 'No folder name specified' };
      
      const note = findByName(intent.noteName, notes);
      const folder = findByName(intent.folderName, folders);
      
      if (!note) return { resolved: false, error: `Note "${intent.noteName}" not found` };
      if (!folder) return { resolved: false, error: `Folder "${intent.folderName}" not found` };
      
      return {
        resolved: true,
        action: {
          type: 'move_note_to_folder',
          description: `Move "${note.title}" to folder "${folder.name}"`,
          arguments: { noteId: note.id, folderId: folder.id },
          execute: async () => { return { success: true, message: 'Executed via tool-executor' }; },
        },
      };
    }
    
    case 'create_folder': {
      if (!intent.folderName) return { resolved: false, error: 'No folder name specified' };
      
      const existing = findByName(intent.folderName, folders);
      if (existing && existing.name.toLowerCase() === intent.folderName.toLowerCase()) {
        return { resolved: false, error: `Folder "${existing.name}" already exists` };
      }
      
      return {
        resolved: true,
        action: {
          type: 'create_folder',
          description: `Create folder "${intent.folderName}"`,
          arguments: { name: intent.folderName },
          execute: async () => { return { success: true, message: 'Executed via tool-executor' }; },
        },
      };
    }

    case 'create_note': {
      if (!intent.noteName) return { resolved: false, error: 'No note title specified' };
      
      let folderId = null;
      let folderNameDescription = 'root';
      
      if (intent.folderName) {
        const folder = findByName(intent.folderName, folders);
        if (folder) {
          folderId = folder.id;
          folderNameDescription = folder.name;
        } 
        // If folder not found, we could default to root or error. For now, let's error if explicit folder was asked but not found
        else {
           return { resolved: false, error: `Folder "${intent.folderName}" not found` };
        }
      }

      return {
        resolved: true,
        action: {
          type: 'create_note',
          description: `Create note "${intent.noteName}" in ${folderNameDescription}`,
          arguments: { title: intent.noteName, folderId },
          execute: async () => { return { success: true, message: 'Executed via tool-executor' }; },
        },
      };
    }
    
    case 'delete_folder': {
      if (!intent.folderName) return { resolved: false, error: 'No folder name specified' };
      
      const folder = findByName(intent.folderName, folders);
      if (!folder) return { resolved: false, error: `Folder "${intent.folderName}" not found` };
      
      return {
        resolved: true,
        action: {
          type: 'delete_folder',
          description: `Delete folder "${folder.name}"`,
          arguments: { folderId: folder.id },
          execute: async () => { return { success: true, message: 'Executed via tool-executor' }; },
        },
      };
    }

    case 'delete_note': {
      if (!intent.noteName) return { resolved: false, error: 'No note name specified' };
      
      const note = findByName(intent.noteName, notes);
      if (!note) return { resolved: false, error: `Note "${intent.noteName}" not found` };
      
      return {
        resolved: true,
        action: {
          type: 'delete_note',
          description: `Delete note "${note.title}"`,
          arguments: { noteId: note.id },
          execute: async () => { return { success: true, message: 'Executed via tool-executor' }; },
        },
      };
    }

    case 'rename_note': {
      if (!intent.noteName) return { resolved: false, error: 'No note name specified' };
      if (!intent.newName) return { resolved: false, error: 'No new name specified' };

      const note = findByName(intent.noteName, notes);
      if (!note) return { resolved: false, error: `Note "${intent.noteName}" not found` };

      return {
        resolved: true,
        action: {
          type: 'rename_note',
          description: `Rename note "${note.title}" to "${intent.newName}"`,
          arguments: { noteId: note.id, newTitle: intent.newName },
          execute: async () => { return { success: true, message: 'Executed via tool-executor' }; },
        },
      };
    }

    case 'rename_folder': {
      if (!intent.folderName) return { resolved: false, error: 'No folder name specified' };
      if (!intent.newName) return { resolved: false, error: 'No new name specified' };

      const folder = findByName(intent.folderName, folders);
      if (!folder) return { resolved: false, error: `Folder "${intent.folderName}" not found` };

      return {
        resolved: true,
        action: {
          type: 'rename_folder',
          description: `Rename folder "${folder.name}" to "${intent.newName}"`,
          arguments: { folderId: folder.id, newName: intent.newName },
          execute: async () => { return { success: true, message: 'Executed via tool-executor' }; },
        },
      };
    }
    
    case 'list': {
      return {
        resolved: true,
        action: {
          type: 'list_notes', // Handled by tool-executor as 'list_notes' (or 'list_folders'?)
          // tool-executor supports 'list_notes' and 'list_folders'. 
          // 'list' intent is broad. Let's assume list_notes for now or maybe both if we could chain.
          // For now map to 'list_notes'.
          description: 'List notes and folders',
          arguments: {},
          execute: async () => { 
             // We can just return success here as executeToolCall will handle logic if passed 'list_notes'
             return { success: true, message: 'Executed via tool-executor' };
          },
        },
      };
    }
    
    case 'question':
      // Questions should be handled by AI with full context
      return { resolved: false, error: 'FALLBACK_TO_AI' };
    
    default:
      return { resolved: false, error: 'Could not understand the command' };
  }
}
