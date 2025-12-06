"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("electronAPI", {
  // API Key management (secure - never exposes raw key to renderer)
  apiKey: {
    set: (key) => electron.ipcRenderer.invoke("api-key:set", key),
    has: () => electron.ipcRenderer.invoke("api-key:has"),
    delete: () => electron.ipcRenderer.invoke("api-key:delete")
  },
  // Notes
  notes: {
    list: () => electron.ipcRenderer.invoke("notes:list"),
    get: (id) => electron.ipcRenderer.invoke("notes:get", id),
    create: (data) => electron.ipcRenderer.invoke("notes:create", data),
    update: (id, data) => electron.ipcRenderer.invoke("notes:update", id, data),
    delete: (id) => electron.ipcRenderer.invoke("notes:delete", id)
  },
  // Folders
  folders: {
    list: () => electron.ipcRenderer.invoke("folders:list"),
    tree: () => electron.ipcRenderer.invoke("folders:tree"),
    create: (data) => electron.ipcRenderer.invoke("folders:create", data),
    update: (id, data) => electron.ipcRenderer.invoke("folders:update", id, data),
    delete: (id) => electron.ipcRenderer.invoke("folders:delete", id)
  },
  // AI
  ai: {
    chat: (messages, query) => electron.ipcRenderer.invoke("ai:chat", messages, query),
    execute: (actions) => electron.ipcRenderer.invoke("ai:execute", actions),
    generateEmbedding: (text) => electron.ipcRenderer.invoke("ai:generateEmbedding", text)
  },
  // Settings
  settings: {
    getNotesDir: () => electron.ipcRenderer.invoke("settings:getNotesDir"),
    getModel: () => electron.ipcRenderer.invoke("settings:getModel"),
    setModel: (model) => electron.ipcRenderer.invoke("settings:setModel", model),
    getColorTheme: () => electron.ipcRenderer.invoke("settings:getColorTheme"),
    setColorTheme: (theme) => electron.ipcRenderer.invoke("settings:setColorTheme", theme)
  },
  // Theme
  theme: {
    get: () => electron.ipcRenderer.invoke("theme:get"),
    onChanged: (callback) => {
      electron.ipcRenderer.on("theme:changed", (_event, theme) => callback(theme));
    }
  },
  // App info
  platform: process.platform
});
