import { noteRepository } from '../repositories/note.repository';
import { folderRepository } from '../repositories/folder.repository';
import { fileService } from './file.service';
import { embeddingService } from './embedding.service';
import type { ToolName } from './ai-tools';

interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Execute AI tool calls and return results
 */
export async function executeToolCall(
  toolName: ToolName,
  args: Record<string, any>
): Promise<ToolResult> {
  try {
    switch (toolName) {
      case 'create_folder': {
        // SMART: Check if folder with this name already exists
        const existingFolders = await folderRepository.findAll();
        const existing = existingFolders.find(
          f => f.name.toLowerCase() === args.name.toLowerCase()
        );
        
        if (existing) {
          // Return the existing folder instead of creating a duplicate
          console.log(`[AI] Folder "${args.name}" already exists, using existing ID: ${existing.id}`);
          return {
            success: true,
            data: { 
              message: `Using existing folder "${existing.name}"`, 
              folder: existing,
              wasExisting: true,
            },
          };
        }
        
        const folder = await folderRepository.create({
          name: args.name,
          parentId: args.parentId || null,
        });
        return {
          success: true,
          data: { message: `Created folder "${args.name}"`, folder },
        };
      }

      case 'move_note_to_folder': {
        // SMART: Validate note ID
        let note = await noteRepository.findById(args.noteId);
        if (!note) {
          // Try to find note by title if ID looks like a title
          const allNotes = await noteRepository.findAll();
          const foundNote = allNotes.find(n => n.title.toLowerCase() === args.noteId.toLowerCase());
          if (!foundNote) {
            return { success: false, error: `Note not found: ${args.noteId}` };
          }
          note = foundNote;
          console.log(`[AI] Correcting noteId from "${args.noteId}" to "${note.id}"`);
        }
        
        // SMART: Validate folder ID
        let targetFolderId = args.folderId === 'null' || args.folderId === null ? null : args.folderId;
        let folder = null;
        
        if (targetFolderId) {
          folder = await folderRepository.findById(targetFolderId);
          if (!folder) {
            // Try to find folder by name if ID looks wrong
            const allFolders = await folderRepository.findAll();
            folder = allFolders.find(f => 
              f.name.toLowerCase() === targetFolderId.toLowerCase() ||
              f.name.toLowerCase() === args.folderId.toLowerCase()
            );
            if (folder) {
              console.log(`[AI] Correcting folderId from "${args.folderId}" to "${folder.id}"`);
              targetFolderId = folder.id;
            } else {
              return { success: false, error: `Folder not found: ${args.folderId}` };
            }
          }
        }
        
        await noteRepository.update(note.id, { folderId: targetFolderId });
        return {
          success: true,
          data: {
            message: folder
              ? `Moved note "${note.title}" to folder "${folder.name}"`
              : `Moved note "${note.title}" to root level`,
          },
        };
      }

      case 'create_note': {
        const filePath = fileService.generateFilePath(args.title);
        const content = args.content || '';
        await fileService.writeNote(filePath, content);
        
        const note = await noteRepository.create({
          title: args.title,
          filePath,
          folderId: args.folderId || null,
        });

        // Generate embedding in background
        embeddingService.embedNote(note.id).catch(console.error);

        return {
          success: true,
          data: { message: `Created note "${args.title}"`, note },
        };
      }

      case 'list_notes': {
        let notes;
        if (args.folderId) {
          notes = await noteRepository.findByFolderId(args.folderId);
        } else {
          notes = await noteRepository.findAll();
        }
        return {
          success: true,
          data: {
            notes: notes.map((n: any) => ({
              id: n.id,
              title: n.title,
              folderId: n.folderId,
              createdAt: n.createdAt,
            })),
            count: notes.length,
          },
        };
      }

      case 'list_folders': {
        const folders = await folderRepository.findAll();
        return {
          success: true,
          data: {
            folders: folders.map(f => ({
              id: f.id,
              name: f.name,
              parentId: f.parentId,
            })),
            count: folders.length,
          },
        };
      }

      case 'rename_note': {
        const note = await noteRepository.findById(args.noteId);
        if (!note) {
          return { success: false, error: `Note not found with ID: ${args.noteId}` };
        }
        await noteRepository.update(args.noteId, { title: args.newTitle });
        return {
          success: true,
          data: { message: `Renamed note to "${args.newTitle}"` },
        };
      }

      case 'rename_folder': {
        const folder = await folderRepository.findById(args.folderId);
        if (!folder) {
          return { success: false, error: `Folder not found with ID: ${args.folderId}` };
        }
        await folderRepository.update(args.folderId, { name: args.newName });
        return {
          success: true,
          data: { message: `Renamed folder to "${args.newName}"` },
        };
      }

      case 'delete_folder': {
        const folder = await folderRepository.findById(args.folderId);
        if (!folder) {
          return { success: false, error: `Folder not found with ID: ${args.folderId}` };
        }
        // Move notes to root before deleting
        const notes = await noteRepository.findByFolderId(args.folderId);
        for (const note of notes) {
          await noteRepository.update(note.id, { folderId: null });
        }
        await folderRepository.delete(args.folderId);
        return {
          success: true,
          data: { message: `Deleted folder "${folder.name}". ${notes.length} notes moved to root.` },
        };
      }

      case 'delete_note': {
        const note = await noteRepository.findById(args.noteId);
        if (!note) {
          return { success: false, error: `Note not found with ID: ${args.noteId}` };
        }
        await fileService.deleteNote(note.filePath);
        await noteRepository.delete(args.noteId);
        return {
          success: true,
          data: { message: `Deleted note "${note.title}"` },
        };
      }

      case 'search_notes': {
        // Use embedding service for semantic search
        const results = await embeddingService.searchSimilar(args.query, 5);
        if (results.length > 0) {
          return {
            success: true,
            data: {
              notes: results.map(r => ({
                id: r.id,
                title: r.title,
                similarity: r.similarity,
                preview: r.content.slice(0, 200),
              })),
              count: results.length,
            },
          };
        }
        // Fall back to keyword search
        const allNotes = await noteRepository.findAll();
        const queryLower = args.query.toLowerCase();
        const matched = [];
        for (const note of allNotes) {
          if (note.title.toLowerCase().includes(queryLower)) {
            const content = await fileService.readNote(note.filePath);
            matched.push({
              id: note.id,
              title: note.title,
              preview: content.slice(0, 200),
            });
          }
        }
        return {
          success: true,
          data: { notes: matched, count: matched.length },
        };
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` };
    }
  } catch (error: any) {
    console.error(`Tool execution error (${toolName}):`, error);
    return { success: false, error: error.message || 'Tool execution failed' };
  }
}
