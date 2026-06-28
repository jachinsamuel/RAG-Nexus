# Nexus Cognitive RAG Engine

Nexus is an enterprise-grade, ultra-high-performance RAG (Retrieval-Augmented Generation) workspace designed for developers, researchers, and AI enthusiasts. Powered by a unified **Spatial Glassmorphism Interface** with Framer-Motion-inspired spring physics, Nexus delivers a seamless cognitive experience for querying local repositories, interacting with multi-provider LLMs, managing memory facts, executing custom skills, and saving code directly to your local workspace.

---

## ✨ Key Features & Experience Highlights

### 💎 Spatial Glassmorphism Interface & Motion Design
- **Unified Spatial Glass Architecture**: Clean translucent frosted glass panels with hardware backdrop blurring (`backdrop-filter: blur(16px)`), subtle ambient radial mesh glows, and high-contrast typography (`Inter`).
- **Dark Glass (Midnight) & Light Glass (Studio)**: Instant one-click switching between dark navy charcoal and clean white studio modes.
- **Framer-Motion Fluid Micro-Animations**: Built-in spring physics (`cubic-bezier(0.34, 1.56, 0.64, 1)`) driving tactile button compressions, smooth popups, and dynamic sliding pill tab indicators (`.drawer-tab-indicator`).

### 🧠 Advanced RAG & Vector Engine
- **Multi-Provider LLM Integration**: Connect directly to Google Gemini, Anthropic Claude, OpenAI, and custom OpenAI-compatible endpoints (Groq, NVIDIA NIM, OpenRouter, DeepSeek, etc.).
- **Automatic Ollama Auto-Scanner**: Automatically scans local Ollama instances on ports `11434` / `11435`, detecting installed models for instant zero-configuration local AI inference.
- **Hybrid Vector Retrieval & Grounding**: Ingests, parses, and vector-indexes local workspace documents (`.pdf`, `.txt`, `.md`, `.py`, `.js`, `.json`) with custom chunk sizes and similarity threshold controls.
- **Live Web Search Grounding**: Toggle DuckDuckGo web search to ground AI responses with real-time web references and interactive source badges.

### 🛠️ Developer Productivity Suite
- **Visual File Attachment Chips**: Attach local workspace files via `/file [path]` autocomplete into interactive visual capsule chips above the prompt bar.
- **One-Click Save Code to Workspace**: Every generated code block features a `Save to WS` toolbar action to save code directly into your local workspace directory in one click.
- **Evolving Fact Memory & Custom Skills**: Dynamically extract, manage, and retrieve user facts and author semantic skill modules that shape AI execution context automatically.
- **Thread-Safe Background Streaming**: Switch between multiple active chats without interrupting generation streams.
- **Browser Speech-to-Text NLP**: Speak directly to Nexus using native voice recognition with live audio status feedback.
- **Complete Dialogue Portability**: Export full chat conversations to structured Markdown files anytime with a single click.

---

## 🚀 Quick Start & Installation

Nexus includes automated one-click startup scripts that handle virtual environment setup, package installation, and server launching automatically.

### Windows (PowerShell)
Right-click `run.ps1` and select **Run with PowerShell**, or execute:
```powershell
./run.ps1
```

### Windows (Command Prompt)
Double-click `Nexus.bat` to launch immediately.

The startup script will automatically:
1. Initialize a Python virtual environment (`venv`).
2. Install all required dependencies from `requirements.txt`.
3. Launch the FastAPI Uvicorn engine on `http://127.0.0.1:8000`.

---

## 🛠️ Technology Stack

- **Backend Architecture**: Python 3.9+, FastAPI, Uvicorn, SQLite Vector Engine
- **Frontend Architecture**: HTML5, Vanilla JavaScript (ES6+), Modern CSS3 Glassmorphism
- **Typography & Icons**: Inter Font Family, Feather Icons, Lucide Icons
- **Syntax & Math Rendering**: Prism.js (Midnight Syntax), KaTeX (High-Fidelity LaTeX Math)

---

## 📄 License

Distributed under the MIT License. Built for seamless local AI intelligence.
