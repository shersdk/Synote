import { eq, isNull } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { getDatabase } from '../database/client';
import { folders, type Folder, type NewFolder } from '../database/schema';
import { BaseRepository } from './base.repository';

export interface CreateFolderDTO {
  name: string;
  parentId?: string | null;
}

export interface UpdateFolderDTO {
  name?: string;
  parentId?: string | null;
}

export class FolderRepository extends BaseRepository<Folder, CreateFolderDTO, UpdateFolderDTO> {
  
  async findById(id: string): Promise<Folder | null> {
    const db = getDatabase();
    const result = await db.select().from(folders).where(eq(folders.id, id)).limit(1);
    return result[0] ?? null;
  }

  async findAll(): Promise<Folder[]> {
    const db = getDatabase();
    return db.select().from(folders).orderBy(folders.name);
  }

  /**
   * Find root-level folders (no parent)
   */
  async findRootFolders(): Promise<Folder[]> {
    const db = getDatabase();
    return db.select().from(folders).where(isNull(folders.parentId)).orderBy(folders.name);
  }

  /**
   * Find child folders of a parent
   */
  async findByParentId(parentId: string): Promise<Folder[]> {
    const db = getDatabase();
    return db.select().from(folders).where(eq(folders.parentId, parentId)).orderBy(folders.name);
  }

  async create(data: CreateFolderDTO): Promise<Folder> {
    const db = getDatabase();
    const id = uuidv4();
    const now = new Date();
    
    const newFolder: NewFolder = {
      id,
      name: data.name,
      parentId: data.parentId ?? null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(folders).values(newFolder);
    return newFolder as Folder;
  }

  async update(id: string, data: UpdateFolderDTO): Promise<Folder | null> {
    const db = getDatabase();
    const now = new Date();
    
    await db
      .update(folders)
      .set({ ...data, updatedAt: now })
      .where(eq(folders.id, id));

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const db = getDatabase();
    await db.delete(folders).where(eq(folders.id, id));
    return true;
  }

  /**
   * Get folder tree structure
   */
  async getTree(): Promise<FolderTreeNode[]> {
    const allFolders = await this.findAll();
    return this.buildTree(allFolders, null);
  }

  private buildTree(folders: Folder[], parentId: string | null): FolderTreeNode[] {
    return folders
      .filter(f => f.parentId === parentId)
      .map(folder => ({
        ...folder,
        children: this.buildTree(folders, folder.id),
      }));
  }
}

export interface FolderTreeNode extends Folder {
  children: FolderTreeNode[];
}

// Singleton instance
export const folderRepository = new FolderRepository();
