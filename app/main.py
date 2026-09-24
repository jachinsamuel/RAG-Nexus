import os
import uuid
import json
import asyncio
import httpx
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional

from app.database import Database
from app.filesystem import workspace_manager
from app.models import (
    UrlIngestRequest,
    Message,
    ImageGenRequest,
    DiagramGenRequest,
    ChatRequest,
    ConversationCreate,
    ProfileMemoryCreate,
    ProfileMemoryUpdate,
    SkillCreate,
    SkillUpdate,
    WorkspaceConfig,
    FileWriteRequest,
    ConsolidateRequest,
    SandboxRequest,
    CodeRunRequest,
    LcsDiffRequest,
    LcsDiffApplyRequest,
    VideoGenRequest
)
from app.image_engine import (
    is_image_request,
    extract_image_prompt,
    build_image_url,
    download_and_cache_image
)
from app.video_engine import (
    is_video_request,
    extract_video_prompt,
    generate_and_cache_video
)
from app.diagram_engine import generate_diagram_code
from app.url_ingestor import ingest_url_to_knowledge, is_youtube_url
from app.research_engine import run_deep_research_stream
from app.evaluation_engine import evaluate_rag_faithfulness
from app.rag_engine import (
    extract_text_from_file, 
    chunk_text, 
    get_embedding, 
    get_embeddings_batch,
    search_chunks, 
    search_hybrid,
    search_generic,
    generate_response_stream,
    extract_memory_and_skills_from_dialogue,
    search_ddg,
    rewrite_query_for_retrieval,
    rerank_chunks_lexical,
    generate_hyde_text,
    enrich_chunks_with_siblings,
    sanitize_ollama_url
)

def get_error_detail(ex: Exception) -> str:
    if isinstance(ex, httpx.HTTPStatusError):
        body = ""
        try:
            if hasattr(ex.response, "_content") and ex.response._content:
                body = ex.response._content.decode("utf-8", errors="ignore")
            elif not ex.response.is_closed:
                try:
                    body = ex.response.read().decode("utf-8", errors="ignore")
                except Exception:
                    pass
        except Exception:
            pass
            
        if body:
            try:
                data = json.loads(body)
                if "error" in data:
                    err_info = data["error"]
                    if isinstance(err_info, dict) and "message" in err_info:
                        return f"HTTP {ex.response.status_code}: {err_info['message']}"
                    elif isinstance(err_info, str):
                        if "not found" in err_info.lower() and "model" in err_info.lower():
                            return f"HTTP 404: {err_info}. Please pull the model in terminal (e.g. 'ollama pull qwen2.5-coder:3b') or select an installed model in Settings."
                        return f"HTTP {ex.response.status_code}: {err_info}"
            except Exception:
                pass
            if body.strip():
                return f"HTTP {ex.response.status_code}: {body.strip()}"

        if ex.response.status_code == 410:
            return "HTTP 410 (Gone): The requested model or API endpoint is no longer available or has been decommissioned by the provider. Please update your model in Settings or switch provider."
        elif ex.response.status_code == 404:
            return "HTTP 404 (Not Found): The model or endpoint URL was not found. Please verify your Base URL and model name in Settings."
        elif ex.response.status_code == 401:
            return "HTTP 401 (Unauthorized): Invalid or missing API key. Please check your API key in Settings."
        elif ex.response.status_code == 429:
            return "HTTP 429 (Rate Limited): Provider rate limit exceeded or quota exhausted. Please try again in a few moments."
        return f"HTTP Status {ex.response.status_code}"
    elif isinstance(ex, httpx.RequestError):
        detail = str(ex)
        if "11434" in detail or (hasattr(ex, "request") and "11434" in str(getattr(ex.request, "url", ""))):
            return "Ollama server is not running or unreachable at http://localhost:11434. Please open a terminal and run 'ollama serve' (or launch Ollama), then verify your model is pulled."
        if not detail or detail.strip() == "":
            detail = "Connection timed out. Make sure the API provider endpoint is active, your internet is connected, and any local/custom models are fully loaded and running."
        return f"Network/API Connection Error: {detail}"
    
    msg = str(ex)
    if "11434" in msg and ("refused" in msg.lower() or "connect" in msg.lower()):
        return "Ollama server is not running or unreachable at http://localhost:11434. Please open a terminal and run 'ollama serve', then verify your model is pulled."
    if "model" in msg.lower() and "not found" in msg.lower() and "ollama" in msg.lower():
        return f"{msg}. Please run 'ollama pull <model_name>' or select an installed model in Settings."
    if not msg or msg.strip() == "":
        return f"Unexpected error: {type(ex).__name__}"
    return msg

app = FastAPI(title="Nexus Cognitive Engine")
db = Database()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

static_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

# --- Background Extraction Task ---
async def background_extraction_job(
    dialogue_turn: List[Dict[str, str]],
    provider: str,
    api_key: Optional[str],
    ollama_url: Optional[str],
    embed_model: Optional[str],
    gen_model: Optional[str]
):
    try:
        facts, skills = await extract_memory_and_skills_from_dialogue(
            dialogue_turn=dialogue_turn,
            provider=provider,
            api_key=api_key,
            ollama_url=ollama_url,
            model=gen_model
        )
        
        # Save extracted facts
        for fact in facts:
            existing = db.get_all_profile_memories()
            if any(fact.lower().strip() == e["fact"].lower().strip() for e in existing):
                continue
                
            embedding = await get_embedding(
                text=fact,
                provider=provider,
                api_key=api_key,
                ollama_url=ollama_url,
                model=embed_model
            )
            db.add_profile_memory(
                memory_id=str(uuid.uuid4()),
                fact=fact,
                created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                embedding=embedding
            )
            print(f"Extracted fact: {fact}")
            
        # Save extracted skills
        for skill in skills:
            existing = db.get_all_skills()
            if any(skill["name"].lower().strip() == s["name"].lower().strip() for s in existing):
                continue
                
            skill_text = f"{skill['name']}: {skill['description']}\n{skill['content']}"
            embedding = await get_embedding(
                text=skill_text,
                provider=provider,
                api_key=api_key,
                ollama_url=ollama_url,
                model=embed_model
            )
            db.add_skill(
                skill_id=str(uuid.uuid4()),
                name=skill["name"],
                description=skill["description"],
                content=skill["content"],
                created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                embedding=embedding
            )
            print(f"Extracted skill: {skill['name']}")
    except Exception as e:
        print(f"Background reflection job error: {e}")

