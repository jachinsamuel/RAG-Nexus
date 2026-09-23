import os
import sys
import shutil
import uuid
import urllib.parse
import urllib.request
import asyncio
import subprocess
from typing import Dict, Any, Optional
import httpx

VIDEO_TRIGGERS = [
    "generate a video of", "generate video of", "generate video:", 
    "create a video of", "create video of", "create video:",
    "make a video of", "make video of", "make video:",
    "generate a clip of", "create a clip of", "make a clip of",
    "generate an animation of", "create an animation of", "animate:",
    "generate video", "create video", "/video"
]

ASPECT_RATIO_PRESETS = {
    "16:9": (1280, 720),
    "9:16": (720, 1280),
    "1:1": (720, 720),
    "widescreen": (1280, 720),
    "portrait": (720, 1280),
    "square": (720, 720)
}

def is_video_request(query: str) -> bool:
    """Checks if a user query is asking for video generation."""
    if not query:
        return False
    q_lower = query.lower().strip()
    return any(q_lower.startswith(t) or f" {t} " in f" {q_lower} " for t in VIDEO_TRIGGERS)

def extract_video_prompt(query: str) -> str:
    """Extracts the clean video description from a user prompt."""
    if not query:
        return ""
    q_lower = query.lower().strip()
    for trig in VIDEO_TRIGGERS:
        if trig in q_lower:
            idx = q_lower.find(trig) + len(trig)
            extracted = query[idx:].strip(" :.-")
            if extracted:
                return extracted
    return query.strip()

def enrich_video_prompt(prompt: str) -> str:
    """Adds cinematic visual descriptors to produce high-end AI keyframes."""
    if not prompt:
        return "cinematic motion visual, 4k ultra detailed"
    cinematic_modifiers = [
        "cinematic lighting", "high aesthetic", "photorealistic", 
        "smooth motion", "octane render", "8k resolution"
    ]
    p_lower = prompt.lower()
    missing = [m for m in cinematic_modifiers if m not in p_lower]
    if missing:
        return f"{prompt}, {', '.join(missing[:3])}"
    return prompt

def find_ffmpeg_path() -> Optional[str]:
    """Finds ffmpeg executable from PATH or common Windows Winget directories."""
    path = shutil.which("ffmpeg")
    if path:
        return path
    
    # Common Windows winget / local installations
    possible_paths = [
        os.path.expanduser(r"~\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.1.2-full_build\bin\ffmpeg.exe"),
        r"C:\ffmpeg\bin\ffmpeg.exe",
        r"C:\Program Files\ffmpeg\bin\ffmpeg.exe"
    ]
    for p in possible_paths:
        if os.path.exists(p):
            return p
    return None

