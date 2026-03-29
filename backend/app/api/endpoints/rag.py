from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.agents.rag_engine import RAGEngine
from pydantic import BaseModel
from typing import List, Any, Dict

router = APIRouter()

class SearchQuery(BaseModel):
    query: str
    limit: int = 5

class SearchResult(BaseModel):
    content: str
    metadata: Dict[str, Any]

@router.post("/search", response_model=List[SearchResult])
async def search_news(
    query_obj: SearchQuery,
    db: AsyncSession = Depends(get_db)
):
    """
    Perform semantic search across vectorized news articles.
    Returns the most contextually relevant chunks and summaries.
    """
    rag_engine = RAGEngine()
    
    try:
        results = rag_engine.semantic_search(query=query_obj.query, k=query_obj.limit)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
