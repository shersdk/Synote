import { noteRepository } from '../repositories/note.repository';
import { aiService, NoteContext } from './ai.service';
import { fileService } from './file.service';

/**
 * EmbeddingService handles vector embeddings for semantic search
 */
export class EmbeddingService {
  /**
   * Generate and store embedding for a note
   */
  async embedNote(noteId: string): Promise<void> {
    const note = await noteRepository.findById(noteId);
    if (!note) return;

    const content = await fileService.readNote(note.filePath);
    if (!content.trim()) return;

    // Generate embedding from title + content
    const text = `${note.title}\n\n${content}`;
    const embedding = await aiService.generateEmbedding(text);

    if (embedding.length > 0) {
      await noteRepository.updateEmbedding(noteId, embedding);
    }
  }

  /**
   * Search notes by semantic similarity
   */
  async searchSimilar(query: string, limit: number = 5): Promise<NoteContext[]> {
    // Generate query embedding
    const queryEmbedding = await aiService.generateEmbedding(query);
    if (queryEmbedding.length === 0) {
      return [];
    }

    // Get all notes with embeddings
    const notes = await noteRepository.findAll();
    const results: NoteContext[] = [];

    for (const note of notes) {
      if (!note.embedding) continue;

      try {
        const noteEmbedding = JSON.parse(note.embedding) as number[];
        const similarity = aiService.cosineSimilarity(queryEmbedding, noteEmbedding);

        if (similarity > 0.3) { // Threshold for relevance
          const content = await fileService.readNote(note.filePath);
          results.push({
            id: note.id,
            title: note.title,
            content: content.slice(0, 2000),
            similarity,
          });
        }
      } catch (e) {
        // Skip notes with invalid embeddings
        continue;
      }
    }

    // Sort by similarity and return top results
    return results
      .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
      .slice(0, limit);
  }

  /**
   * Re-embed all notes (useful after initial setup)
   */
  async embedAllNotes(): Promise<void> {
    const notes = await noteRepository.findAll();
    
    for (const note of notes) {
      try {
        await this.embedNote(note.id);
      } catch (error) {
        console.error(`Failed to embed note ${note.id}:`, error);
      }
    }
  }
}

// Singleton instance
export const embeddingService = new EmbeddingService();
