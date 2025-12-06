<div align="center">
  <img src="build/icon.png?raw=true" width="128" alt="Synote Logo" />
  <h1>Synote</h1>
  <p>
    <strong>The AI-First Note Taking App for macOS.</strong>
  </p>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
  [![Electron](https://img.shields.io/badge/Electron-33.0-47848F.svg)](https://www.electronjs.org/)
  [![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC.svg)](https://tailwindcss.com/)

  <br />
  
  <p align="center">
    <a href="#key-features">Key Features</a> •
    <a href="#tech-stack">Tech Stack</a> •
    <a href="#getting-started">Getting Started</a> •
    <a href="#roadmap">Roadmap</a>
  </p>
</div>

---

**Synote** isn't just another note-taking app. It's your **second brain**, built natively for macOS with a focus on speed, privacy, and local-first AI.

We combined the best of modern web tech (`React`, `Vite`) with the power of the desktop (`Electron`, `SQLite`). The result? An app that feels native, looks stunning with **macOS Vibrancy**, and helps you think clearer with integrated RAG (Retrieval-Augmented Generation) AI.

## ✨ Key Features

- **🧠 Local-First AI Context**: Chat with your notes. Synote uses vector embeddings (RAG) to understand exactly what you're working on.
- **🎨 Stunning Native UI**: Built with **Shadcn/UI**, Tailwind, and framer-motion. Uses native macOS background vibrancy (frosted glass) for a premium feel.
- **⚡ Super Fast**: Powered by `better-sqlite3` and `Drizzle ORM` for instant loads. No loading spinners.
- **📝 TipTap Editor**: A Notion-style block editor with "/" slash commands, markdown support, and real-time preview.
- **📂 Smart Organization**: Nested folders, infinite hierarchy, and fuzzy-search command palette.
- **🔒 Privacy Focused**: Your OpenRouter API key is encrypted in the macOS Keychain. Notes live on your disk as `.md` files. You own your data.

## 🛠 Tech Stack

Built with the absolute bleeding edge of the JavaScript ecosystem:

- **Core**: [Electron](https://www.electronjs.org/) + [Vite](https://vitejs.dev/)
- **Frontend**: [React](https://reactjs.org/) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [Shadcn/UI](https://ui.shadcn.com/)
- **Database**: [SQLite](https://www.sqlite.org/) + [Drizzle ORM](https://orm.drizzle.team/)
- **AI/ML**: [OpenAI SDK](https://github.com/openai/openai-node) (OpenRouter) + Vector Embeddings
- **State**: [React Query](https://tanstack.com/query/v4) + Context API

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- macOS (tested on Sonoma/Sequoia)

### Installation

1. **Clone the repo**
   ```bash
   git clone https://github.com/yourusername/synote.git
   cd synote
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build:mac
   ```
   > The `.dmg` installer will be in `dist/`.

## 🤖 AI Setup

Synote supports any model via **OpenRouter**:

1. Go to `Settings` (bottom left).
2. Enter your **OpenRouter API Key**.
3. Select your preferred model (e.g., `google/gemini-2.0-flash`, `anthropic/claude-3`, or free options like `meta/llama-3`).
4. Start chatting! The AI can **create folders**, **move notes**, and **organize your life** for you.

## 🗺 Roadmap

- [x] Basic CRUD & Folders
- [x] Vector Search & RAG
- [x] AI Tool Calling (Move/Create/Rename)
- [ ] Drag & Drop Interface
- [ ] Cloud Sync (Supabase)
- [ ] Mobile Companion App

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---
