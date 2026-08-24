import re
import os
import uuid
import json
import httpx
from datetime import datetime
from typing import Dict, Any, Optional, List
from bs4 import BeautifulSoup

YOUTUBE_REGEX = re.compile(
    r'(?:https?://)?(?:www\.|m\.)?(?:youtube\.com/(?:watch\?v=|embed/|shorts/|v/)|youtu\.be/)([a-zA-Z0-9_-]{11})'
)

def is_youtube_url(url: str) -> bool:
    """Checks if a given URL points to a YouTube video."""
    if not url:
        return False
    return bool(YOUTUBE_REGEX.search(url.strip()))

def extract_youtube_id(url: str) -> Optional[str]:
    """Extracts the 11-character YouTube video ID from a URL."""
    if not url:
        return None
    match = YOUTUBE_REGEX.search(url.strip())
    return match.group(1) if match else None

async def fetch_youtube_metadata(video_url: str) -> Dict[str, str]:
    """Fetches YouTube video title and author using YouTube oEmbed API."""
    oembed_url = f"https://www.youtube.com/oembed?url={video_url}&format=json"
    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(oembed_url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "title": data.get("title", "YouTube Video"),
                    "author": data.get("author_name", "YouTube Creator")
                }
    except Exception as e:
        print(f"Warning: Failed to fetch YouTube oEmbed: {e}")
    return {"title": "YouTube Video", "author": "YouTube"}

def format_timestamp(seconds: float) -> str:
    """Formats float seconds into mm:ss or hh:mm:ss format."""
    total_sec = int(seconds)
    hours = total_sec // 3600
    minutes = (total_sec % 3600) // 60
    secs = total_sec % 60
    if hours > 0:
        return f"{hours:02d}:{minutes:02d}:{secs:02d}"
    return f"{minutes:02d}:{secs:02d}"

async def fetch_youtube_transcript(url: str) -> Dict[str, Any]:
    """Fetches full transcript and metadata for a YouTube video."""
    video_id = extract_youtube_id(url)
    if not video_id:
        raise ValueError("Invalid YouTube URL: Could not extract video ID.")

    meta = await fetch_youtube_metadata(url)
    title = meta["title"]
    author = meta["author"]

    transcript_text = ""
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        # Support new and old youtube-transcript-api interfaces
        try:
            # Try newer instance method if available
            if hasattr(YouTubeTranscriptApi, 'list_transcripts'):
                transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
                # Try finding English or auto-generated transcript
                try:
                    t_obj = transcript_list.find_transcript(['en', 'en-US', 'en-GB'])
                except Exception:
                    # Fallback to any available transcript
                    t_obj = next(iter(transcript_list))
                raw_entries = t_obj.fetch()
            else:
                raw_entries = YouTubeTranscriptApi.get_transcript(video_id)
        except Exception:
            raw_entries = YouTubeTranscriptApi.get_transcript(video_id)

        # Build clean paragraph chunks with periodic timestamps
        paragraphs = []
        current_para = []
        current_time = 0.0

        for entry in raw_entries:
            text = entry.get('text', '').strip()
            # Normalize text
            text = text.replace('\n', ' ')
            start = entry.get('start', 0.0)
            
            if not current_para:
                current_time = start
                
            current_para.append(text)
            
            # Form paragraph roughly every 3-4 sentences or ~400 characters
            if len(" ".join(current_para)) > 350 or text.endswith(('.', '?', '!')):
                ts_str = format_timestamp(current_time)
                paragraphs.append(f"[{ts_str}] " + " ".join(current_para))
                current_para = []
                
        if current_para:
            ts_str = format_timestamp(current_time)
            paragraphs.append(f"[{ts_str}] " + " ".join(current_para))

        transcript_text = "\n\n".join(paragraphs)

    except Exception as e:
        # Fallback error message if transcripts are disabled
        raise RuntimeError(f"Could not retrieve YouTube transcript for '{title}': {str(e)}")

    if not transcript_text.strip():
        raise RuntimeError(f"Transcript for YouTube video '{title}' was empty.")

    full_text = f"# YouTube Video: {title}\nChannel: {author}\nURL: {url}\n\n## Transcript\n\n{transcript_text}"
    
    return {
        "title": f"YouTube: {title}",
        "raw_title": title,
        "author": author,
        "url": url,
        "type": "youtube",
        "text": full_text
    }

