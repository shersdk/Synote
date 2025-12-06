import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';

/**
 * FileService handles reading and writing .md note files
 * Notes are stored in the user's documents directory under a Synote folder
 */
export class FileService {
  private notesDir: string;

  constructor() {
    // Store notes in ~/Documents/Synote Notes
    this.notesDir = path.join(app.getPath('documents'), 'Synote Notes');
    this.ensureNotesDir();
  }

  private ensureNotesDir(): void {
    if (!fs.existsSync(this.notesDir)) {
      fs.mkdirSync(this.notesDir, { recursive: true });
    }
  }

  getNotesDir(): string {
    return this.notesDir;
  }

  /**
   * Generate a unique file path for a new note
   */
  generateFilePath(title: string): string {
    // Sanitize title for filename
    const sanitized = title
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .toLowerCase()
      .slice(0, 50);
    
    const timestamp = Date.now();
    const filename = `${sanitized || 'untitled'}-${timestamp}.md`;
    return path.join(this.notesDir, filename);
  }

  /**
   * Read note content from file
   */
  async readNote(filePath: string): Promise<string> {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.notesDir, filePath);
    try {
      return await fs.promises.readFile(fullPath, 'utf-8');
    } catch (error) {
      console.error(`Error reading note: ${filePath}`, error);
      return '';
    }
  }

  /**
   * Write note content to file
   */
  async writeNote(filePath: string, content: string): Promise<void> {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.notesDir, filePath);
    await fs.promises.writeFile(fullPath, content, 'utf-8');
  }

  /**
   * Delete a note file
   */
  async deleteNote(filePath: string): Promise<void> {
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(this.notesDir, filePath);
    try {
      await fs.promises.unlink(fullPath);
    } catch (error) {
      console.error(`Error deleting note: ${filePath}`, error);
    }
  }

  /**
   * List all .md files in the notes directory
   */
  async listNotes(): Promise<string[]> {
    try {
      const files = await fs.promises.readdir(this.notesDir);
      return files.filter(f => f.endsWith('.md'));
    } catch (error) {
      console.error('Error listing notes', error);
      return [];
    }
  }

  /**
   * Convert HTML content to Markdown (basic conversion)
   */
  htmlToMarkdown(html: string): string {
    // Basic HTML to Markdown conversion
    let md = html
      // Headings
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      // Paragraphs
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      // Bold and italic
      .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*')
      // Code
      .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
      .replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gis, '```\n$1\n```\n\n')
      // Lists
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<\/?[uo]l[^>]*>/gi, '\n')
      // Blockquote
      .replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, (_, content) => {
        return content.split('\n').map((line: string) => `> ${line}`).join('\n') + '\n\n';
      })
      // Horizontal rule
      .replace(/<hr[^>]*>/gi, '\n---\n\n')
      // Line breaks
      .replace(/<br\s*\/?>/gi, '\n')
      // Remove remaining HTML tags
      .replace(/<[^>]+>/g, '')
      // Clean up whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return md;
  }

  /**
   * Convert Markdown to HTML (basic conversion)
   */
  markdownToHtml(md: string): string {
    let html = md
      // Headings
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      // Bold and italic
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      // Code blocks
      .replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Lists
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      // Blockquotes
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      // Horizontal rule
      .replace(/^---$/gim, '<hr>')
      // Paragraphs
      .replace(/\n\n/g, '</p><p>')
      // Wrap in paragraph
      .replace(/^(.+)$/gm, (match) => {
        if (match.startsWith('<')) return match;
        return `<p>${match}</p>`;
      });

    return html;
  }
}

// Singleton instance
export const fileService = new FileService();
