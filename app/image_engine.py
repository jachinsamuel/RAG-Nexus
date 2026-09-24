import os
import uuid
import base64
import urllib.parse
import httpx
from typing import Dict, Any, Optional

IMAGE_TRIGGERS = [
    "generate an image of", "generate image of", "generate image:", 
    "create an image of", "create image of", "draw an image of", 
    "draw a picture of", "draw image of", "paint an image of", 
    "generate a photo of", "create a photo of", "generate a picture of",
    "make an image of", "make a photo of", "make a picture of",
    "/image"
]

ASPECT_RATIOS = {
    "1:1": (1024, 1024),
    "16:9": (1280, 720),
    "9:16": (720, 1280),
    "4:3": (1024, 768),
    "3:4": (768, 1024)
}

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
    """Builds an image URL for preview."""
    encoded_prompt = urllib.parse.quote(prompt)
    return f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&seed={seed}&nologo=true"

def enrich_prompt_with_style(prompt: str, style: Optional[str] = None) -> str:
    """Enhances prompt based on visual style preset."""
    if not style or style == "natural":
        return prompt
    style_modifiers = {
        "photorealistic": "8k uhd, photorealistic, professional photography, Hasselblad medium format, highly detailed, dramatic lighting",
        "anime": "studio anime aesthetic, Makoto Shinkai style, vibrant colors, detailed line art, dynamic lighting, masterpiece",
        "cinematic": "cinematic still, 35mm film photography, anamorphic lens, volumetric lighting, depth of field, color graded, masterpiece",
        "digital_art": "digital concept art, trending on ArtStation, intricate detail, octane render, vivid atmosphere",
        "minimalist": "minimalist vector illustration, clean lines, elegant composition, muted pastel tones, flat design",
        "3d_render": "3D octane render, raytracing, subsurface scattering, ambient occlusion, polished textures, 4k"
    }
    modifier = style_modifiers.get(style.lower())
    if modifier:
        return f"{prompt}, {modifier}"
    return prompt

async def generate_imagen3(prompt: str, api_key: str, aspect_ratio: str = "1:1") -> Optional[bytes]:
    """Generates a photorealistic studio image via Google Imagen 3 API."""
    # Valid aspect ratios for Imagen 3: "1:1", "3:4", "4:3", "9:16", "16:9"
    ar = aspect_ratio if aspect_ratio in ["1:1", "3:4", "4:3", "9:16", "16:9"] else "1:1"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key={api_key}"
    payload = {
        "instances": [{"prompt": prompt}],
        "parameters": {
            "sampleCount": 1,
            "aspectRatio": ar,
            "personGeneration": "ALLOW_ADULT",
            "outputMimeType": "image/jpeg"
        }
    }
    async with httpx.AsyncClient(timeout=45.0) as client:
        resp = await client.post(url, json=payload)
        if resp.status_code == 200:
            data = resp.json()
            predictions = data.get("predictions", [])
            if predictions and "bytesBase64Encoded" in predictions[0]:
                return base64.b64decode(predictions[0]["bytesBase64Encoded"])
        else:
            print(f"Google Imagen 3 API status {resp.status_code}: {resp.text[:200]}")
    return None

async def generate_dalle3(prompt: str, api_key: str, aspect_ratio: str = "1:1") -> Optional[bytes]:
    """Generates an image via OpenAI DALL-E 3 API."""
    url = "https://api.openai.com/v1/images/generations"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    # DALL-E 3 supported sizes: 1024x1024, 1024x1792, 1792x1024
    if aspect_ratio == "16:9":
        size = "1792x1024"
    elif aspect_ratio == "9:16":
        size = "1024x1792"
    else:
        size = "1024x1024"

    payload = {
        "model": "dall-e-3",
        "prompt": prompt,
        "n": 1,
        "size": size,
        "response_format": "b64_json"
    }
    async with httpx.AsyncClient(timeout=50.0) as client:
        resp = await client.post(url, headers=headers, json=payload)
        if resp.status_code == 200:
            data = resp.json()
            items = data.get("data", [])
            if items and "b64_json" in items[0]:
                return base64.b64decode(items[0]["b64_json"])
            elif items and "url" in items[0]:
                img_resp = await client.get(items[0]["url"])
                if img_resp.status_code == 200:
                    return img_resp.content
        else:
            print(f"OpenAI DALL-E 3 error {resp.status_code}: {resp.text[:200]}")
    return None

