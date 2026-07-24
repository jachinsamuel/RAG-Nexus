import os

readme_text = """# Nexus Cognitive RAG Engine

[![FastAPI](https://img.shields.io/badge/FastAPI-005587?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)
[![SQLite](https://img.shields.io/badge/SQLite-003B57?style=for-the-badge&logo=sqlite&logoColor=white)](https://www.sqlite.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg?style=for-the-badge)](LICENSE)

**Nexus** is an enterprise-grade, ultra-high-performance RAG (Retrieval-Augmented Generation) workspace designed for developers, researchers, and AI enthusiasts. Powered by a unified **Spatial Glassmorphism Interface** with Framer-Motion-inspired spring physics, Nexus delivers a seamless cognitive experience for querying local repositories, interacting with multi-provider LLMs, managing memory facts, executing custom skills, and saving code directly to your local workspace.

---

## 📽️ Visual Walkthrough & Interface Gallery

### 🖥️ Workspace Overview (Dark & Light Themes)

| 🌙 Midnight Dark Mode | ☀️ Clean Studio Light Mode |
|:---:|:---:|
| ![Nexus Midnight Dark Workspace](assets/nexus_dark_workspace.png) | ![Nexus Studio Light Workspace](assets/nexus_light_workspace.png) |

---

### ⚙️ Configurations Suite & Cognitive Control Panels

| 🔌 Multi-Provider API & RAG Settings | 📚 Knowledge Catalog & Episodic Memory |
|:---:|:---:|
| ![API & RAG Configurations](assets/nexus_configurations_modal.png) | ![Knowledge Catalog & Facts](assets/nexus_knowledge_modal.png) |

| ⚡ Custom Skills Library | 🤖 Subagent Operations Logger |
|:---:|:---:|
| ![Custom Skills Library](assets/nexus_skills_modal.png) | ![Subagent Operations Logger](assets/nexus_agent_logs_modal.png) |

---

### 🎥 Interactive Video Demonstration

> **Video Preview**: Explore the smooth tab navigation, spring physics motion, and theme toggling in action.

[Download / View WebM Video Demo](assets/nexus_demo.webm)

---

## ✨ Core Features & Cognitive Highlights

### 💎 Spatial Glassmorphism Interface & Motion Design
* **Unified Spatial Glass Architecture**: Clean translucent frosted glass panels with hardware backdrop blurring (`backdrop-filter: blur(28px) saturate(190%)`), subtle ambient radial mesh glows, and high-contrast typography (`Inter` + `Outfit`).
* **Dark Glass (Midnight) & Light Glass (Studio)**: Instant one-click switching between dark navy Vantablack charcoal and clean white studio modes.
* **Framer-Motion Fluid Micro-Animations**: Built-in spring physics driving tactile button compressions, smooth popups, and dynamic sliding pill tab indicators (`.drawer-tab-indicator`).

### 🧠 Advanced RAG & Vector Engine
* **Multi-Provider LLM Integration**: Connect directly to Google Gemini, Anthropic Claude, OpenAI, and custom OpenAI-compatible endpoints (Groq, NVIDIA NIM, OpenRouter, DeepSeek, etc.).
* **Automatic Ollama Auto-Scanner**: Automatically scans local Ollama instances on ports `11434` / `11435`, detecting installed models for instant zero-configuration local AI inference.
* **Sentence-Boundary Semantic Chunking**: Ingests document text (`.pdf`, `.txt`, `.md`) and splits paragraphs strictly at sentence transitions, preserving semantic cohesion in embedding vectors and yielding higher retrieval accuracy.
* **Hybrid Vector Retrieval & Grounding**: Ingests, parses, and vector-indexes local workspace files with custom chunk sizes and similarity threshold controls.
* **Live Web Search Grounding**: Toggle DuckDuckGo web search to ground AI responses with real-time web references and interactive source badges.

### ⚡ Performance & Cognitive Optimizations
* **Semantic Query Caching**: Bypasses the LLM entirely for matching questions ($\ge 96\%$ cosine similarity matching of query embeddings in SQLite), serving cached answers in **under 50ms**.
* **Lexical Density Reranking**: Retrieves a larger pool of 25 chunks and reranks them locally on the CPU using Jaccard term-closeness and token gap density, packing only the most relevant contexts into the prompt to reduce token consumption.
* **Conversational Query Reformulation**: Analyzes the active conversation history to resolve pronouns ("it", "that", "this") and context, generating standalone search queries before performing RAG database retrieval.
* **Context Sliding Window**: Limits verbatim chat logs to the last 10 messages, preventing latency degradation and HTTP 400 crashes on extremely long chat sessions.

### 💻 Developer Productivity Suite
* **Interactive Code Diff Viewer**: Compares code blocks against existing files on `Save to Workspace` and shows a side-by-side green/red LCS (Longest Common Subsequence) diff modal to verify changes before writing.
* **Secure Code Execution Sandbox**: Execute Python/JS snippets in a secure local subprocess with a **5-second timeout safeguard** to display console logs, outputs, and exit codes directly in a terminal pane below the code.
* **Autonomous Multi-Agent Loop**: Upgrades Agent Mode into a real 4-turn backend cycle (**Researcher** plan $\rightarrow$ **Developer** draft $\rightarrow$ **Critic** audit $\rightarrow$ **Developer** final refined output) streamed live and logged to the subagent log simultaneously.
* **Subagent Operations Logger**: Dedicated **Agent Logs** tab inside the settings drawer to track subagent thoughts, timestamps, and roles in real-time.
* **Fact Profile Memory Consolidation**: Automatically groups similar extracted profile facts (similarity $\ge 0.82$) and merges duplicate entries via background LLM calls. Included a manual **Consolidate** button in the Knowledge tab.
* **Text-to-Speech Playback**: Reads assistant responses aloud using Web Speech API with automatic markdown and code block sanitization.
* **Visual File Attachment Chips**: Attach local workspace files via `/file [path]` autocomplete into interactive visual capsule chips above the prompt bar.
* **Complete Dialogue Portability**: Export full chat conversations to structured Markdown files anytime with a single click.

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

* **Backend Architecture**: Python 3.9+, FastAPI, Uvicorn, SQLite Vector Engine
* **Frontend Architecture**: HTML5, Vanilla JavaScript (ES6+), Modern CSS3 Glassmorphism
* **Typography & Icons**: Inter Font Family, Feather Icons, Lucide Icons
* **Syntax & Math Rendering**: Prism.js (Midnight Syntax), KaTeX (High-Fidelity LaTeX Math)

---

## 📄 License

Distributed under the MIT License. Built for seamless local AI intelligence.
"""

with open('README.md', 'w', encoding='utf-8') as f:
    f.write(readme_text)

print('Successfully updated README.md with screenshots and video links!')