# --- Memory Consolidation Background Job ---
async def consolidate_profile_memories(
    provider: str,
    api_key: Optional[str],
    ollama_url: Optional[str],
    embed_model: Optional[str],
    gen_model: Optional[str]
):
    memories = db.get_all_profile_memories()
    if len(memories) < 2:
        return {"status": "success", "message": "Not enough facts to consolidate."}
        
    import math
    merged_ids = set()
    consolidated_count = 0
    
    for idx1, m1 in enumerate(memories):
        if m1["id"] in merged_ids:
            continue
            
        similar_group = [m1]
        emb1 = m1["embedding"]
        len1 = len(emb1)
        
        for idx2, m2 in enumerate(memories[idx1 + 1:]):
            if m2["id"] in merged_ids:
                continue
            emb2 = m2["embedding"]
            if len(emb2) != len1:
                continue
                
            dot = sum(a * b for a, b in zip(emb1, emb2))
            norm_a = math.sqrt(sum(a * a for a in emb1))
            norm_b = math.sqrt(sum(b * b for b in emb2))
            if norm_a == 0 or norm_b == 0:
                continue
            sim = dot / (norm_a * norm_b)
            
            if sim >= 0.82:
                similar_group.append(m2)
                
        if len(similar_group) > 1:
            facts_list = [m["fact"] for m in similar_group]
            prompt = (
                f"Combine the following duplicate or overlapping facts about the user into a single concise, comprehensive fact:\n"
                f"{chr(10).join('- ' + f for f in facts_list)}\n\n"
                f"Output ONLY the combined fact text, nothing else."
            )
            
            try:
                from app.rag_engine import call_llm_single
                merged_fact = await call_llm_single(
                    prompt=prompt,
                    provider=provider,
                    api_key=api_key,
                    ollama_url=ollama_url,
                    model=gen_model
                )
                merged_fact = merged_fact.strip()
                
                if merged_fact:
                    # Remove old facts
                    for m in similar_group:
                        db.delete_profile_memory(m["id"])
                        merged_ids.add(m["id"])
                        
                    # Insert new consolidated fact
                    new_emb = await get_embedding(
                        text=merged_fact,
                        provider=provider,
                        api_key=api_key,
                        ollama_url=ollama_url,
                        model=embed_model
                    )
                    db.add_profile_memory(
                        memory_id=str(uuid.uuid4()),
                        fact=merged_fact,
                        created_at=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        embedding=new_emb
                    )
                    consolidated_count += 1
            except Exception as e:
                print(f"Failed to consolidate memory group: {e}")
                
    print(f"Memory consolidation completed. Consolidated {consolidated_count} groups.")

@app.post("/api/memory/consolidate")
async def consolidate_memories_endpoint(request: ConsolidateRequest, background_tasks: BackgroundTasks):
    background_tasks.add_task(
        consolidate_profile_memories,
        provider=request.provider,
        api_key=request.apiKey,
        ollama_url=request.ollamaUrl,
        embed_model=request.embedModel,
        gen_model=request.genModel
    )
    return {"status": "success", "message": "Memory consolidation job started in the background."}

# --- REST Endpoints: Ollama Auto-Discovery ---
@app.get("/api/ollama/discover")
async def discover_ollama_models(url: str = "http://localhost:11434"):
    import httpx
    try:
        clean_url = sanitize_ollama_url(url)
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{clean_url}/api/tags", timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                models = [model["name"] for model in data.get("models", [])]
                return {"status": "success", "models": models}
            else:
                return {"status": "error", "message": f"Ollama returned status code {response.status_code}"}
    except Exception as e:
        err_str = str(e)
        if "11434" in err_str or "refused" in err_str.lower():
            return {"status": "error", "message": "Ollama server is not running. Please run 'ollama serve' in your terminal."}
        return {"status": "error", "message": f"Could not connect to Ollama: {err_str}"}

# --- REST Endpoints: Custom / OpenAI-Compatible Model Discovery ---
@app.get("/api/custom/discover")
async def discover_custom_models(url: str = "https://integrate.api.nvidia.com/v1", api_key: Optional[str] = None):
    import httpx
    try:
        clean_url = url.rstrip("/")
        headers = {}
        if api_key and api_key.strip():
            headers["Authorization"] = f"Bearer {api_key.strip()}"
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{clean_url}/models", headers=headers, timeout=8.0)
            if response.status_code == 200:
                data = response.json()
                raw_models = data.get("data", []) or data.get("models", [])
                models = []
                for item in raw_models:
                    if isinstance(item, dict) and "id" in item:
                        models.append(item["id"])
                    elif isinstance(item, str):
                        models.append(item)
                return {"status": "success", "models": sorted(models)}
            else:
                return {"status": "error", "message": f"Custom provider returned status code {response.status_code}"}
    except Exception as e:
        return {"status": "error", "message": f"Could not connect to custom provider: {str(e)}"}

# --- REST Endpoints: Documents ---
@app.get("/api/documents")
async def get_documents():
    try:
        return db.get_all_documents()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/documents/{doc_id}")
async def delete_document(doc_id: str):
    try:
        db.delete_document(doc_id)
        return {"status": "success", "message": f"Document {doc_id} deleted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/documents/{doc_id}/chunks")
async def get_document_chunks(doc_id: str):
    try:
        chunks = db.get_document_chunks(doc_id)
        return {"status": "success", "chunks": chunks}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/documents/upload")
async def upload_document(
    file: UploadFile = File(...),
    chunkSize: int = Form(500),
    chunkOverlap: int = Form(100),
    provider: str = Form(...),
    apiKey: Optional[str] = Form(None),
    ollamaUrl: Optional[str] = Form(None),
    embedModel: Optional[str] = Form(None)
):
    try:
        content = await file.read()
        text = extract_text_from_file(content, file.filename)
        
        if not text.strip():
            raise HTTPException(status_code=400, detail="Document contains no readable text.")
            
        text_chunks = chunk_text(text, chunkSize, chunkOverlap)
        if not text_chunks:
            raise HTTPException(status_code=400, detail="Could not partition document into chunks.")
            
        doc_id = str(uuid.uuid4())
        
        embeddings = await get_embeddings_batch(
            texts=text_chunks,
            provider=provider,
            api_key=apiKey,
            ollama_url=ollamaUrl,
            model=embedModel
        )
        
        chunks_data = []
        for idx, (chunk, embedding) in enumerate(zip(text_chunks, embeddings)):
            chunks_data.append({
                "id": str(uuid.uuid4()),
                "idx": idx,
                "text": chunk,
                "embedding": embedding
            })
            
        db.add_document(
            doc_id=doc_id,
            name=file.filename,
            size=len(content),
            upload_date=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            chunks=chunks_data
        )
        
        return {
            "status": "success", 
            "doc_id": doc_id, 
            "filename": file.filename, 
            "chunks": len(text_chunks)
        }
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/documents/url")
async def ingest_url_endpoint(req: UrlIngestRequest):
    """Direct Web URL and YouTube video transcript ingestion into vector database"""
    if not req.url or not req.url.strip():
        raise HTTPException(status_code=400, detail="Target URL is required.")
    try:
        result = await ingest_url_to_knowledge(
            url=req.url.strip(),
            db=db,
            provider=req.provider or "gemini",
            api_key=req.apiKey,
            ollama_url=req.ollamaUrl,
            embed_model=req.embedModel
        )
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# --- REST Endpoints: Conversations ---
@app.get("/api/conversations")
async def get_conversations():
    try:
        return db.get_all_conversations()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/conversations")
