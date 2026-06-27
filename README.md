# Nexus Cognitive Engine

Nexus is a modern, high-performance RAG (Retrieval-Augmented Generation) application featuring a striking Neobrutalist design. It offers a secure, customizable workspace to upload documents, search the web, manage facts, deploy skills, and interact using multi-provider LLM models or browser-native voice commands.

---

## Key Features

- **Multi-Provider LLM Support**: Connect seamlessly to Google Gemini, Anthropic Claude, OpenAI, and Custom OpenAI-compatible endpoints (Groq, NVIDIA NIM, OpenRouter, DeepSeek, etc.).
- **Smart Vector Ingestion**: Ingest, parse, and partition documents (`.pdf`, `.txt`, `.md`) with custom chunk sizes and overlap controls.
- **Evolving Fact Memory**: Dynamically extracts, stores, edits, and retrieves user preferences or system facts to shape conversational context.
- **Custom Extensible Skills**: Author, update, and manage semantic task skills that automatically influence model prompts during matching contexts.
- **Web Search Integration**: Toggle real-time search results to back up cognitive responses with live web references.
- **Voice Input (NLP)**: Command Nexus using browser-native Speech-to-Text recognition with live mic status updates and pulse animations.
- **Data Portability**: Export complete dialogue histories to clean, formatted Markdown files.

---

## Setup & Running Locally

Nexus includes automated startup scripts to configure your environment, install dependencies, and start the engine in one click.

### Windows (PowerShell)
Right-click `run.ps1` and select **Run with PowerShell**, or execute:
```powershell
./run.ps1
```

### Windows (Command Prompt)
Double-click `Nexus.bat` to launch.

The script will automatically:
1. Verify/create a Python virtual environment (`venv`).
2. Install dependencies specified in `requirements.txt`.
3. Launch the FastAPI server on `http://127.0.0.1:8000` and watch for source modifications.

---

## Technology Stack

- **Backend**: Python 3.9+, FastAPI, Uvicorn, SQLite (Vector similarity matching)
- **Frontend**: Pure HTML5, CSS3 (Neobrutalist theme), Vanilla JavaScript
- **Syntax Highlighting**: Prism.js (Tomorrow Night Theme)
- **Mathematical Rendering**: KaTeX (Fast, high-fidelity LaTeX rendering)
