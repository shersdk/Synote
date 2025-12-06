import fs from 'node:fs';
import path from 'node:path';
import { BrowserWindow } from 'electron';
import { fileService } from './file.service';

/**
 * FileWatcherService watches the notes directory for changes
 * and notifies the renderer when files are modified externally
 */
export class FileWatcherService {
  private watcher: fs.FSWatcher | null = null;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Start watching the notes directory
   */
  start(): void {
    const notesDir = fileService.getNotesDir();
    
    if (this.watcher) {
      this.stop();
    }

    try {
      this.watcher = fs.watch(notesDir, { persistent: true }, (eventType, filename) => {
        if (!filename || !filename.endsWith('.md')) return;

        // Debounce to avoid multiple events for same file
        const existingTimer = this.debounceTimers.get(filename);
        if (existingTimer) {
          clearTimeout(existingTimer);
        }

        const timer = setTimeout(() => {
          this.notifyRenderer(eventType, filename);
          this.debounceTimers.delete(filename);
        }, 300);

        this.debounceTimers.set(filename, timer);
      });

      console.log(`[FileWatcher] Watching: ${notesDir}`);
    } catch (error) {
      console.error('[FileWatcher] Failed to start:', error);
    }
  }

  /**
   * Stop watching
   */
  stop(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }

    // Clear all debounce timers
    for (const timer of this.debounceTimers.values()) {
      clearTimeout(timer);
    }
    this.debounceTimers.clear();
  }

  /**
   * Notify the renderer process about file changes
   */
  private notifyRenderer(eventType: string, filename: string): void {
    const windows = BrowserWindow.getAllWindows();
    for (const window of windows) {
      window.webContents.send('file:changed', {
        type: eventType,
        filename,
        path: path.join(fileService.getNotesDir(), filename),
      });
    }
  }
}

// Singleton instance
export const fileWatcherService = new FileWatcherService();
