from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Dict, Any, Optional

from app.db.session import get_db
from app.db.models.article import Article
from app.agents.video_agent import VideoGenerationAgent

router = APIRouter()
video_agent = VideoGenerationAgent()

from pydantic import BaseModel

class VideoRequest(BaseModel):
    title: str
    content: str
    article_id: Optional[int] = None

@router.post("/generate")
async def generate_article_video(request: VideoRequest) -> Dict[str, Any]:
    """Generate a viral script and Text-to-Speech audio from custom text or an article payload."""
    
    # Generate video assets (synchronously for script and audio MVP)
    result_data = await video_agent.create_news_video(
        title=request.title, 
        content=request.content[:3000] # safety limit
    )
    
    return {
        "status": "success",
        "video_assets": result_data
    }

@router.post("/compile")
async def compile_long_video(request: VideoRequest) -> Dict[str, Any]:
    """Trigger the heavy Wan2.1 multi-scene 60-second generation in the background."""
    from app.worker import generate_viral_video_task
    
    # 1. Generate the initial script and TTS audio synchronously
    result_data = await video_agent.create_news_video(
        title=request.title, 
        content=request.content[:3000]
    )
    
    # 2. Push the video creation logic to Celery
    task = generate_viral_video_task.delay(
        title=request.title,
        script=result_data["script"],
        audio_path=result_data["audio_url"]
    )
    
    return {
        "status": "processing",
        "task_id": task.id,
        "message": "The 60-second viral video compilation has started. This will take significant time depending on your GPU.",
        "assets_preview": result_data
    }
