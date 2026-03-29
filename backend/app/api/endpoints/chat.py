from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from app.agents.chat import ConversationalNewsAgent

router = APIRouter()
chat_agent = ConversationalNewsAgent()

class ChatRequest(BaseModel):
    query: str
    session_id: Optional[str] = "default"
    user_id: Optional[int] = None
    message: Optional[str] = None
    user_preferences: Optional[List[str]] = None

class SourceDetail(BaseModel):
    source: str
    title: str
    article_id: str

class ChatResponse(BaseModel):
    response: str
    sources: List[str]
    source_details: List[SourceDetail] = []
    confidence: int = 0
    reasoning: str = ""
    intent: str = "general"

@router.post("/", response_model=ChatResponse)
async def chat_with_news(request: ChatRequest):
    """
    Interact with the News AI. Uses Router Agent for intent detection,
    RAG for grounded answers, and Trust Layer for confidence + citations.
    Now accepts user_preferences for personalized responses.
    """
    question = request.query or request.message or ""
    user_id = request.user_id or hash(request.session_id or "default") % 10000

    if not question.strip():
        raise HTTPException(status_code=400, detail="Query is empty.")

    try:
        result = await chat_agent.ask_question(
            user_id=user_id,
            question=question,
            user_preferences=request.user_preferences
        )
        return ChatResponse(
            response=result.get("answer", ""),
            sources=result.get("sources", []),
            source_details=[
                SourceDetail(**s) for s in result.get("source_details", [])
            ],
            confidence=result.get("confidence", 0),
            reasoning=result.get("reasoning", ""),
            intent=result.get("intent", "general")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/memory/{user_id}")
async def clear_chat_memory(user_id: int):
    """Clear conversational history for a user."""
    chat_agent.reset_memory(user_id)
    return {"status": "success", "message": "Memory cleared."}
