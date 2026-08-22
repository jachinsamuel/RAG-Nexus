import os
import uuid
import urllib.parse
import httpx
from typing import Dict, Any, Optional

IMAGE_TRIGGERS = [
    "generate an image of", "generate image of", "generate image:", 
    "create an image of", "create image of", "draw an image of", 
    "draw a picture of", "draw image of", "paint an image of", 
    "generate a photo of", "create a photo of", "generate a picture of",
    "make an image of", "make a photo of", "make a picture of"
]

def is_image_request(query: str) -> bool:
    """Checks if a user query is an image generation request."""
    if not query:
        return False
    q_lower = query.lower().strip()
    return any(q_lower.startswith(t) or f" {t} " in f" {q_lower} " for t in IMAGE_TRIGGERS)

def extract_image_prompt(query: str) -> str:
    """Extracts the clean image description from a user prompt."""
    if not query:
        return ""
    q_lower = query.lower().strip()
    for trig in IMAGE_TRIGGERS:
        if trig in q_lower:
            idx = q_lower.find(trig) + len(trig)
            return query[idx:].strip(" :.-")
    return query.strip()

def build_image_url(prompt: str, width: int = 1024, height: int = 1024, seed: int = 42, model: str = "flux") -> str:
    """Builds a Pollinations FLUX.1 image URL from a prompt."""
    encoded_prompt = urllib.parse.quote(prompt)
    return f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&seed={seed}&nologo=true"

async def download_and_cache_image(prompt: str, static_dir: str, width: int = 1024, height: int = 1024, seed: int = 42, model: str = "flux") -> Dict[str, Any]:
    """Generates an image via Pollinations FLUX and caches it locally into static/generated_images/."""
    image_url = build_image_url(prompt=prompt, width=width, height=height, seed=seed, model=model)
    output_dir = os.path.join(static_dir, "generated_images")
    os.makedirs(output_dir, exist_ok=True)

    img_filename = f"gen_{uuid.uuid4().hex[:10]}.jpg"
    local_img_path = os.path.join(output_dir, img_filename)
    relative_url = f"/generated_images/{img_filename}"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(image_url)
            if resp.status_code == 200:
                with open(local_img_path, "wb") as f:
                    f.write(resp.content)
                return {
                    "status": "success",
                    "imageUrl": relative_url,
                    "externalUrl": image_url,
                    "prompt": prompt,
                    "filename": img_filename
                }
    except Exception as e:
        print(f"Warning: Failed to cache generated image locally: {e}")

    return {
        "status": "success",
        "imageUrl": image_url,
        "externalUrl": image_url,
        "prompt": prompt,
        "filename": "external"
    }