async def create_conversation(req: ConversationCreate):
    try:
        conv_id = str(uuid.uuid4())
        created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        db.add_conversation(conv_id, req.title, created_at)
        return {"id": conv_id, "title": req.title, "created_at": created_at}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/conversations/{conv_id}")
async def delete_conversation(conv_id: str):
    try:
        db.delete_conversation(conv_id)
        return {"status": "success", "message": f"Conversation {conv_id} deleted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/conversations/{conv_id}/messages")
async def get_conversation_messages(conv_id: str):
    try:
        return db.get_messages_for_conversation(conv_id)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- REST Endpoints: Profile & Memory ---
@app.get("/api/profile-memories")
async def get_profile_memories():
    try:
        # Strip out embedding lists before returning to frontend to save bandwidth
        mems = db.get_all_profile_memories()
        return [{"id": m["id"], "fact": m["fact"], "created_at": m["created_at"]} for m in mems]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/profile-memories")
async def create_profile_memory(req: ProfileMemoryCreate):
    try:
        embedding = await get_embedding(
            text=req.fact,
            provider=req.provider,
            api_key=req.apiKey,
            ollama_url=req.ollamaUrl,
            model=req.embedModel
        )
        mem_id = str(uuid.uuid4())
        created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        db.add_profile_memory(mem_id, req.fact, created_at, embedding)
        return {"id": mem_id, "fact": req.fact, "created_at": created_at}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/profile-memories/{mem_id}")
async def delete_profile_memory(mem_id: str):
    try:
        db.delete_profile_memory(mem_id)
        return {"status": "success", "message": f"Memory {mem_id} deleted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/profile-memories/{mem_id}")
