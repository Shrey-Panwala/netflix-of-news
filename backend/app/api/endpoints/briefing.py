import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from typing import Optional
from datetime import datetime, timezone

from app.db.session import get_db
from app.db.models.article import Article
from app.db.models.user import User
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


async def _generate_briefing_llm(user_name: str, preferences: list, articles: list, market_data: dict = None):
    """Use Groq LLM to generate a personalized morning briefing."""
    try:
        if not settings.GROQ_API_KEY:
            return None

        from langchain_groq import ChatGroq
        from langchain_core.messages import HumanMessage, SystemMessage

        llm = ChatGroq(
            model="llama-3.1-8b-instant",
            temperature=0.4,
            api_key=settings.GROQ_API_KEY,
        )

        interests_str = ", ".join(preferences) if preferences else "general news"
        
        # Build article summaries
        article_summaries = []
        for a in articles[:10]:
            cat = a.category or "General"
            article_summaries.append(f"[{cat}] {a.title} ({a.source})")
        articles_text = "\n".join(article_summaries)

        system = SystemMessage(content=(
            "You are a personal news concierge. Generate a brief, warm, personalized morning briefing. "
            "Write in 2nd person ('you'). Be conversational but informative. "
            "Structure your response as JSON with these exact keys:\n"
            '{"greeting": "1 line warm greeting with name", '
            '"market_summary": "1-2 sentences on market trends", '
            '"top_themes": ["theme1", "theme2", "theme3"], '
            '"interest_matches": "1-2 sentences about news matching their specific interests", '
            '"actionable_insight": "1 sentence practical advice", '
            '"surprise_pick": "1 sentence about an interesting story outside their usual interests"}\n'
            "Output ONLY valid JSON. No markdown backticks."
        ))

        human = HumanMessage(content=(
            f"User: {user_name}\n"
            f"Interests: {interests_str}\n"
            f"Today's date: {datetime.now().strftime('%A, %B %d, %Y')}\n"
            f"Latest headlines:\n{articles_text}"
        ))

        response = await llm.ainvoke([system, human])
        
        import json
        # Strip markdown code fences if present
        raw = response.content.strip()
        if raw.startswith("```json"):
            raw = raw[7:]
        if raw.startswith("```"):
            raw = raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        
        return json.loads(raw.strip())
    except Exception as e:
        logger.error(f"Briefing LLM error: {e}")
        return None


@router.get("/daily")
async def get_daily_briefing(
    user_id: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    """Generate a personalized daily briefing for the user."""
    user_name = "there"
    preferences = []

    if user_id:
        stmt = select(User).where(User.id == user_id)
        result = await db.execute(stmt)
        user = result.scalar_one_or_none()
        if user:
            user_name = user.full_name or user.email.split("@")[0]
            preferences = user.preferences or []

    # Get today's articles
    stmt = select(Article).order_by(Article.published_at.desc()).limit(15)
    result = await db.execute(stmt)
    articles = result.scalars().all()

    # Count articles matching user interests
    interest_matches = 0
    interest_keywords = {p.lower() for p in preferences}
    matched_categories = set()
    for a in articles:
        text = f"{a.category or ''} {a.title or ''} {a.source or ''}".lower()
        for keyword in interest_keywords:
            if keyword in text:
                interest_matches += 1
                matched_categories.add(a.category or "General")
                break

    # Get unique categories and sources
    categories = list(set(a.category or "General" for a in articles))
    sources = list(set(a.source or "Unknown" for a in articles))

    # Try LLM briefing
    llm_briefing = await _generate_briefing_llm(user_name, preferences, articles)

    if llm_briefing:
        return {
            "status": "personalized",
            "user_name": user_name,
            "preferences": preferences,
            **llm_briefing,
            "stats": {
                "total_articles": len(articles),
                "interest_matches": interest_matches,
                "matched_categories": list(matched_categories),
                "categories_covered": categories[:6],
                "top_sources": sources[:4]
            }
        }

    # Fallback briefing without LLM
    time_of_day = "morning" if datetime.now().hour < 12 else "afternoon" if datetime.now().hour < 17 else "evening"
    
    return {
        "status": "generated",
        "user_name": user_name,
        "preferences": preferences,
        "greeting": f"Good {time_of_day}, {user_name}!",
        "market_summary": f"{len(articles)} live stories across {len(categories)} categories. Your personalized AI newsfeed is ready.",
        "top_themes": categories[:3],
        "interest_matches": f"{interest_matches} stories match your interests in {', '.join(list(matched_categories)[:3]) or 'various topics'}." if interest_matches > 0 else "Sync news to see stories matching your interests.",
        "actionable_insight": "Hit 'Sync News' to get the latest stories from multiple sources.",
        "surprise_pick": articles[0].title if articles else "No stories yet — try syncing!",
        "stats": {
            "total_articles": len(articles),
            "interest_matches": interest_matches,
            "matched_categories": list(matched_categories),
            "categories_covered": categories[:6],
            "top_sources": sources[:4]
        }
    }
