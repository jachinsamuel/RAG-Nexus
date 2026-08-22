import sqlite3
import json
import os
from typing import List, Dict, Any, Optional

class Database:
    def __init__(self, db_path: str = "rag.db"):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self):
        conn = sqlite3.connect(self.db_path)
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def _init_db(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Table for storing document metadata
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS documents (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    size INTEGER NOT NULL,
                    upload_date TEXT NOT NULL
                )
            """)
            
            # Table for storing text chunks and their embeddings
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chunks (
                    id TEXT PRIMARY KEY,
                    doc_id TEXT NOT NULL,
                    idx INTEGER NOT NULL,
                    text TEXT NOT NULL,
                    embedding TEXT NOT NULL,
                    FOREIGN KEY (doc_id) REFERENCES documents (id) ON DELETE CASCADE
                )
            """)
            
            # Table for storing conversation sessions
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            
            # Table for storing message logs
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    embedding TEXT,
                    FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
                )
            """)
            
            # Table for storing profile memories (extracted user facts)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS profile_memories (
                    id TEXT PRIMARY KEY,
                    fact TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    embedding TEXT NOT NULL
                )
            """)
            
            # Table for storing custom skills / prompt workflows
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS skills (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL,
                    description TEXT NOT NULL,
                    code_snippet TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
            """)
            
            # Table for semantic vector query caching
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS query_cache (
                    id TEXT PRIMARY KEY,
                    query_hash TEXT NOT NULL,
                    query_text TEXT NOT NULL,
                    query_embedding TEXT NOT NULL,
                    cached_response TEXT NOT NULL,
                    sources TEXT,
                    created_at TEXT NOT NULL
                )
            """)
            
            conn.commit()

    # --- Documents & Chunks ---
    def add_document(self, doc_id: str, name: str, size: int, upload_date: str, chunks: List[Dict[str, Any]]):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO documents (id, name, size, upload_date) VALUES (?, ?, ?, ?)",
                (doc_id, name, size, upload_date)
            )
            for chunk in chunks:
                cursor.execute(
                    "INSERT INTO chunks (id, doc_id, idx, text, embedding) VALUES (?, ?, ?, ?, ?)",
                    (chunk["id"], doc_id, chunk["idx"], chunk["text"], json.dumps(chunk["embedding"]))
                )
            conn.commit()

    def get_all_documents(self) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM documents ORDER BY upload_date DESC")
            rows = cursor.fetchall()
            
            docs = []
            for row in rows:
                cursor.execute("SELECT COUNT(*) FROM chunks WHERE doc_id = ?", (row["id"],))
                chunk_count = cursor.fetchone()[0]
                docs.append({
                    "id": row["id"],
                    "name": row["name"],
                    "size": row["size"],
                    "upload_date": row["upload_date"],
                    "chunk_count": chunk_count
                })
            return docs

    def delete_document(self, doc_id: str):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM chunks WHERE doc_id = ?", (doc_id,))
            cursor.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
            conn.commit()

    def get_document_chunks(self, doc_id: str) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, idx, text FROM chunks WHERE doc_id = ? ORDER BY idx ASC",
                (doc_id,)
            )
            rows = cursor.fetchall()
            return [{"id": r[0], "idx": r[1], "text": r[2]} for r in rows]

    def get_all_chunks(self) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("""
                SELECT chunks.id, chunks.doc_id, chunks.idx, chunks.text, chunks.embedding, documents.name as doc_name
                FROM chunks
                JOIN documents ON chunks.doc_id = documents.id
            """)
            rows = cursor.fetchall()
            chunks = []
            for row in rows:
                chunks.append({
                    "id": row["id"],
                    "doc_id": row["doc_id"],
                    "doc_name": row["doc_name"],
                    "idx": row["idx"],
                    "text": row["text"],
                    "embedding": json.loads(row["embedding"])
                })
            return chunks

    # --- Conversations History ---
    def ensure_conversation_exists(self, conv_id: str, title: str = "New Chat", created_at: str = ""):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM conversations WHERE id = ?", (conv_id,))
            if not cursor.fetchone():
                cursor.execute(
                    "INSERT INTO conversations (id, title, created_at) VALUES (?, ?, ?)",
                    (conv_id, title, created_at)
                )
                conn.commit()

    def add_conversation(self, conv_id: str, title: str, created_at: str):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO conversations (id, title, created_at) VALUES (?, ?, ?)",
                (conv_id, title, created_at)
            )
            conn.commit()

    def get_all_conversations(self) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM conversations ORDER BY created_at DESC")
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def delete_conversation(self, conv_id: str):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM messages WHERE conversation_id = ?", (conv_id,))
            cursor.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
            conn.commit()

    def update_conversation_title(self, conv_id: str, title: str):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE conversations SET title = ? WHERE id = ?",
                (title, conv_id)
            )
            conn.commit()

    # --- Message Logs ---
    def add_message(self, msg_id: str, conv_id: Optional[str], role: str, content: str, timestamp: str, embedding: List[float] = None):
        if not conv_id:
            conv_id = "default_session"
        self.ensure_conversation_exists(conv_id, "Default Session", timestamp)
        
        with self._get_connection() as conn:
            cursor = conn.cursor()
            emb_str = json.dumps(embedding) if embedding else None
            cursor.execute(
                "INSERT INTO messages (id, conversation_id, role, content, timestamp, embedding) VALUES (?, ?, ?, ?, ?, ?)",
                (msg_id, conv_id, role, content, timestamp, emb_str)
            )
            conn.commit()

    def get_messages_for_conversation(self, conv_id: str) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC", (conv_id,))
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def get_all_messages_with_embeddings(self) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM messages WHERE embedding IS NOT NULL")
            rows = cursor.fetchall()
            messages = []
            for row in rows:
                messages.append({
                    "id": row["id"],
                    "conversation_id": row["conversation_id"],
                    "role": row["role"],
                    "content": row["content"],
                    "timestamp": row["timestamp"],
                    "embedding": json.loads(row["embedding"])
                })
            return messages

    # --- Profile Memories (User Preferences) ---
    def add_profile_memory(self, memory_id: str, fact: str, created_at: str, embedding: List[float]):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO profile_memories (id, fact, created_at, embedding) VALUES (?, ?, ?, ?)",
                (memory_id, fact, created_at, json.dumps(embedding))
            )
            conn.commit()

    def get_all_profile_memories(self) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM profile_memories ORDER BY created_at DESC")
            rows = cursor.fetchall()
            memories = []
            for row in rows:
                memories.append({
                    "id": row["id"],
                    "fact": row["fact"],
                    "created_at": row["created_at"],
                    "embedding": json.loads(row["embedding"])
                })
            return memories

    def delete_profile_memory(self, memory_id: str):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM profile_memories WHERE id = ?", (memory_id,))
            conn.commit()

    # --- Custom Skills ---
    def add_skill(self, skill_id: str, name: str, description: str, code_snippet: str, created_at: str):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO skills (id, name, description, code_snippet, created_at) VALUES (?, ?, ?, ?, ?)",
                (skill_id, name, description, code_snippet, created_at)
            )
            conn.commit()

    def get_all_skills(self) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM skills ORDER BY created_at DESC")
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def update_skill(self, skill_id: str, name: str = None, description: str = None, code_snippet: str = None):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            updates = []
            params = []
            if name is not None:
                updates.append("name = ?")
                params.append(name)
            if description is not None:
                updates.append("description = ?")
                params.append(description)
            if code_snippet is not None:
                updates.append("code_snippet = ?")
                params.append(code_snippet)
            if updates:
                params.append(skill_id)
                query = f"UPDATE skills SET {', '.join(updates)} WHERE id = ?"
                cursor.execute(query, tuple(params))
                conn.commit()

    def delete_skill(self, skill_id: str):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM skills WHERE id = ?", (skill_id,))
            conn.commit()

    # --- Semantic Query Cache ---
    def get_cached_query(self, query_hash: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM query_cache WHERE query_hash = ?", (query_hash,))
            row = cursor.fetchone()
            if row:
                return {
                    "id": row["id"],
                    "query_text": row["query_text"],
                    "query_embedding": json.loads(row["query_embedding"]),
                    "cached_response": row["cached_response"],
                    "sources": json.loads(row["sources"]) if row["sources"] else [],
                    "created_at": row["created_at"]
                }
            return None

    def get_all_cached_queries(self) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM query_cache ORDER BY created_at DESC")
            rows = cursor.fetchall()
            cached = []
            for row in rows:
                cached.append({
                    "id": row["id"],
                    "query_hash": row["query_hash"],
                    "query_text": row["query_text"],
                    "query_embedding": json.loads(row["query_embedding"]),
                    "cached_response": row["cached_response"],
                    "sources": json.loads(row["sources"]) if row["sources"] else [],
                    "created_at": row["created_at"]
                })
            return cached

    def add_cached_query(self, cache_id: str, query_hash: str, query_text: str, query_embedding: List[float], cached_response: str, sources: List[Dict[str, Any]], created_at: str):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT OR REPLACE INTO query_cache (id, query_hash, query_text, query_embedding, cached_response, sources, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                (cache_id, query_hash, query_text, json.dumps(query_embedding), cached_response, json.dumps(sources) if sources else None, created_at)
            )
            conn.commit()

    def clear_query_cache(self):
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM query_cache")
            conn.commit()