async def fetch_webpage_content(url: str) -> Dict[str, Any]:
    """Fetches a webpage and parses clean reader-mode text content."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }
    
    try:
        async with httpx.AsyncClient(timeout=20.0, follow_redirects=True) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                raise RuntimeError(f"Failed to fetch webpage (HTTP Status {resp.status_code})")
            html = resp.text
    except Exception as e:
        raise RuntimeError(f"Could not connect to URL '{url}': {str(e)}")

    soup = BeautifulSoup(html, "html.parser")

    # Extract title
    title = "Web Document"
    if soup.title and soup.title.string:
        title = soup.title.string.strip()
    elif soup.find("meta", property="og:title"):
        title = soup.find("meta", property="og:title").get("content", "").strip()
    elif soup.find("h1"):
        title = soup.find("h1").get_text().strip()

    # Clean unwanted tags
    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript", "iframe", "svg", "button", "form", "head"]):
        tag.decompose()

    # Find main body container
    main_elem = soup.find("article") or soup.find("main") or soup.find("div", class_=re.compile(r"content|post|article|body", re.I)) or soup.body

    if not main_elem:
        raise RuntimeError("Could not find readable content in the target webpage.")

    # Extract text preserving headings and paragraphs
    lines = []
    for elem in main_elem.find_all(['h1', 'h2', 'h3', 'h4', 'p', 'li', 'pre', 'blockquote']):
        text = elem.get_text().strip()
        if not text:
            continue
        tag_name = elem.name.lower()
        if tag_name == 'h1':
            lines.append(f"\n# {text}\n")
        elif tag_name == 'h2':
            lines.append(f"\n## {text}\n")
        elif tag_name == 'h3':
            lines.append(f"\n### {text}\n")
        elif tag_name == 'li':
            lines.append(f"- {text}")
        elif tag_name == 'blockquote':
            lines.append(f"> {text}")
        else:
            lines.append(text)

    cleaned_text = "\n\n".join([line for line in lines if line.strip()])
    
    # Fallback to get_text if lines were too sparse
    if len(cleaned_text.strip()) < 100:
        cleaned_text = main_elem.get_text(separator="\n\n", strip=True)

    if len(cleaned_text.strip()) < 50:
        raise RuntimeError("Webpage content appears empty or inaccessible.")

    full_document = f"# {title}\nSource: {url}\nIngested: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n{cleaned_text}"

    return {
        "title": f"Web: {title[:80]}",
        "raw_title": title,
        "url": url,
        "type": "web",
        "text": full_document
    }

async def ingest_url_to_knowledge(
    url: str,
    db,
    provider: str = "gemini",
    api_key: Optional[str] = None,
    ollama_url: Optional[str] = None,
    embed_model: Optional[str] = None
) -> Dict[str, Any]:
    """Ingests any Web URL or YouTube Video into the SQLite vector database."""
    from app.rag_engine import chunk_text, get_embeddings_batch

    url_clean = url.strip()
    if is_youtube_url(url_clean):
        data = await fetch_youtube_transcript(url_clean)
    else:
        data = await fetch_webpage_content(url_clean)

    text = data["text"]
    doc_name = data["title"]
    doc_id = str(uuid.uuid4())
    upload_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # 1. Chunk document
    raw_chunks = chunk_text(text, chunk_size=700, chunk_overlap=120)
    if not raw_chunks:
        raise RuntimeError("Failed to generate text chunks from the ingested content.")

    # 2. Generate embeddings in batch
    embeddings = await get_embeddings_batch(
        texts=raw_chunks,
        provider=provider,
        api_key=api_key,
        ollama_url=ollama_url,
        model=embed_model
    )

    # 3. Format chunks
    chunks_with_embeddings = []
    for idx, (chunk_str, emb) in enumerate(zip(raw_chunks, embeddings)):
        chunks_with_embeddings.append({
            "id": str(uuid.uuid4()),
            "idx": idx,
            "text": chunk_str,
            "embedding": emb
        })

    # 4. Save into SQLite Database
    doc_size = len(text.encode("utf-8"))
    db.add_document(
        doc_id=doc_id,
        name=doc_name,
        size=doc_size,
        upload_date=upload_date,
        chunks=chunks_with_embeddings
    )

    return {
        "status": "success",
        "doc_id": doc_id,
        "name": doc_name,
        "raw_title": data.get("raw_title", doc_name),
        "type": data["type"],
        "url": url_clean,
        "chunk_count": len(chunks_with_embeddings),
        "size": doc_size,
        "upload_date": upload_date
    }
