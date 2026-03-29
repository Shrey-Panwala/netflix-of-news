from fastapi import APIRouter, HTTPException
from typing import Dict, Any
import json, logging
from app.agents.story_arc import StoryArcAgent

logger = logging.getLogger(__name__)
router = APIRouter()
arc_agent = StoryArcAgent()

@router.get("/{topic}")
async def get_story_arc(topic: str) -> Dict[str, Any]:
    """Retrieve rich chronological timeline and sentiment for an ongoing news arc."""
    
    try:
        result = await arc_agent.build_arc(topic)
    except Exception as e:
        logger.error(f"Arc agent error: {e}")
        result = {}

    if "error" in result and not result.get("timeline"):
        return {
            "timeline": [],
            "overall_sentiment": "Neutral",
            "sentiment_explanation": result["error"],
            "key_players": [],
            "prediction": "Sync more news articles to get better analysis.",
            "market_impact": "No data available."
        }
    
    # Normalize timeline events for frontend
    raw_timeline = result.get("timeline", [])
    normalized_timeline = []
    for ev in raw_timeline:
        normalized_timeline.append({
            "date": ev.get("date", ev.get("time", "Recent")),
            "title": ev.get("title", ev.get("event_title", ev.get("headline", "Update"))),
            "description": ev.get("description", ev.get("summary", ev.get("details", ""))),
            "sentiment": ev.get("sentiment", "Neutral"),
            "impact": ev.get("impact", "Medium"),
        })

    # Normalize sentiment
    sentiment_obj = result.get("overall_sentiment", result.get("sentiment_trend", "Neutral"))
    if isinstance(sentiment_obj, dict):
        overall = sentiment_obj.get("trend", sentiment_obj.get("sentiment", "Neutral"))
    else:
        overall = str(sentiment_obj)

    return {
        "timeline": normalized_timeline,
        "overall_sentiment": overall,
        "sentiment_explanation": result.get("sentiment_explanation", ""),
        "key_players": result.get("key_players", []),
        "prediction": result.get("predictions", result.get("prediction", "")),
        "market_impact": result.get("market_impact", ""),
    }
