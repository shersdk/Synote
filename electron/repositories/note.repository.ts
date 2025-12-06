import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/client';
import { notes, type Note, type NewNote } from '../database/schema';
import { BaseRepository } from './base.repository';

export interface CreateNoteDTO {
  title: string;
  filePath: string;
  folderId?: string | null;
}

export interface UpdateNoteDTO {
  title?: string;
  filePath?: string;
  folderId?: string | null;
  embedding?: string | null;
  summary?: string | null;
}

export class NoteRepository extends BaseRepository<Note, CreateNoteDTO, UpdateNoteDTO> {
  
  async findById(id: string): Promise<Note | null> {
    const db = getDatabase();
    const result = await db.select().from(notes).where(eq(notes.id, id)).limit(1);
    return result[0] ?? null;
  }

  async findAll(): Promise<Note[]> {
    const db = getDatabase();
    return db.select().from(notes).orderBy(notes.updatedAt);
  }

  async findByFolderId(folderId: string | null): Promise<Note[]> {
    const db = getDatabase();
    if (folderId === null) {
      return db.select().from(notes).where(eq(notes.folderId, folderId));
    }
    return db.select().from(notes).where(eq(notes.folderId, folderId));
  }

  async create(data: CreateNoteDTO): Promise<Note> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date();
    
    const newNote: NewNote = {
      id,
      title: data.title,
      filePath: data.filePath,
      folderId: data.folderId ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(notes).values(newNote);
    return { ...newNote, embedding: null, summary: null } as Note;
  }

  async update(id: string, data: UpdateNoteDTO): Promise<Note | null> {
    const db = getDatabase();
    const now = new Date();
    
    await db
      .update(notes)
      .set({ ...data, updatedAt: now })
      .where(eq(notes.id, id));

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    const result = await db.delete(notes).where(eq(notes.id, id));
    return true;
  }

  /**
   * Update note embedding for vector search
   */
  async updateEmbedding(id: string, embedding: number[]): Promise<void> {
    const db = getDatabase();
    await db
      .update(notes)
      .set({ 
        embedding: JSON.stringify(embedding),
        updatedAt: new Date()
      })
      .where(eq(notes.id, id));
  }

  /**
   * Find notes with embeddings for vector search
   */
  async findAllWithEmbeddings(): Promise<Note[]> {
    const db = getDatabase();
    return db.select().from(notes).where(eq(notes.embedding, notes.embedding)); // Not null check workaround
  }
}

// Singleton instance
export const noteRepository = new NoteRepository();
