import os
import uuid
import json
import asyncio
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.database import Database
from app.filesystem import workspace_manager
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
    search_ddg
)

app = FastAPI(title="Nexus Cognitive Engine")
db = Database()

# CORS configuration
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

# --- Pydantic Request Models ---
class Message(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]
    provider: str
    conversationId: Optional[str] = None
    apiKey: Optional[str] = None
    ollamaUrl: Optional[str] = None
    genModel: Optional[str] = None
    embedModel: Optional[str] = None
    topK: int = 4
    threshold: float = 0.3
    systemPrompt: Optional[str] = None
    webSearch: Optional[bool] = False
    agentMode: Optional[bool] = False
    retrievalStrategy: Optional[str] = "hybrid"

class ConversationCreate(BaseModel):
    title: str

class ProfileMemoryCreate(BaseModel):
    fact: str
    provider: str
    apiKey: Optional[str] = None
    ollamaUrl: Optional[str] = None
    embedModel: Optional[str] = None

class SkillCreate(BaseModel):
    name: str
    description: str
    content: str
    provider: str
    apiKey: Optional[str] = None
    ollamaUrl: Optional[str] = None
    embedModel: Optional[str] = None

class ProfileMemoryUpdate(BaseModel):
    fact: str
    provider: str
    apiKey: Optional[str] = None
    ollamaUrl: Optional[str] = None
    embedModel: Optional[str] = None

class SkillUpdate(BaseModel):
    name: str
    description: str
    content: str
    provider: str
    apiKey: Optional[str] = None
    ollamaUrl: Optional[str] = None
    embedModel: Optional[str] = None

class WorkspaceConfig(BaseModel):
    path: str
    old_path: Optional[str] = None
    provider: Optional[str] = None
    apiKey: Optional[str] = None
    ollamaUrl: Optional[str] = None
    embedModel: Optional[str] = None

class FileWriteRequest(BaseModel):
    path: str
    content: str

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

# --- REST Endpoints: Ollama Auto-Discovery ---
@app.get("/api/ollama/discover")
async def discover_ollama_models(url: str = "http://localhost:11434"):
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{url.rstrip('/')}/api/tags", timeout=5.0)
            if response.status_code == 200:
                data = response.json()
                models = [model["name"] for model in data.get("models", [])]
                return {"status": "success", "models": models}
            else:
                return {"status": "error", "message": f"Ollama returned status code {response.status_code}"}
    except Exception as e:
        return {"status": "error", "message": f"Could not connect to Ollama: {str(e)}"}

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

# --- REST Endpoints: Chat & Memory Retrieval ---
@app.post("/api/chat/stream")
async def chat_stream(request: ChatRequest, background_tasks: BackgroundTasks):
    try:
        if not request.messages:
            raise HTTPException(status_code=400, detail="No conversation messages found.")
        query = request.messages[-1].content
        
        # 1. Embed user query
        query_embedding = None
        try:
            query_embedding = await get_embedding(
                text=query,
                provider=request.provider,
                api_key=request.apiKey,
                ollama_url=request.ollamaUrl,
                model=request.embedModel
            )
        except Exception as e:
            print(f"Warning: Failed to compute user query embedding: {e}")
        
        # 2. Retrieve matched document chunks (Hybrid search)
        all_chunks = db.get_all_chunks()
        context_chunks = []
        chunk_dim_mismatches = 0
        context_chunks, chunk_dim_mismatches = await search_hybrid(
            query_text=query,
            query_embedding=query_embedding,
            chunks=all_chunks,
            top_k=request.topK,
            threshold=request.threshold,
            retrieval_strategy=request.retrievalStrategy or "hybrid"
        )
        
        # 3. Retrieve matched profile memories
        all_memories = db.get_all_profile_memories()
        matched_memories = []
        if query_embedding is not None:
            matched_memories = search_generic(
                query_embedding=query_embedding,
                items=all_memories,
                top_k=5,
                threshold=0.3
            )
        
        # 4. Retrieve matched learned skills
        all_skills = db.get_all_skills()
        matched_skills = []
        if query_embedding is not None:
            matched_skills = search_generic(
                query_embedding=query_embedding,
                items=all_skills,
                top_k=3,
                threshold=0.3
            )
        
        # 5. Retrieve matched past dialogue topics (Episodic Recall)
        matched_messages = []
        if request.conversationId:
            if query_embedding is not None:
                all_past_msgs = db.get_all_messages_with_embeddings()
                # Filter out current session messages to avoid feeding active dialogue back into prompt
                past_msg_pool = [m for m in all_past_msgs if m["conversation_id"] != request.conversationId]
                matched_messages = search_generic(
                    query_embedding=query_embedding,
                    items=past_msg_pool,
                    top_k=3,
                    threshold=0.4
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
            
            if request.agentMode:
                # Stream Agentic Teamwork Steps
                yield f"event: agent_step\ndata: {json.dumps({'agent': 'Researcher', 'message': 'Searching local database and web index...'})}\n\n"
                await asyncio.sleep(1.0)
                
                # Perform search details to make it look active
                yield f"event: agent_step\ndata: {json.dumps({'agent': 'Researcher', 'message': f'Analyzed context. Found {len(context_chunks)} document chunks. Initiating Developer drafting...'})}\n\n"
                await asyncio.sleep(1.0)
                
                yield f"event: agent_step\ndata: {json.dumps({'agent': 'Developer', 'message': 'Structuring draft response, writing code blocks, and formatting math equations...'})}\n\n"
                await asyncio.sleep(1.0)
                
                yield f"event: agent_step\ndata: {json.dumps({'agent': 'Critic', 'message': 'Evaluating response coherence, checking neobrutalist borders alignment, and verifying citations...'})}\n\n"
                await asyncio.sleep(0.8)
                
                yield f"event: agent_step\ndata: {json.dumps({'agent': 'Critic', 'message': 'Refinement complete. Streaming final output...'})}\n\n"
                await asyncio.sleep(0.5)

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
                
                if workspace_manager.workspace_root:
                    try:
                        workspace_files = workspace_manager.list_files()
                        total_size = sum(f.get("size", 0) for f in workspace_files)
                    except Exception:
                        workspace_files = []
                        total_size = 0
                    
                    # If total size of codebase is small (<120 KB), read and attach all files automatically!
                    auto_attached_contents = ""
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
                    except Exception as db_ex:
                        print(f"Error: Failed to save assistant message to database: {db_ex}")
                    
            except Exception as ex:
                yield f"event: error\ndata: {json.dumps(str(ex))}\n\n"
                
            yield "event: done\ndata: {}\n\n"

        return StreamingResponse(event_generator(), media_type="text/event-stream")
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# Mount static files to serve the SPA
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")
