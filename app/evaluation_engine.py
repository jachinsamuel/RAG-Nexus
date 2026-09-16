import re
from typing import List, Dict, Any

def extract_claims(text: str) -> List[str]:
    """Extracts factual prose statements from response, stripping code and diagrams."""
    if not text:
        return []
    
    # Strip markdown code blocks, tables, and images
    cleaned = re.sub(r'```[\s\S]*?```', '', text)
    cleaned = re.sub(r'!\[.*?\]\(.*?\)', '', cleaned)
    cleaned = re.sub(r'<[^>]+>', '', cleaned)
    
    # Split by sentence boundaries (. ! ? followed by space or newline)
    raw_sentences = re.split(r'(?<=[.!?])\s+', cleaned)
    claims = []
    
    stop_phrases = ["here is", "in summary", "thank you", "as an ai", "let me know", "feel free"]
    
    for s in raw_sentences:
        s_clean = s.strip()
        # Filter out very short lines, markdown headers, table separators
        if len(s_clean) < 15 or s_clean.startswith(('#', '-', '*', '|', '>')):
            continue
        # Filter polite filler
        if any(s_clean.lower().startswith(p) for p in stop_phrases):
            continue
        claims.append(s_clean)
        
    return claims

def get_keywords(text: str) -> set:
    """Extracts informative alphanumeric keywords of length >= 3."""
    words = re.findall(r'\b[a-zA-Z0-9_\-\.]{3,}\b', text.lower())
    stopwords = {
        "the", "and", "that", "have", "for", "not", "with", "you", "this", "but",
        "his", "from", "they", "say", "her", "she", "will", "one", "all", "would",
        "there", "their", "what", "out", "about", "who", "get", "which", "when",
        "make", "can", "like", "time", "just", "him", "know", "take", "people",
        "into", "year", "your", "good", "some", "could", "them", "see", "other",
        "than", "then", "now", "look", "only", "come", "its", "over", "think",
        "also", "back", "after", "use", "two", "how", "our", "work", "first",
        "well", "way", "even", "new", "want", "because", "any", "these", "give"
    }
    return {w for w in words if w not in stopwords}

def evaluate_rag_faithfulness(query: str, answer: str, context_chunks: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Evaluates real-time grounding and faithfulness of an answer against retrieved RAG chunks.
    Computes claim-level support, relevance, and overall hallucination risk level.
    """
    if not context_chunks:
        return {
            "has_rag": False,
            "grounding_score": 100,
            "context_relevance": 100,
            "risk_level": "Direct Model Answer",
            "verified_claims": 0,
            "total_claims": 0,
            "claims": []
        }
        
    claims = extract_claims(answer)
    if not claims:
        return {
            "has_rag": True,
            "grounding_score": 95,
            "context_relevance": 90,
            "risk_level": "Verified Grounded",
            "verified_claims": 0,
            "total_claims": 0,
            "claims": []
        }
        
    # Pre-process context chunks
    chunk_docs = []
    all_context_text = ""
    for c in context_chunks:
        c_text = c.get("text", "")
        all_context_text += " " + c_text
        chunk_docs.append({
            "name": c.get("doc_name") or c.get("name") or "Document",
            "text": c_text,
            "keywords": get_keywords(c_text),
            "similarity": float(c.get("similarity", 0.0) or 0.0)
        })
        
    all_context_keywords = get_keywords(all_context_text)
    
    verified_count = 0
    claims_results = []
    
    for claim in claims:
        claim_kws = get_keywords(claim)
        if not claim_kws:
            continue
            
        best_doc = None
        best_overlap = 0.0
        
        for doc in chunk_docs:
            overlap = len(claim_kws & doc["keywords"]) / len(claim_kws) if claim_kws else 0
            if overlap > best_overlap:
                best_overlap = overlap
                best_doc = doc["name"]
                
        # Also check global context overlap
        global_overlap = len(claim_kws & all_context_keywords) / len(claim_kws) if claim_kws else 0
        final_overlap = max(best_overlap, global_overlap)
        
        is_grounded = final_overlap >= 0.40  # 40% of substantive keywords substantiated in context
        if is_grounded:
            verified_count += 1
            
        claims_results.append({
            "claim": claim[:140] + ("..." if len(claim) > 140 else ""),
            "grounded": is_grounded,
            "confidence": round(final_overlap * 100),
            "source": best_doc or "Context Chunks"
        })
        
    total_eval = max(1, len(claims_results))
    grounding_pct = round((verified_count / total_eval) * 100)
    
    # Calculate average context relevance score
    avg_sim = sum(d["similarity"] for d in chunk_docs) / max(1, len(chunk_docs))
    # Rescale similarity (often 0.3 - 0.9) to a percentage
    relevance_pct = min(100, max(50, round(avg_sim * 100) if avg_sim > 0 else 85))
    
    if grounding_pct >= 80:
        risk_level = "Verified Grounded"
        status_color = "#10b981"  # Emerald green
        badge_icon = "shield-check"
    elif grounding_pct >= 60:
        risk_level = "Partially Grounded"
        status_color = "#f59e0b"  # Amber
        badge_icon = "alert-triangle"
    else:
        risk_level = "Speculative"
        status_color = "#ef4444"  # Coral red
        badge_icon = "alert-circle"
        
    return {
        "has_rag": True,
        "grounding_score": grounding_pct,
        "context_relevance": relevance_pct,
        "risk_level": risk_level,
        "status_color": status_color,
        "badge_icon": badge_icon,
        "verified_claims": verified_count,
        "total_claims": total_eval,
        "sources_count": len(chunk_docs),
        "claims": claims_results[:6]  # Top claims for UI inspector
    }
