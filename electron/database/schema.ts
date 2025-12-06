import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

/**
 * Folders table - for organizing notes into hierarchical structure
 */
export const folders = sqliteTable('folders', {
  id: text('id').primaryKey(), // UUID
  name: text('name').notNull(),
  parentId: text('parent_id').references((): any => folders.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`)
    .notNull(),
});

/**
 * Notes table - stores metadata for notes
 * Actual content is stored in .md files on disk
 */
export const notes = sqliteTable('notes', {
  id: text('id').primaryKey(), // UUID
  title: text('title').notNull(),
  filePath: text('file_path').notNull().unique(), // Path to .md file relative to notes directory
  folderId: text('folder_id').references(() => folders.id, { onDelete: 'set null' }),
  
  // For AI/RAG features
  embedding: text('embedding'), // JSON string of float32 array for vector search
  summary: text('summary'), // AI-generated summary for better search
  
  // Timestamps
  createdAt: integer('created_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`)
    .notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`)
    .notNull(),
});

/**
 * Settings table - key-value store for app settings
 */
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .default(sql`(unixepoch())`)
    .notNull(),
});

// Type exports for use in repositories
export type Folder = typeof folders.$inferSelect;
export type NewFolder = typeof folders.$inferInsert;
export type Note = typeof notes.$inferSelect;
export type NewNote = typeof notes.$inferInsert;
export type Setting = typeof settings.$inferSelect;
