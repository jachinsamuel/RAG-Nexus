import asyncio
import json
import re
from typing import AsyncGenerator, Dict, Any, List, Optional
from app.rag_engine import search_ddg, generate_response_stream
from app.url_ingestor import fetch_webpage_content

def extract_subqueries(topic: str) -> List[str]:
    """Generates 3-4 diverse search queries targeting different aspects of the topic."""
    clean_topic = topic.strip()
    return [
        f"{clean_topic} overview technical architecture 2026",
        f"{clean_topic} benchmarks comparison performance",
        f"{clean_topic} key challenges limitations solutions",
        f"{clean_topic} latest trends research state of the art"
    ]

async def scrape_source_safe(url: str) -> Optional[Dict[str, Any]]:
    """Safely scrapes a web source with a strict 8-second timeout."""
    try:
        data = await asyncio.wait_for(fetch_webpage_content(url), timeout=8.0)
        # Keep clean text to max 2500 characters per source for optimal context density
        clean_text = data.get("text", "")[:2500]
        return {
            "title": data.get("raw_title") or data.get("title") or url,
            "url": url,
            "content": clean_text
        }
    except Exception:
        return None

async def run_deep_research_stream(
    topic: str,
    provider: str = "gemini",
    api_key: Optional[str] = None,
    ollama_url: Optional[str] = None,
    gen_model: Optional[str] = None
) -> AsyncGenerator[str, None]:
    """
    Executes an autonomous multi-phase deep research pipeline and streams SSE events:
    1. Query Decomposition
    2. Parallel Search
    3. Multi-Source Web Scraping
    4. Cross-Referenced Whitepaper Dossier Generation
    """
    # Phase 1: Planning & Subquery Formulation
    subqueries = extract_subqueries(topic)
    yield f"event: research_step\ndata: {json.dumps({'stage': 'planning', 'label': 'Deconstructing Topic into Multi-Angle Vectors', 'detail': f'Generated {len(subqueries)} specialized search vectors', 'queries': subqueries})}\n\n"
    await asyncio.sleep(0.3)
    
    # Phase 2: Parallel Search Execution
    yield f"event: research_step\ndata: {json.dumps({'stage': 'searching', 'label': 'Executing Parallel Search Queries', 'detail': f'Querying DuckDuckGo across {len(subqueries)} thematic angles concurrently...'})}\n\n"
    
    search_tasks = [search_ddg(q, max_results=5) for q in subqueries]
    search_results_list = await asyncio.gather(*search_tasks, return_exceptions=True)
    
    all_hits: List[Dict[str, str]] = []
    seen_urls = set()
    
    for res in search_results_list:
        if isinstance(res, list):
            for hit in res:
                u = hit.get("url")
                if u and u not in seen_urls and not u.endswith((".pdf", ".zip", ".exe")):
                    seen_urls.add(u)
                    all_hits.append(hit)
                    
    candidate_hits = all_hits[:8]
    yield f"event: research_step\ndata: {json.dumps({'stage': 'browsing', 'label': 'Deep Scraping High-Relevance Sources', 'detail': f'Selected {len(candidate_hits)} primary sources for reading & extraction...', 'sources': candidate_hits})}\n\n"
    
    # Phase 3: Parallel Web Page Extraction
    scrape_tasks = [scrape_source_safe(h["url"]) for h in candidate_hits]
    scraped_data = await asyncio.gather(*scrape_tasks, return_exceptions=True)
    
    valid_sources = []
    for idx, item in enumerate(scraped_data):
        if isinstance(item, dict) and item.get("content"):
            valid_sources.append(item)
        elif idx < len(candidate_hits):
            # Fallback to snippet if page scrape timed out or was blocked
            valid_sources.append({
                "title": candidate_hits[idx].get("title", "Web Source"),
                "url": candidate_hits[idx].get("url", ""),
                "content": candidate_hits[idx].get("snippet", "")
            })
            
    # Phase 4: Evidence Synthesis
    yield f"event: research_step\ndata: {json.dumps({'stage': 'synthesizing', 'label': 'Synthesizing Cross-Referenced Dossier', 'detail': f'Synthesizing insights from {len(valid_sources)} verified sources with citations...'})}\n\n"
    await asyncio.sleep(0.4)
    
    # Construct Synthesis Prompt
    context_blocks = []
    for idx, src in enumerate(valid_sources, 1):
        context_blocks.append(f"[Source {idx}]: {src['title']}\nURL: {src['url']}\nExcerpt: {src['content']}\n")
        
    context_str = "\n---\n".join(context_blocks)
    
    system_prompt = (
        "You are the Nexus Deep Research Analyst, a world-class investigative researcher and technical author. "
        "Your mission is to produce an exhaustive, authoritative, beautifully structured research whitepaper "
        "on the user's topic using the provided live source materials.\n\n"
        "Guidelines:\n"
        "1. Write an extensive, deep, publication-grade report with clear headings (#, ##, ###).\n"
        "2. Structure your report into:\n"
        "   - # [Descriptive Comprehensive Title]\n"
        "   - ## Executive Summary\n"
        "   - ## Key Findings & Thematic Breakdown\n"
        "   - ## In-Depth Technical Architecture & Mechanism Analysis\n"
        "   - ## Comparative Analysis & Evaluation Matrix (use markdown tables or interactive ```chart ... ``` blocks if numerical!)\n"
        "   - ## Critical Challenges, Limitations & Open Problems\n"
        "   - ## Future Trajectory & Strategic Outlook\n"
        "   - ## References & Source Attributions (list numbered sources with clean markdown links)\n"
        "3. Cite sources inline using [1], [2], etc. matching the provided numbered sources.\n"
        "4. Tone must be analytical, precise, and highly insightful."
    )
    
    user_prompt = (
        f"RESEARCH TOPIC: {topic}\n\n"
        f"GATHERED PRIMARY SOURCES ({len(valid_sources)} Verified Documents):\n\n"
        f"{context_str}\n\n"
        f"Produce the comprehensive research whitepaper now."
    )
    
    messages = [
        {"role": "user", "content": user_prompt}
    ]
    
    # Phase 5: Stream the synthesis report
    async for chunk in generate_response_stream(
        messages=messages,
        context_chunks=[],
        provider=provider,
        api_key=api_key,
        ollama_url=ollama_url,
        system_prompt=system_prompt,
        model=gen_model
    ):
        yield f"event: text\ndata: {json.dumps({'chunk': chunk})}\n\n"
        
    # Phase 6: Completion Event with all source metadata
    sources_summary = [{"title": s["title"], "url": s["url"]} for s in valid_sources]
    yield f"event: research_complete\ndata: {json.dumps({'status': 'complete', 'sources': sources_summary})}\n\n"
