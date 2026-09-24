from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class Message(BaseModel):
    role: str
    content: str

class ImageGenRequest(BaseModel):
    prompt: str
    width: Optional[int] = 1024
    height: Optional[int] = 1024
    seed: Optional[int] = 42
    model: Optional[str] = "flux"
    provider: Optional[str] = "auto"
    apiKey: Optional[str] = None
    aspectRatio: Optional[str] = "1:1"
    style: Optional[str] = None
    negativePrompt: Optional[str] = None

class DiagramGenRequest(BaseModel):
    prompt: str
    diagramType: Optional[str] = "flowchart"

class VideoGenRequest(BaseModel):
    prompt: str
    duration: Optional[int] = 4
    fps: Optional[int] = 24
    aspectRatio: Optional[str] = "16:9"
    motionStyle: Optional[str] = "cinematic_zoom"
    title: Optional[str] = None
    provider: Optional[str] = "auto"
    apiKey: Optional[str] = None
    negativePrompt: Optional[str] = None

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
    hyde: Optional[bool] = False
    deepResearch: Optional[bool] = False

    @property
    def chatModel(self) -> Optional[str]:
        return self.genModel

class ConversationCreate(BaseModel):
    title: str

class ProfileMemoryCreate(BaseModel):
    fact: str
    provider: Optional[str] = "gemini"
    apiKey: Optional[str] = None
    ollamaUrl: Optional[str] = None
    embedModel: Optional[str] = None

class ProfileMemoryUpdate(BaseModel):
    fact: str
    provider: Optional[str] = "gemini"
    apiKey: Optional[str] = None
    ollamaUrl: Optional[str] = None
    embedModel: Optional[str] = None

class SkillCreate(BaseModel):
    name: str
    description: str
    content: str
    provider: Optional[str] = "gemini"
    apiKey: Optional[str] = None
    ollamaUrl: Optional[str] = None
    embedModel: Optional[str] = None

class SkillUpdate(BaseModel):
    name: str
    description: str
    content: str
    provider: Optional[str] = "gemini"
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

class ConsolidateRequest(BaseModel):
    provider: str
    apiKey: Optional[str] = None
    ollamaUrl: Optional[str] = None
    embedModel: Optional[str] = None
    genModel: Optional[str] = None

class SandboxRequest(BaseModel):
    language: str
    code: str

class CodeRunRequest(BaseModel):
    code: str
    language: str

class LcsDiffRequest(BaseModel):
    filePath: str
    newContent: str

class LcsDiffApplyRequest(BaseModel):
    filePath: str
    content: str

class UrlIngestRequest(BaseModel):
    url: str
    provider: Optional[str] = "gemini"
    apiKey: Optional[str] = None
    ollamaUrl: Optional[str] = None
    embedModel: Optional[str] = None
