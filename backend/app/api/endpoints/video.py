from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import Dict, Any, Optional
import os

from app.db.session import get_db
from app.db.models.article import Article
from app.agents.video_agent import VideoGenerationAgent

router = APIRouter()
video_agent = VideoGenerationAgent()

from pydantic import BaseModel

class VideoRequest(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    article_id: Optional[int] = None


async def _resolve_video_input(request: VideoRequest, db: AsyncSession) -> tuple[str, str]:
    """Resolve title/content from request payload or a live article id."""
    if request.article_id is not None:
        result = await db.execute(select(Article).where(Article.id == request.article_id))
        article = result.scalar_one_or_none()
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")

        title = (request.title or article.title or "Untitled Story").strip()
        content = (request.content or article.content or article.tldr or article.title or title).strip()
        return title, content

    if not (request.title or "").strip():
        raise HTTPException(status_code=400, detail="title is required when article_id is not provided")

    title = request.title.strip()
    content = (request.content or title).strip()
    return title, content

@router.post("/generate")
async def generate_article_video(request: VideoRequest, db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Generate a viral script and Text-to-Speech audio from custom text or an article payload."""
    title, content = await _resolve_video_input(request, db)
    
    # Generate video assets (synchronously for script and audio MVP)
    result_data = await video_agent.create_news_video(
        title=title,
        content=content[:3000] # safety limit
    )
    
    return {
        "status": "success",
        "video_assets": result_data
    }

@router.post("/compile")
async def compile_long_video(request: VideoRequest, db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Trigger the heavy Wan2.1 multi-scene 60-second generation in the background."""
    from app.worker import generate_viral_video_task
    title, content = await _resolve_video_input(request, db)
    
    # 1. Generate a lightweight script + TTS preview synchronously
    result_data = await video_agent.create_script_audio_preview(
        title=title,
        content=content[:3000]
    )

    if result_data.get("error"):
        raise HTTPException(status_code=500, detail=result_data["error"])
    
    audio_url = result_data.get("audio_url", "")
    backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    audio_path = audio_url
    if isinstance(audio_url, str) and audio_url.startswith("/static/"):
        # Convert public URL (/static/audio/foo.mp3) into local filesystem path for worker access.
        audio_path = os.path.join(backend_root, audio_url.lstrip("/").replace("/", os.sep))

    # 2. Push the video creation logic to Celery
    task = generate_viral_video_task.delay(
        title=title,
        script=result_data["script"],
        audio_path=audio_path,
    )
    
    return {
        "status": "processing",
        "task_id": task.id,
        "message": "The 60-second viral video compilation has started. This will take significant time depending on your GPU.",
        "assets_preview": result_data
    }
