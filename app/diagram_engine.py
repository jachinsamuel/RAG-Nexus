from typing import Dict, Any

def generate_diagram_code(prompt: str, diagram_type: str = "flowchart") -> Dict[str, Any]:
    """Generates structured Mermaid.js diagram syntax based on diagram type and prompt."""
    dtype = diagram_type.lower().strip() if diagram_type else "flowchart"
    p_clean = prompt.strip() if prompt else "Workflow Architecture"

    if "sequence" in dtype or "sequence" in p_clean.lower():
        code = f"""sequenceDiagram
    autonumber
    actor User as User / Client
    participant API as FastAPI Gateway
    participant RAG as RAG Pipeline
    participant DB as SQLite / Vector Cache

    User->>API: POST /chat (Query: {p_clean[:25]})
    API->>RAG: Hybrid Search (HyDE + BM25)
    RAG->>DB: Cosine Similarity Lookup
    DB-->>RAG: Document Chunks
    RAG-->>API: Streamed Tokens (SSE)
    API-->>User: Render Answer & Citations"""
    elif "architecture" in dtype or "class" in dtype or "class" in p_clean.lower():
        code = """classDiagram
    class FastAPIApp {
        +db: Database
        +chat_stream()
        +run_security_audit()
    }
    class RAGEngine {
        +chunk_text()
        +get_embedding()
        +generate_hyde_text()
    }
    class Database {
        +init_db()
        +add_document()
        +search_hybrid()
    }
    FastAPIApp --> Database
    FastAPIApp ..> RAGEngine"""
    elif "mindmap" in dtype or "mindmap" in p_clean.lower():
        code = f"""mindmap
  root(({p_clean[:20]}))
    Core Architecture
      HyDE Expansion
      BM25 Lexical Search
      Semantic Cache
    Generators
      Diagram Generator
      AI Image Generator
    Security
      OWASP Scanner
      Sandbox Execution"""
    elif "state" in dtype or "state" in p_clean.lower():
        code = """stateDiagram-v2
    [*] --> Idle
    Idle --> Processing: User Query
    Processing --> HybridRetrieval: Vector Search
    HybridRetrieval --> Streaming: LLM Tokens
    Streaming --> Idle: Done"""
    elif "er" in dtype or "erd" in dtype or "entity" in p_clean.lower():
        code = """erDiagram
    CONVERSATION ||--o{ MESSAGE : contains
    DOCUMENT ||--o{ CHUNK : has
    CACHE ||--|| QUERY : caches"""
    else:
        code = f"""graph TD
    A[User Request: {p_clean[:30]}] --> B[Input Validation]
    B --> C{{Cache Hit?}}
    C -- Yes --> D[Return Instant Cache Result]
    C -- No --> E[RAG Retrieval & Generation]
    E --> F[Render Answer & Interactive Assets]"""

    return {
        "status": "success",
        "diagramType": dtype,
        "mermaidCode": code
    }
