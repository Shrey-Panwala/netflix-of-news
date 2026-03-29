from fastapi import APIRouter, HTTPException, Depends
from typing import Dict, Any
from pydantic import BaseModel
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.db.models.article import Article
from app.agents.translator import TranslatorAgent

router = APIRouter()
translator_agent = TranslatorAgent()

class VernacularRequest(BaseModel):
    language: str = "Hindi"
    reading_level: str = "Beginner"

@router.post("/{article_id}/vernacular")
async def adapt_article_vernacular(article_id: int, request: VernacularRequest, db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Translate and simplify a specific article (vernacular route)."""
    return await _do_adapt(article_id, request, db)

@router.post("/{article_id}")
async def adapt_article(article_id: int, request: VernacularRequest, db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Translate and simplify a specific article (legacy route)."""
    return await _do_adapt(article_id, request, db)

async def _do_adapt(article_id: int, request: VernacularRequest, db: AsyncSession) -> Dict[str, Any]:
    result = await db.execute(select(Article).where(Article.id == article_id))
    article = result.scalar_one_or_none()
    
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
        
    content_to_adapt = article.content or article.tldr or article.title or "No content available."
    adapted_text = await translator_agent.adapt_news(
        content=content_to_adapt,
        language=request.language,
        reading_level=request.reading_level
    )
    
    return {
        "status": "success",
        "article_id": article_id,
        "language": request.language,
        "reading_level": request.reading_level,
        "translated_content": adapted_text,
        "adapted_content": adapted_text
    }