async def generate_flux_image(
    prompt: str, 
    width: int = 1024, 
    height: int = 1024, 
    seed: int = 42, 
    model: str = "flux",
    negative_prompt: Optional[str] = None
) -> Optional[bytes]:
    """Generates high-definition FLUX.1 images via Pollinations / open endpoint."""
    encoded_prompt = urllib.parse.quote(prompt)
    model_param = model if model in ["flux", "flux-realism", "flux-anime", "flux-3d"] else "flux"
    url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&seed={seed}&model={model_param}&nologo=true"
    if negative_prompt:
        url += f"&negative={urllib.parse.quote(negative_prompt)}"
        
    async with httpx.AsyncClient(timeout=35.0) as client:
        resp = await client.get(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        if resp.status_code == 200 and len(resp.content) > 1000:
            return resp.content
    return None

async def download_and_cache_image(
    prompt: str, 
    static_dir: str, 
    width: int = 1024, 
    height: int = 1024, 
    seed: int = 42, 
    model: str = "flux",
    provider: str = "auto",
    api_key: Optional[str] = None,
    aspect_ratio: str = "1:1",
    style: Optional[str] = None,
    negative_prompt: Optional[str] = None
) -> Dict[str, Any]:
    """
    Multi-provider AI image generation pipeline supporting:
    - Google Imagen 3 (imagen-3.0-generate-002)
    - OpenAI DALL-E 3 (dall-e-3)
    - FLUX.1 Schnell & Dev (flux, flux-realism, flux-anime, flux-3d)
    """
    clean_prompt = extract_image_prompt(prompt) or prompt
    enriched_prompt = enrich_prompt_with_style(clean_prompt, style)
    
    # Calculate aspect ratio dimensions
    if aspect_ratio in ASPECT_RATIOS:
        width, height = ASPECT_RATIOS[aspect_ratio]

    output_dir = os.path.join(static_dir, "generated_images")
    os.makedirs(output_dir, exist_ok=True)
    img_filename = f"gen_{uuid.uuid4().hex[:10]}.jpg"
    local_img_path = os.path.join(output_dir, img_filename)
    relative_url = f"/generated_images/{img_filename}"
    
    image_bytes = None
    used_provider = "FLUX.1 Schnell"

    # Provider routing
    prov = (provider or "auto").lower().strip()
    
    # 1. Google Imagen 3
    if prov in ["imagen", "google"] or (prov == "auto" and api_key and (api_key.startswith("AIza") or len(api_key) == 39)):
        try:
            image_bytes = await generate_imagen3(enriched_prompt, api_key=api_key, aspect_ratio=aspect_ratio)
            if image_bytes:
                used_provider = "Google Imagen 3"
        except Exception as ge:
            print(f"Google Imagen 3 attempt failed, falling back to FLUX.1: {ge}")

    # 2. OpenAI DALL-E 3
    elif prov in ["openai", "dalle", "dalle-3"] or (prov == "auto" and api_key and api_key.startswith("sk-")):
        try:
            image_bytes = await generate_dalle3(enriched_prompt, api_key=api_key, aspect_ratio=aspect_ratio)
            if image_bytes:
                used_provider = "OpenAI DALL-E 3"
        except Exception as oe:
            print(f"OpenAI DALL-E 3 attempt failed, falling back to FLUX.1: {oe}")

    # 3. FLUX.1 (Default or fallback)
    if not image_bytes:
        try:
            flux_model = model if model in ["flux", "flux-realism", "flux-anime", "flux-3d"] else "flux"
            image_bytes = await generate_flux_image(
                prompt=enriched_prompt,
                width=width,
                height=height,
                seed=seed,
                model=flux_model,
                negative_prompt=negative_prompt
            )
            used_provider = f"FLUX.1 ({flux_model})"
        except Exception as fe:
            print(f"FLUX.1 generation error: {fe}")

    # Save to local storage
    if image_bytes:
        with open(local_img_path, "wb") as f:
            f.write(image_bytes)
        return {
            "status": "success",
            "imageUrl": relative_url,
            "filename": img_filename,
            "provider": used_provider,
            "prompt": clean_prompt,
            "width": width,
            "height": height,
            "aspectRatio": aspect_ratio,
            "style": style or "natural"
        }
    else:
        # Fallback to direct URL if file writing failed
        encoded_prompt = urllib.parse.quote(enriched_prompt)
        direct_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&seed={seed}&nologo=true"
        return {
            "status": "success",
            "imageUrl": direct_url,
            "filename": "external",
            "provider": "FLUX.1 (Direct Stream)",
            "prompt": clean_prompt,
            "width": width,
            "height": height,
            "aspectRatio": aspect_ratio
        }
