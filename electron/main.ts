import { app, BrowserWindow, ipcMain, safeStorage, nativeTheme } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { initDatabase, closeDatabase } from './database/client';
import { registerIpcHandlers } from './ipc/handlers';
import { fileWatcherService } from './services/watcher.service';

// The built directory structure
//
// ├─┬─ dist-electron
// │ ├── main.js
// │ └── preload.js
// ├─┬─ dist
// │ └── index.html

process.env.APP_ROOT = path.join(__dirname, '..');

const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL'];
const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron');
const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist');

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST;

let mainWindow: BrowserWindow | null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    
    // macOS Native Look
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    
    // Vibrancy (macOS only) - creates frosted glass effect
    transparent: true,
    backgroundColor: '#00000000',
    vibrancy: 'sidebar',
    visualEffectState: 'active',
    
    // Icon
    icon: path.join(process.env.APP_ROOT || '', 'build/icon.png'),
    
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Explicitly set dock icon for macOS dev mode
  if (process.platform === 'darwin') {
    app.dock.setIcon(path.join(process.env.APP_ROOT || '', 'build/icon.png'));
  }

  // Graceful window show
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Test active push message to Renderer-process.
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow?.webContents.send('main-process-message', new Date().toLocaleString());
  });

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(RENDERER_DIST, 'index.html'));
  }
}

// ----- IPC Handlers -----

// API Key management using safeStorage (Keychain on macOS)
const API_KEY_FILE = path.join(app.getPath('userData'), '.api-key');

ipcMain.handle('api-key:set', async (_event, key: string) => {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption not available on this system');
  }
  const encrypted = safeStorage.encryptString(key);
  await fs.promises.writeFile(API_KEY_FILE, encrypted);
  return true;
});

ipcMain.handle('api-key:has', async () => {
  try {
    await fs.promises.access(API_KEY_FILE);
    return true;
  } catch {
    return false;
  }
});

ipcMain.handle('api-key:get', async () => {
  // Only used internally for AI requests - never send raw key to renderer
  try {
    const encrypted = await fs.promises.readFile(API_KEY_FILE);
    return safeStorage.decryptString(encrypted);
  } catch {
    return null;
  }
});

ipcMain.handle('api-key:delete', async () => {
  try {
    await fs.promises.unlink(API_KEY_FILE);
    return true;
  } catch {
    return false;
  }
});

// Theme sync
ipcMain.handle('theme:get', () => {
  return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
});

nativeTheme.on('updated', () => {
  mainWindow?.webContents.send('theme:changed', nativeTheme.shouldUseDarkColors ? 'dark' : 'light');
});

// ----- App Lifecycle -----

app.whenReady().then(() => {
  // Initialize database
  initDatabase();
  
  // Register all IPC handlers
  registerIpcHandlers();
  
  // Start file watcher for external changes
  fileWatcherService.start();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDatabase();
    app.quit();
    mainWindow = null;
  }
});

app.on('before-quit', () => {
  closeDatabase();
});