async def update_profile_memory(mem_id: str, req: ProfileMemoryUpdate):
    try:
        embedding = await get_embedding(
            text=req.fact,
            provider=req.provider,
            api_key=req.apiKey,
            ollama_url=req.ollamaUrl,
            model=req.embedModel
        )
        db.update_profile_memory(mem_id, req.fact, embedding)
        return {"status": "success", "message": f"Memory {mem_id} updated."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- REST Endpoints: Skills Library ---
@app.get("/api/skills")
async def get_skills():
    try:
        skills = db.get_all_skills()
        return [{
            "id": s["id"], 
            "name": s["name"], 
            "description": s["description"], 
            "content": s["content"], 
            "created_at": s["created_at"]
        } for s in skills]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/skills")
async def create_skill(req: SkillCreate):
    try:
        skill_text = f"{req.name}: {req.description}\n{req.content}"
        embedding = await get_embedding(
            text=skill_text,
            provider=req.provider,
            api_key=req.apiKey,
            ollama_url=req.ollamaUrl,
            model=req.embedModel
        )
        skill_id = str(uuid.uuid4())
        created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        db.add_skill(skill_id, req.name, req.description, req.content, created_at, embedding)
        return {
            "id": skill_id, 
            "name": req.name, 
            "description": req.description, 
            "content": req.content, 
            "created_at": created_at
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/skills/{skill_id}")
async def delete_skill(skill_id: str):
    try:
        db.delete_skill(skill_id)
        return {"status": "success", "message": f"Skill {skill_id} deleted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/skills/{skill_id}")
async def update_skill_endpoint(skill_id: str, req: SkillUpdate):
    try:
        skill_text = f"{req.name}: {req.description}\n{req.content}"
        embedding = await get_embedding(
            text=skill_text,
            provider=req.provider,
            api_key=req.apiKey,
            ollama_url=req.ollamaUrl,
            model=req.embedModel
        )
        db.update_skill(skill_id, req.name, req.description, req.content, embedding)
        return {"status": "success", "message": f"Skill {skill_id} updated."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def background_workspace_sync(
    workspace_path: str,
    provider: Optional[str],
    api_key: Optional[str],
    ollama_url: Optional[str],
    embed_model: Optional[str]
):
    try:
        print(f"Starting background RAG sync for workspace: {workspace_path}")
        files = workspace_manager.list_files()
        
        # Only ingest typical documentation files to prevent spam and rate limits
        text_exts = {".txt", ".md"}
        
        for file_info in files:
            rel_path = file_info["path"]
            ext = os.path.splitext(rel_path)[1].lower()
            if ext not in text_exts:
                continue
                
            abs_path = os.path.join(workspace_path, rel_path)
            # Check if already in knowledge catalog
            existing_docs = db.get_all_documents()
            already_ingested = False
            for d in existing_docs:
                if d["name"] == rel_path:
                    already_ingested = True
                    break
                    
            if not already_ingested:
                try:
                    content = workspace_manager.read_file(rel_path)
                    if not content.strip():
                        continue
                        
                    doc_id = str(uuid.uuid4())
                    size = os.path.getsize(abs_path)
                    upload_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    
                    text_chunks = chunk_text(content, chunk_size=600, chunk_overlap=100)
                    
                    chunks_to_insert = []
                    for idx, tc in enumerate(text_chunks):
                        emb = await get_embedding(
                            text=tc,
                            provider=provider or "google",
                            api_key=api_key,
                            ollama_url=ollama_url,
                            model=embed_model
                        )
                        chunks_to_insert.append({
                            "id": str(uuid.uuid4()),
                            "doc_id": doc_id,
                            "idx": idx,
                            "text": tc,
                            "embedding": emb
                        })
                    
                    db.add_document(doc_id, rel_path, size, upload_date, chunks_to_insert)
                    print(f"Sync: Successfully auto-ingested workspace file '{rel_path}'")
                except Exception as fe:
                    print(f"Error auto-ingesting '{rel_path}': {fe}")
        print("Background RAG sync completed.")
    except Exception as e:
        print(f"Error in background workspace RAG sync: {e}")

# --- REST Endpoints: Workspace Management ---
@app.post("/api/workspace/select-folder")
async def select_folder():
    import tkinter as tk
    from tkinter import filedialog
    def ask_directory():
        root = tk.Tk()
        root.withdraw()
        root.attributes('-topmost', True)
        path = filedialog.askdirectory()
        root.destroy()
        return path
    
    path = await asyncio.to_thread(ask_directory)
    return {"status": "success", "path": path}

@app.post("/api/workspace/config")
async def config_workspace(req: WorkspaceConfig, background_tasks: BackgroundTasks):
    # If path is cleared/empty, purge all previously auto-ingested workspace documents from database
    if not req.path.strip():
        old_workspace = workspace_manager.workspace_root or req.old_path
        if old_workspace:
            try:
                # Set temporary workspace root to inspect and retrieve file listing
                workspace_manager.set_workspace(old_workspace)
                files_to_remove = [f["path"] for f in workspace_manager.list_files()]
                existing_docs = db.get_all_documents()
                removed_count = 0
                for rel_path in files_to_remove:
                    for d in existing_docs:
                        if d["name"] == rel_path:
                            db.delete_document(d["id"])
                            removed_count += 1
                if removed_count > 0:
                    print(f"Sync: Cleared {removed_count} auto-ingested workspace file(s) from database.")
            except Exception as ex:
                print(f"Warning: Failed to purge workspace documents from DB: {ex}")
        
        res = workspace_manager.set_workspace("")
        return res

    res = workspace_manager.set_workspace(req.path)
    if res["status"] == "error":
        raise HTTPException(status_code=400, detail=res["message"])
    
    # Run workspace background indexing sync
    if req.path:
        background_tasks.add_task(
            background_workspace_sync,
            workspace_path=res["workspace"],
            provider=req.provider,
            api_key=req.apiKey,
            ollama_url=req.ollamaUrl,
            embed_model=req.embedModel
        )
    return res

@app.get("/api/workspace/files")
async def get_workspace_files():
    try:
        return {"status": "success", "files": workspace_manager.list_files()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/workspace/file")
async def get_workspace_file(path: str):
    try:
        content = workspace_manager.read_file(path)
        return {"status": "success", "content": content}
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.post("/api/workspace/file")
async def save_workspace_file(req: FileWriteRequest):
    try:
        workspace_manager.write_file(req.path, req.content)
        return {"status": "success", "message": f"File '{req.path}' saved."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/sandbox/run")
async def run_sandbox(request: SandboxRequest):
    import subprocess
    import tempfile
    import sys
    import time
    import os
    
    lang = request.language.lower()
    if lang not in ["python", "py", "javascript", "js"]:
        return {
            "status": "error",
            "detail": f"Language '{lang}' is not supported in the execution sandbox."
        }
    
    with tempfile.NamedTemporaryFile(delete=False, suffix=".py" if lang in ["python", "py"] else ".js") as tmp:
        # Normalize code to prevent carriage return issues in shell interpreters
        clean_code = request.code.replace('\r\n', '\n')
        tmp.write(clean_code.encode('utf-8'))
        tmp_name = tmp.name
        
    try:
        start_time = time.time()
        if lang in ["python", "py"]:
            python_exe = sys.executable or "python"
            proc = subprocess.run(
                [python_exe, tmp_name],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=5.0
            )
        else: # javascript
            proc = subprocess.run(
                ["node", tmp_name],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=5.0
            )
            
        elapsed = time.time() - start_time
        return {
            "status": "success",
            "exit_code": proc.returncode,
            "stdout": proc.stdout,
            "stderr": proc.stderr,
            "elapsed_ms": round(elapsed * 1000, 1)
        }
    except subprocess.TimeoutExpired:
        return {
            "status": "timeout",
            "detail": "Execution timed out (limit: 5 seconds)."
        }
    except Exception as e:
        return {
            "status": "error",
            "detail": str(e)
        }
    finally:
        try:
            os.remove(tmp_name)
        except Exception:
            pass

# --- REST Endpoints: Chat & Memory Retrieval ---
@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest, background_tasks: BackgroundTasks):
    try:
        query_start = datetime.now()
        if not request.messages:
            raise HTTPException(status_code=400, detail="No conversation messages found.")
        query = request.messages[-1].content
        # --- Smart In-Chat Image Generation Interceptor ---
        import urllib.parse
        clean_query_lower = query.lower().strip()
        image_triggers = [
            "generate an image of", "generate image of", "generate image:", 
            "create an image of", "create image of", "draw an image of", 
            "draw a picture of", "draw image of", "paint an image of", 
            "generate a photo of", "create a photo of", "generate a picture of",
            "make an image of", "make a photo of", "make a picture of"
        ]
        
        is_image_request = any(clean_query_lower.startswith(trig) or f" {trig} " in f" {clean_query_lower} " for trig in image_triggers)
        if is_image_request:
            prompt_desc = query.strip()
            for trig in image_triggers:
                if trig in clean_query_lower:
                    idx = clean_query_lower.find(trig) + len(trig)
                    prompt_desc = query[idx:].strip(" :.-")
                    break
            
            if not prompt_desc:
                prompt_desc = query.strip()
                
            encoded_prompt = urllib.parse.quote(prompt_desc)
            image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=1024&nologo=true"
            
            async def image_event_generator():
                yield f"event: conv_id\ndata: {json.dumps({'conversationId': request.conversationId})}\n\n"
                response_text = f"![{prompt_desc}]({image_url})\n\n"
                
                # Stream out clean image card directly
                yield f"event: text\ndata: {json.dumps(response_text)}\n\n"
                await asyncio.sleep(0.05)
                    
                # Save assistant response to DB
                try:
                    db.add_message(
                        msg_id=str(uuid.uuid4()),
                        conv_id=request.conversationId,
                        role="assistant",
                        content=response_text,
                        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                    )
                except Exception as dbe:
                    print(f"Warning: Failed to save image reply to db: {dbe}")
                    
                yield "event: done\ndata: {}\n\n"
                
            return StreamingResponse(image_event_generator(), media_type="text/event-stream")

        # --- Deep Research Mode Interceptor ---
        if request.deepResearch:
            async def deep_research_wrapper():
                full_response = ""
                async for event_str in run_deep_research_stream(
                    topic=query,
                    provider=request.provider,
                    api_key=request.apiKey,
                    ollama_url=request.ollamaUrl,
                    gen_model=request.genModel
                ):
                    if event_str.startswith("event: text\ndata: "):
                        try:
                            payload = json.loads(event_str.replace("event: text\ndata: ", "").strip())
                            full_response += payload.get("chunk", "")
                        except Exception:
                            pass
                    yield event_str
                    
                if conversation_id and full_response.strip():
                    try:
                        db.add_message(
                            conversation_id=conversation_id,
                            role="assistant",
                            content=full_response,
                            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                        )
                    except Exception as dbe:
                        print(f"Warning: Failed to save deep research response to db: {dbe}")
                        
                yield "event: done\ndata: {}\n\n"
                
            return StreamingResponse(deep_research_wrapper(), media_type="text/event-stream")

        
        # Optimize search query using history (Conversational Query Reformulation)
        search_query = query
        try:
            history_messages = [{"role": msg.role, "content": msg.content} for msg in request.messages]
            search_query = await rewrite_query_for_retrieval(
                messages=history_messages,
                current_query=query,
                provider=request.provider,
                api_key=request.apiKey,
                ollama_url=request.ollamaUrl,
                model=request.chatModel
            )
            if search_query != query:
                print(f"Info: Optimized search query: '{query}' -> '{search_query}'")
        except Exception as e:
            print(f"Warning: Failed to optimize query for retrieval: {e}")
            
        # 1. Embed user query
        query_embedding = None
        try:
            query_embedding = await get_embedding(
                text=search_query,
                provider=request.provider,
                api_key=request.apiKey,
                ollama_url=request.ollamaUrl,
                model=request.embedModel
            )
        except Exception as e:
            print(f"Warning: Failed to compute user query embedding: {e}")
            
        # Optional: HyDE (Hypothetical Document Embeddings) Query Expansion
        if request.hyde and query_embedding is not None:
            try:
                hyde_text = await generate_hyde_text(
                    query=search_query,
                    provider=request.provider,
                    api_key=request.apiKey,
                    ollama_url=request.ollamaUrl,
                    model=request.chatModel
                )
                print(f"Info: HyDE hypothetical document generated: '{hyde_text}'")
                query_embedding = await get_embedding(
                    text=hyde_text,
                    provider=request.provider,
                    api_key=request.apiKey,
                    ollama_url=request.ollamaUrl,
                    model=request.embedModel
                )
            except Exception as he:
                print(f"Warning: HyDE query expansion failed: {he}")
        
        # 2. Retrieve matched document chunks (Hybrid search)
        all_chunks = db.get_all_chunks()
        context_chunks = []
        chunk_dim_mismatches = 0
        
        # Retrieve a larger candidate pool (e.g. 3x of topK, capped at 25) for reranking
        candidate_k = min(25, max(15, request.topK * 3))
        context_chunks, chunk_dim_mismatches = await search_hybrid(
            query_text=search_query,
            query_embedding=query_embedding,
            chunks=all_chunks,
            top_k=candidate_k,
            threshold=request.threshold,
            retrieval_strategy=request.retrievalStrategy or "hybrid"
        )
        
        # Apply term density reranking to get the final topK most relevant chunks
        context_chunks = rerank_chunks_lexical(query=search_query, chunks=context_chunks, top_n=request.topK)
        
        # Enrich retrieved chunks with sliding context window sibling chunks
        context_chunks = enrich_chunks_with_siblings(retrieved_chunks=context_chunks, all_chunks=all_chunks)
        
        # 3. Retrieve matched profile memories
        all_memories = db.get_all_profile_memories()
        matched_memories = search_generic(
            query_embedding=query_embedding,
            items=all_memories,
            top_k=5,
            threshold=0.3,
            query_text=query
        )
        
        # 4. Retrieve matched learned skills
        all_skills = db.get_all_skills()
        matched_skills = search_generic(
            query_embedding=query_embedding,
            items=all_skills,
            top_k=3,
            threshold=0.3,
            query_text=query
        )
        
        # 5. Retrieve matched past dialogue topics (Episodic Recall)
        matched_messages = []
        if request.conversationId:
            all_past_msgs = db.get_all_messages_with_embeddings()
            # Filter out current session messages to avoid feeding active dialogue back into prompt
            past_msg_pool = [m for m in all_past_msgs if m["conversation_id"] != request.conversationId]
            matched_messages = search_generic(
                query_embedding=query_embedding,
                items=past_msg_pool,
                top_k=3,
                threshold=0.4,
                query_text=query
            )
            
            # Save user query to DB log (works even if query_embedding is None)
            db.add_message(
                msg_id=str(uuid.uuid4()),
                conv_id=request.conversationId,
                role="user",
                content=query,
                timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                embedding=query_embedding
            )

        # Direct /image shortcut command handling
        if query.strip().startswith("/image"):
            img_prompt = extract_image_prompt(query)
            async def direct_image_stream():
                yield f"event: telemetry\ndata: {json.dumps({'latency_ms': 50, 'cache_hit': False})}\n\n"
                yield f"event: sources\ndata: {json.dumps([])}\n\n"
                img_res = await download_and_cache_image(
                    prompt=img_prompt,
                    static_dir=static_dir,
                    width=1024,
                    height=1024,
                    seed=42,
                    provider="auto",
                    api_key=request.apiKey,
                    aspect_ratio="1:1"
                )
                if img_res.get("status") == "success":
                    img_block = f"![{img_prompt}]({img_res.get('imageUrl')})\n\n*Generated with {img_res.get('provider', 'AI Diffusion')}*"
                else:
                    img_block = f"Unable to generate image: {img_res.get('message', 'Generation error')}"
                yield f"event: text\ndata: {json.dumps(img_block)}\n\n"
                yield "data: [DONE]\n\n"
            return StreamingResponse(direct_image_stream(), media_type="text/event-stream")

        # Direct /video shortcut command handling
        if query.strip().startswith("/video"):
            video_prompt = extract_video_prompt(query)
            async def direct_video_stream():
                yield f"event: telemetry\ndata: {json.dumps({'latency_ms': 50, 'cache_hit': False})}\n\n"
                yield f"event: sources\ndata: {json.dumps([])}\n\n"
                video_res = await generate_and_cache_video(
                    prompt=video_prompt,
                    static_dir=static_dir,
                    duration=3,
                    fps=24,
                    aspect_ratio="16:9",
                    motion_style="cinematic_zoom",
                    title=video_prompt.capitalize(),
                    provider="auto",
                    api_key=request.apiKey
                )
                if video_res.get("status") == "success":
                    video_block = (
                        "```video\n" + 
                        json.dumps({
                            "title": video_res.get("title", "AI Generated Video"),
                            "prompt": video_prompt,
                            "url": video_res.get("videoUrl"),
                            "provider": video_res.get("provider", "LTX-Video Diffusion"),
                            "duration": video_res.get("duration", 3),
                            "fps": video_res.get("fps", 24)
                        }, indent=2) + 
                        "\n```\n"
                    )
                else:
                    video_block = f"Unable to generate video: {video_res.get('message', 'Generation error')}"
                
                yield f"event: text\ndata: {json.dumps(video_block)}\n\n"
                yield "data: [DONE]\n\n"
            return StreamingResponse(direct_video_stream(), media_type="text/event-stream")

        # Check if query is in semantic cache
        cached_response = None
        if query_embedding is not None:
            try:
                cached_response = db.get_from_cache(
                    query_embedding=query_embedding,
                    chat_model=request.chatModel,
                    threshold=0.96
                )
            except Exception as ce:
                print(f"Warning: Failed to query semantic cache: {ce}")

        if cached_response:
            # Log the assistant's cached reply to the database
            if request.conversationId:
                try:
                    reply_embedding = await get_embedding(
                        text=cached_response,
                        provider=request.provider,
                        api_key=request.apiKey,
                        ollama_url=request.ollamaUrl,
                        model=request.embedModel
                    )
                except Exception:
                    reply_embedding = None
                try:
                    db.add_message(
                        msg_id=str(uuid.uuid4()),
                        conv_id=request.conversationId,
                        role="assistant",
                        content=cached_response,
                        timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        embedding=reply_embedding
                    )
                    # Trigger background preference extraction & self-reflection
                    background_tasks.add_task(
                        background_extraction_job,
                        dialogue_turn=[
                            {"role": "user", "content": query},
                            {"role": "assistant", "content": cached_response}
                        ],
                        provider=request.provider,
                        api_key=request.apiKey,
                        ollama_url=request.ollamaUrl,
                        model=request.chatModel
                    )
                except Exception as db_err:
                    print(f"Warning: Failed to save cached message to database: {db_err}")

            # Stream cached response back via SSE
            async def cache_stream_generator():
                latency_ms = int((datetime.now() - query_start).total_seconds() * 1000)
                yield f"event: telemetry\ndata: {json.dumps({'latency_ms': latency_ms, 'cache_hit': True})}\n\n"
                yield f"event: sources\ndata: {json.dumps([])}\n\n"
                
                if request.agentMode:
                    yield f"event: agent_step\ndata: {json.dumps({'agent': 'Researcher', 'message': 'Checking semantic response cache...'})}\n\n"
                    await asyncio.sleep(0.3)
                    yield f"event: agent_step\ndata: {json.dumps({'agent': 'Researcher', 'message': 'Cache hit! Serving response immediately.'})}\n\n"
                    await asyncio.sleep(0.2)

                words = cached_response.split(" ")
                for i in range(0, len(words), 5):
                    chunk = " ".join(words[i:i+5]) + " "
                    yield f"event: text\ndata: {json.dumps(chunk)}\n\n"
                    await asyncio.sleep(0.01)
                yield "data: [DONE]\n\n"

            return StreamingResponse(cache_stream_generator(), media_type="text/event-stream")

        # Retrieve web search results if enabled
        web_search_text = ""
        web_sources = []
        if request.webSearch:
            try:
                search_results = await search_ddg(query)
                if search_results:
                    web_search_text = "\n\n".join([
                        f"--- Web Search Result: {r['title']} (URL: {r['url']}) ---\n{r['snippet']}"
                        for r in search_results
                    ])
                    web_sources = [
                        {
                            "doc_name": f"Web: {r['title']}",
                            "idx": idx + 1,
                            "text": f"URL: {r['url']}\n\n{r['snippet']}",
                            "similarity": 1.0
                        }
                        for idx, r in enumerate(search_results)
                    ]
            except Exception as se:
                print(f"Web search failed: {se}")

        # 6. Stream generator utilizing SSE
        async def event_generator():
            latency_ms = int((datetime.now() - query_start).total_seconds() * 1000)
            yield f"event: telemetry\ndata: {json.dumps({'latency_ms': latency_ms, 'cache_hit': False})}\n\n"
            # Warn frontend if embedding dimension mismatches were detected
            if chunk_dim_mismatches > 0:
                warning_msg = (
                    f"{chunk_dim_mismatches} document chunk(s) were skipped because they were "
                    f"indexed with a different embedding model. "
                    f"Please re-upload or re-index your documents using the current embedding model."
                )
                yield f"event: warning\ndata: {json.dumps({'message': warning_msg})}\n\n"

            # Send citations metadata to frontend
            sources = [
                {
                    "doc_name": chunk["doc_name"],
                    "idx": chunk["idx"],
                    "text": chunk["text"],
                    "similarity": chunk["similarity"]
                }
                for chunk in context_chunks
            ]
            if web_sources:
                sources.extend(web_sources)
            yield f"event: sources\ndata: {json.dumps(sources)}\n\n"
            
            assistant_reply = ""
            try:
                # 1. Parse query for referenced files (/file path or /files path)
                import re
                referenced_files = re.findall(r'/(?:file|files)\s+([^\s,;]+)', query)
                injected_file_context = ""
                for ref_file in referenced_files:
                    try:
                        clean_ref = ref_file.strip().strip("'\"")
                        file_content = workspace_manager.read_file(clean_ref)
                        injected_file_context += (
                            f"\n\n[FILE ATTACHMENT: {clean_ref}]\n"
                            f"Content of file '{clean_ref}':\n"
                            f"```\n"
                            f"{file_content}\n"
                            f"```\n"
                        )
                    except Exception as e:
                        print(f"Warning: Failed to read referenced file '{ref_file}': {e}")

                formatted_msgs = [{"role": m.role, "content": m.content} for m in request.messages]
                if injected_file_context and formatted_msgs:
                    formatted_msgs[-1]["content"] += injected_file_context
                
                # Combine system prompt with web search context
                sys_prompt = request.systemPrompt or ""
                if web_search_text:
                    sys_prompt += f"\n\nRetrieved Web Search Context:\n{web_search_text}"
                
                workspace_files = []
                total_size = 0
                files_str = ""
                auto_attached_contents = ""
                
                if workspace_manager.workspace_root:
                    try:
                        workspace_files = workspace_manager.list_files()
                        total_size = sum(f.get("size", 0) for f in workspace_files)
                    except Exception:
                        workspace_files = []
                        total_size = 0
                    
                    # If total size of codebase is small (<120 KB), read and attach all files automatically!
                    if 0 < total_size < 120 * 1024:
                        for f in workspace_files:
                            try:
                                content = workspace_manager.read_file(f["path"])
                                auto_attached_contents += (
                                    f"\n\n[WORKSPACE FILE: {f['path']}]\n"
                                    f"```\n"
                                    f"{content}\n"
                                    f"```\n"
                                )
                            except Exception:
                                pass
                    
                    files_str = "\n".join([f"- {f['path']} ({round(f['size']/1024, 1)} KB)" for f in workspace_files])
                    
                    sys_prompt += (
                        f"\n\n[SYSTEM INFO: Active Local Workspace: {workspace_manager.workspace_root}]\n"
                        f"The files currently available in the active workspace project are:\n"
                        f"{files_str}\n\n"
                    )
                    
                    if auto_attached_contents:
                        sys_prompt += (
                            "The complete source code of all files in the workspace has been automatically loaded below for your reference. "
                            "You can read, review, analyze, and edit them directly.\n"
                            f"{auto_attached_contents}"
                        )
                    else:
                        sys_prompt += (
                            "Since the workspace is large, files have not been loaded automatically. "
                            "To inspect the content of any file, instruct the user to type `/file [filepath]` in their message.\n"
                        )
                        
                    sys_prompt += (
                        "\n\nYou have full permission to read, write, and modify files in this workspace.\n"
                        "If the user asks you to write code, create, or update files, you must output the file content using this exact tag format:\n"
                        "[WRITE_FILE: relative/path/to/file.ext]\n"
                        "complete file content goes here\n"
                        "[END_WRITE_FILE]\n"
                        "For example:\n"
                        "[WRITE_FILE: hello.py]\n"
                        "print('hello world')\n"
                        "[END_WRITE_FILE]\n"
                        "Write out the full file content inside the tags. You can output multiple write blocks if needed."
                    )

                if request.agentMode:
                    # ----------------- REAL MULTI-AGENT LOOP -----------------
                    # Step 1: Researcher
                    yield f"event: agent_step\ndata: {json.dumps({'agent': 'Researcher', 'message': 'Searching database, analyzing request, and drafting technical plan...'})}\n\n"
                    yield "event: text\ndata: " + json.dumps("### [Researcher's Analysis]\n") + "\n\n"
                    
                    researcher_prompt = (
                        sys_prompt + 
                        "\n\nYou are Researcher. Identify what files need to be changed or created to solve the user's request. "
                        "Analyze the retrieved RAG contexts and draft a step-by-step implementation plan. "
                        "Do not write the actual code content, just detail the plan. Keep it concise."
                    )
                    
                    researcher_reply = ""
                    async for text_part in generate_response_stream(
                        messages=formatted_msgs,
                        context_chunks=context_chunks,
                        provider=request.provider,
                        api_key=request.apiKey,
                        ollama_url=request.ollamaUrl,
                        model=request.genModel,
                        system_prompt=researcher_prompt,
                        profile_memories=matched_memories,
                        skills=matched_skills,
                        past_messages=matched_messages
                    ):
                        researcher_reply += text_part
                        yield f"event: text\ndata: {json.dumps(text_part)}\n\n"
                        
                    yield f"event: agent_step\ndata: {json.dumps({'agent': 'Researcher', 'message': 'Plan generated. Transferring to Developer...'})}\n\n"
                    await asyncio.sleep(0.3)
                    
                    # Step 2: Developer Draft
                    yield f"event: agent_step\ndata: {json.dumps({'agent': 'Developer', 'message': 'Drafting code files and structuring implementation...'})}\n\n"
                    yield "event: text\ndata: " + json.dumps("\n\n### [Developer's Draft]\n") + "\n\n"
                    
                    dev_draft_prompt = (
                        sys_prompt +
                        "\n\nYou are Developer. Based on Researcher's plan below, write the implementation details and draft the code. "
                        f"\nResearcher's Plan:\n{researcher_reply}\n\n"
                        "Output the code blocks clearly. Do not use [WRITE_FILE] tags yet; this is a draft."
                    )
                    
                    developer_draft = ""
                    dev_msgs = formatted_msgs + [{"role": "assistant", "content": researcher_reply}]
                    async for text_part in generate_response_stream(
                        messages=dev_msgs,
                        context_chunks=context_chunks,
                        provider=request.provider,
                        api_key=request.apiKey,
                        ollama_url=request.ollamaUrl,
                        model=request.genModel,
                        system_prompt=dev_draft_prompt
                    ):
                        developer_draft += text_part
                        yield f"event: text\ndata: {json.dumps(text_part)}\n\n"
                        
                    yield f"event: agent_step\ndata: {json.dumps({'agent': 'Developer', 'message': 'Draft complete. Initiating Critic audit...'})}\n\n"
                    await asyncio.sleep(0.3)
                    
                    # Step 3: Critic Review
                    yield f"event: agent_step\ndata: {json.dumps({'agent': 'Critic', 'message': 'Evaluating code quality, styling border alignment, and checking syntax...'})}\n\n"
                    yield "event: text\ndata: " + json.dumps("\n\n### [Critic's Audit]\n") + "\n\n"
                    
                    critic_prompt = (
                        sys_prompt +
                        "\n\nYou are Critic. Review Developer's draft code below. Highlight any syntax errors, performance issues, "
                        "styling improvements, or bugs. Be critical and list them. "
                        f"\nDeveloper's Draft:\n{developer_draft}\n"
                    )
                    
                    critic_review = ""
                    critic_msgs = dev_msgs + [{"role": "assistant", "content": developer_draft}]
                    async for text_part in generate_response_stream(
                        messages=critic_msgs,
                        context_chunks=context_chunks,
                        provider=request.provider,
                        api_key=request.apiKey,
                        ollama_url=request.ollamaUrl,
                        model=request.genModel,
                        system_prompt=critic_prompt
                    ):
                        critic_review += text_part
                        yield f"event: text\ndata: {json.dumps(text_part)}\n\n"
                        
                    yield f"event: agent_step\ndata: {json.dumps({'agent': 'Critic', 'message': 'Audit complete. Refinement phase active...'})}\n\n"
                    await asyncio.sleep(0.3)
                    
                    # Step 4: Final Refinement (Developer)
                    yield f"event: agent_step\ndata: {json.dumps({'agent': 'Developer', 'message': 'Applying Critic fixes and compiling final code blocks...'})}\n\n"
                    yield "event: text\ndata: " + json.dumps("\n\n### [Developer's Final Refined Output]\n") + "\n\n"
                    
                    refine_prompt = (
                        sys_prompt +
                        "\n\nYou are Developer. Review Critic's suggestions and Developer's draft, and write the final, perfect code. "
                        f"\nDeveloper's Draft:\n{developer_draft}\n"
                        f"\nCritic's Suggestions:\n{critic_review}\n\n"
                        "Output the final code. If the user asks you to write code, create, or update files, "
                        "you must output the file content using this exact tag format:\n"
                        "[WRITE_FILE: relative/path/to/file.ext]\n"
                        "complete file content goes here\n"
                        "[END_WRITE_FILE]\n"
                    )
                    
                    refine_msgs = critic_msgs + [{"role": "user", "content": f"Address Critic's concerns and output the final refined code."}]
                    refined_reply = ""
                    async for text_part in generate_response_stream(
                        messages=refine_msgs,
                        context_chunks=context_chunks,
                        provider=request.provider,
                        api_key=request.apiKey,
                        ollama_url=request.ollamaUrl,
                        model=request.genModel,
                        system_prompt=refine_prompt,
                        profile_memories=matched_memories,
                        skills=matched_skills
                    ):
                        refined_reply += text_part
                        yield f"event: text\ndata: {json.dumps(text_part)}\n\n"
                    
                    # Log the entire multi-agent cycle summary
                    assistant_reply = (
                        f"### [Researcher's Analysis]\n{researcher_reply}\n\n"
                        f"### [Developer's Draft]\n{developer_draft}\n\n"
                        f"### [Critic's Audit]\n{critic_review}\n\n"
                        f"### [Developer's Final Refined Output]\n{refined_reply}"
                    )
                    
                    yield f"event: agent_step\ndata: {json.dumps({'agent': 'Critic', 'message': 'Autonomous Multi-Agent Loop finished successfully.'})}\n\n"
                
                else:
                    # Standard Single-Turn Generation
                    async for text_part in generate_response_stream(
                        messages=formatted_msgs,
                        context_chunks=context_chunks,
                        provider=request.provider,
                        api_key=request.apiKey,
                        ollama_url=request.ollamaUrl,
                        model=request.genModel,
                        system_prompt=sys_prompt,
                        profile_memories=matched_memories,
                        skills=matched_skills,
                        past_messages=matched_messages
                    ):
                        assistant_reply += text_part
                        yield f"event: text\ndata: {json.dumps(text_part)}\n\n"
                
                # Intercept and process any WRITE_FILE commands generated by the LLM
                import re
                write_matches = re.findall(r'\[WRITE_FILE:\s*([^\]\n\r]+)\]\r?\n?([\s\S]*?)\[END_WRITE_FILE\]', assistant_reply)
                for file_path, content in write_matches:
                    clean_path = file_path.strip()
                    try:
                        workspace_manager.write_file(clean_path, content)
                        yield f"event: agent_step\ndata: {json.dumps({'agent': 'Critic', 'message': f'Auto-saved file changes to: {clean_path}'})}\n\n"
                    except Exception as we:
                        yield f"event: agent_step\ndata: {json.dumps({'agent': 'Critic', 'message': f'Failed to write file {clean_path}: {we}'})}\n\n"
                    
                # Save assistant response to SQLite log
                # Wrapped in its own try/except: embedding failure must NOT erase the
                # already-streamed answer from the frontend via an error SSE event.
                if request.conversationId and assistant_reply.strip():
                    reply_embedding = None
                    try:
                        reply_embedding = await get_embedding(
                            text=assistant_reply,
                            provider=request.provider,
                            api_key=request.apiKey,
                            ollama_url=request.ollamaUrl,
                            model=request.embedModel
                        )
                    except Exception as ee:
                        print(f"Warning: Failed to compute assistant reply embedding: {ee}")

                    try:
                        db.add_message(
                            msg_id=str(uuid.uuid4()),
                            conv_id=request.conversationId,
                            role="assistant",
                            content=assistant_reply,
                            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                            embedding=reply_embedding
                        )
                        # Trigger background task for preference extraction & self-reflection
                        background_tasks.add_task(
                            background_extraction_job,
                            dialogue_turn=[
                                {"role": "user", "content": query},
                                {"role": "assistant", "content": assistant_reply}
                            ],
                            provider=request.provider,
                            api_key=request.apiKey,
                            ollama_url=request.ollamaUrl,
                            embed_model=request.embedModel,
                            gen_model=request.genModel
                        )
                        
                        # Add response to semantic cache
                        if query_embedding is not None and assistant_reply.strip():
                            try:
                                db.add_to_cache(
                                    query_text=search_query,
                                    embedding=query_embedding,
                                    response_text=assistant_reply,
                                    chat_model=request.chatModel
                                )
                            except Exception as ce:
                                print(f"Warning: Failed to save to semantic cache: {ce}")
                    except Exception as db_ex:
                        print(f"Error: Failed to save assistant message to database: {db_ex}")

                    # Evaluate RAG Faithfulness and Grounding
                    try:
                        eval_metrics = evaluate_rag_faithfulness(
                            query=query,
                            answer=assistant_reply,
                            context_chunks=context_chunks
                        )
                        yield f"event: rag_eval\ndata: {json.dumps(eval_metrics)}\n\n"
                    except Exception as ee:
                        print(f"Evaluation metrics warning: {ee}")
                    
            except Exception as ex:
                err_msg = get_error_detail(ex)
                yield f"event: error\ndata: {json.dumps(err_msg)}\n\n"
                
            yield "event: done\ndata: {}\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Mount static files to serve the SPA

@app.post("/api/image/generate")
async def generate_ai_image(req: ImageGenRequest):
    """AI Image Generator Suite supporting Google Imagen 3, OpenAI DALL-E 3, and FLUX.1"""
    if not req.prompt or not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt text is required for image generation.")
    return await download_and_cache_image(
        prompt=req.prompt.strip(),
        static_dir=static_dir,
        width=req.width or 1024,
        height=req.height or 1024,
        seed=req.seed or 42,
        model=req.model or "flux",
        provider=req.provider or "auto",
        api_key=req.apiKey,
        aspect_ratio=req.aspectRatio or "1:1",
        style=req.style,
        negative_prompt=req.negativePrompt
    )

@app.post("/api/diagram/generate")
async def generate_mermaid_diagram(req: DiagramGenRequest):
    """Interactive Diagram Generator using Mermaid.js Syntax Engine"""
    return generate_diagram_code(prompt=req.prompt, diagram_type=req.diagramType or "flowchart")

@app.post("/api/video/generate")
async def generate_ai_video(req: VideoGenRequest):
    """AI Video Generator Suite supporting true transformer diffusion (LTX-Video, Wan2.1, Replicate, Fal)"""
    if not req.prompt or not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt text is required for video generation.")
    res = await generate_and_cache_video(
        prompt=req.prompt.strip(),
        static_dir=static_dir,
        duration=req.duration or 3,
        fps=req.fps or 24,
        aspect_ratio=req.aspectRatio or "16:9",
        motion_style=req.motionStyle or "cinematic_zoom",
        title=req.title,
        provider=req.provider or "auto",
        api_key=req.apiKey,
        negative_prompt=req.negativePrompt
    )
    if res.get("status") == "error":
        raise HTTPException(status_code=500, detail=res.get("message", "Video generation failed."))
    return res


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    favicon_path = os.path.join(static_dir, "nexus-logo.png")
    if os.path.exists(favicon_path):
        return FileResponse(favicon_path)
    raise HTTPException(status_code=404, detail="Favicon not found")





@app.post("/api/data/analyze-csv")
async def analyze_csv_endpoint(file: UploadFile = File(...)):
    """Parses an uploaded CSV file, computes summary stats, and generates recommended Chart.js spec."""
    try:
        content = await file.read()
        text_content = content.decode("utf-8", errors="replace")
        import csv, io
        reader = csv.reader(io.StringIO(text_content))
        rows = [row for row in reader if any(cell.strip() for cell in row)]
        if not rows:
            raise HTTPException(status_code=400, detail="CSV file is empty.")
        
        headers = [h.strip() for h in rows[0]]
        data_rows = rows[1:]
        row_count = len(data_rows)
        col_count = len(headers)
        
        col_stats = []
        label_col_idx = 0
        numeric_col_indices = []
        
        for col_idx, col_name in enumerate(headers):
            vals = [r[col_idx].strip() for r in data_rows if col_idx < len(r)]
            num_vals = []
            for v in vals:
                clean_v = v.replace(",", "").replace("$", "").replace("%", "")
                try:
                    num_vals.append(float(clean_v))
                except ValueError:
                    pass
            is_numeric = len(num_vals) >= len(vals) * 0.7 if vals else False
            if is_numeric and num_vals:
                numeric_col_indices.append(col_idx)
                col_stats.append({
                    "name": col_name,
                    "type": "numeric",
                    "min": min(num_vals),
                    "max": max(num_vals),
                    "avg": round(sum(num_vals) / len(num_vals), 2)
                })
            else:
                if not numeric_col_indices:
                    label_col_idx = col_idx
                col_stats.append({
                    "name": col_name,
                    "type": "text",
                    "unique_count": len(set(vals))
                })
                
        # Generate recommended Chart.js spec
        labels = [r[label_col_idx] for r in data_rows[:15] if label_col_idx < len(r)]
        datasets = []
        palette = ["#00f3ff", "#10b981", "#8b5cf6", "#f59e0b", "#ec4899"]
        
        for i, num_idx in enumerate(numeric_col_indices[:3]):
            col_name = headers[num_idx]
            col_data = []
            for r in data_rows[:15]:
                if num_idx < len(r):
                    try:
                        col_data.append(float(r[num_idx].replace(",", "").replace("$", "").replace("%", "")))
                    except ValueError:
                        col_data.append(0)
                else:
                    col_data.append(0)
            datasets.append({
                "label": col_name,
                "data": col_data,
                "backgroundColor": palette[i % len(palette)],
                "borderColor": palette[i % len(palette)],
                "borderWidth": 1
            })
            
        chart_type = "bar" if len(labels) <= 15 else "line"
        chart_spec = {
            "type": chart_type,
            "title": f"Dataset Visualization: {file.filename}",
            "data": {
                "labels": labels,
                "datasets": datasets
            },
            "options": {
                "responsive": True,
                "maintainAspectRatio": False
            }
        }
        
        return {
            "filename": file.filename,
            "row_count": row_count,
            "col_count": col_count,
            "columns": col_stats,
            "chart_spec": chart_spec
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Mount static files to serve the SPA (must be last route)
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