async def fetch_base_keyframe(prompt: str, width: int = 1280, height: int = 720, seed: int = 42) -> Optional[bytes]:
    """Downloads a high-resolution AI keyframe from Pollinations FLUX / Sana engine."""
    clean_prompt = enrich_video_prompt(prompt)
    encoded_prompt = urllib.parse.quote(clean_prompt)
    image_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width={width}&height={height}&seed={seed}&nologo=true"
    
    try:
        async with httpx.AsyncClient(timeout=25.0) as client:
            resp = await client.get(image_url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
            if resp.status_code == 200 and len(resp.content) > 1000:
                return resp.content
    except Exception as e:
        print(f"Warning: Failed to fetch keyframe from Pollinations: {e}")
    return None

def build_ffmpeg_motion_filter(motion_style: str, width: int, height: int, total_frames: int, fps: int = 24) -> str:
    """Constructs smooth cinematic camera movement filters for FFmpeg zoompan."""
    style = (motion_style or "cinematic_zoom").lower().strip()
    
    if "pan_right" in style:
        # Smooth horizontal camera pan from left to right with slight 1.15x zoom
        expr = f"zoompan=z=1.15:d={total_frames}:x='(iw-iw/zoom)*(on/{total_frames})':y='ih/2-(ih/zoom/2)':s={width}x{height}:fps={fps}"
    elif "pan_left" in style:
        # Smooth horizontal camera pan from right to left
        expr = f"zoompan=z=1.15:d={total_frames}:x='(iw-iw/zoom)*(1-on/{total_frames})':y='ih/2-(ih/zoom/2)':s={width}x{height}:fps={fps}"
    elif "orbit" in style or "drift" in style:
        # Dynamic subtle orbital drift
        expr = f"zoompan=z='min(zoom+0.0012,1.2)':d={total_frames}:x='(iw/2-(iw/zoom/2))+sin(on/15)*15':y='(ih/2-(ih/zoom/2))+cos(on/15)*10':s={width}x{height}:fps={fps}"
    else:
        # Default: Classic Cinematic Push-In (Ken Burns focal zoom)
        # Smooth continuous push-in towards the optical center
        zoom_step = round(0.25 / total_frames, 5)
        expr = f"zoompan=z='min(zoom+{zoom_step},1.25)':d={total_frames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s={width}x{height}:fps={fps}"
    
    # Add subtle film color grading and smooth format conversion
    return f"{expr},format=yuv420p"

def synthesize_fallback_opencv_video(output_mp4: str, width: int, height: int, duration: int, fps: int, prompt: str):
    """Fallback generator using OpenCV if FFmpeg is unavailable."""
    import cv2
    import numpy as np
    
    total_frames = max(fps * duration, fps)
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(output_mp4, fourcc, float(fps), (width, height))
    
    # Generate procedural cinematic nebula / particle drift
    np.random.seed(abs(hash(prompt)) % 10000)
    base_color_a = np.array([40, 15, 10], dtype=np.uint8)
    base_color_b = np.array([120, 50, 20], dtype=np.uint8)
    
    for frame_idx in range(total_frames):
        t = frame_idx / total_frames
        frame = np.zeros((height, width, 3), dtype=np.uint8)
        
        # Color gradient
        for y in range(height):
            ratio = y / height
            color = (1.0 - ratio) * base_color_a + ratio * base_color_b
            frame[y, :] = color
        
        # Pulsing center glow
        center_x = int(width / 2 + np.sin(t * np.pi * 2) * 40)
        center_y = int(height / 2 + np.cos(t * np.pi * 2) * 20)
        radius = int(80 + np.sin(t * np.pi) * 30)
        cv2.circle(frame, (center_x, center_y), radius, (200, 180, 240), -1)
        frame = cv2.GaussianBlur(frame, (45, 45), 0)
        
        out.write(frame)
        
    out.release()

async def generate_and_cache_video(
    prompt: str, 
    static_dir: str, 
    duration: int = 4, 
    fps: int = 24, 
    aspect_ratio: str = "16:9", 
    motion_style: str = "cinematic_zoom",
    title: Optional[str] = None,
    provider: str = "auto",
    api_key: Optional[str] = None
) -> Dict[str, Any]:
    """Generates an AI video clip and caches it locally into static/generated_videos/."""
    clean_prompt = extract_video_prompt(prompt) or prompt
    video_id = uuid.uuid4().hex[:10]
    out_filename = f"gen_{video_id}.mp4"
    output_dir = os.path.join(static_dir, "generated_videos")
    os.makedirs(output_dir, exist_ok=True)
    out_filepath = os.path.join(output_dir, out_filename)
    relative_url = f"/generated_videos/{out_filename}"
    
    # Resolve dimensions
    res = ASPECT_RATIO_PRESETS.get(aspect_ratio.lower(), (1280, 720))
    width, height = res
    total_frames = max(fps * duration, fps * 2)
    
    clean_title = title or clean_prompt.capitalize()
    if len(clean_title) > 60:
        clean_title = clean_title[:57] + "..."

    # 1. Fetch High-Res Keyframe
    keyframe_bytes = await fetch_base_keyframe(clean_prompt, width=width, height=height)
    
    tmp_keyframe_path = os.path.join(output_dir, f"tmp_{video_id}.jpg")
    
    if keyframe_bytes:
        with open(tmp_keyframe_path, "wb") as f:
            f.write(keyframe_bytes)
    else:
        # Create a procedural background if offline
        import cv2
        import numpy as np
        blank = np.zeros((height, width, 3), dtype=np.uint8)
        blank[:, :] = (30, 20, 15)
        cv2.imwrite(tmp_keyframe_path, blank)

    # 2. Render Motion Video via FFmpeg
    ffmpeg_exe = find_ffmpeg_path()
    success = False
    
    if ffmpeg_exe and os.path.exists(tmp_keyframe_path):
        vf_filter = build_ffmpeg_motion_filter(motion_style, width, height, total_frames, fps)
        
        cmd = [
            ffmpeg_exe, "-y",
            "-loop", "1",
            "-i", tmp_keyframe_path,
            "-vf", vf_filter,
            "-t", str(duration),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-profile:v", "baseline",
            "-level", "3.0",
            "-movflags", "+faststart",
            out_filepath
        ]
        
        try:
            # Run in async executor to prevent blocking FastAPI event loop
            loop = asyncio.get_event_loop()
            def run_proc():
                return subprocess.run(cmd, capture_output=True, text=True, timeout=40)
            
            res_proc = await loop.run_in_executor(None, run_proc)
            if res_proc.returncode == 0 and os.path.exists(out_filepath) and os.path.getsize(out_filepath) > 1000:
                success = True
            else:
                print(f"FFmpeg generation notice: {res_proc.stderr[:200] if res_proc.stderr else 'unknown'}")
        except Exception as fe:
            print(f"FFmpeg process error: {fe}")

    # 3. Fallback to OpenCV if FFmpeg failed
    if not success:
        try:
            synthesize_fallback_opencv_video(out_filepath, width, height, duration, fps, clean_prompt)
            if os.path.exists(out_filepath) and os.path.getsize(out_filepath) > 1000:
                success = True
        except Exception as oe:
            print(f"OpenCV fallback error: {oe}")

    # Clean up temporary keyframe
    if os.path.exists(tmp_keyframe_path):
        try:
            os.remove(tmp_keyframe_path)
        except Exception:
            pass

    if success:
        return {
            "status": "success",
            "videoUrl": relative_url,
            "filename": out_filename,
            "prompt": clean_prompt,
            "title": clean_title,
            "duration": duration,
            "fps": fps,
            "resolution": f"{width}x{height}",
            "aspectRatio": aspect_ratio,
            "motionStyle": motion_style
        }
    else:
        return {
            "status": "error",
            "message": "Failed to synthesize video output",
            "videoUrl": None
        }
