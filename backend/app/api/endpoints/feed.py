from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.db.session import get_db
from app.db.models.article import Article
from app.db.models.user import User
from app.agents.personalization import PersonalizationAgent
from pydantic import BaseModel
from typing import List, Optional
import random
import re

router = APIRouter()

# Map user interest labels to keyword patterns for matching
INTEREST_KEYWORD_MAP = {
    'Markets': ['market', 'stock', 'sensex', 'nifty', 'equity', 'ipo', 'trading', 'bse', 'nse', 'share', 'bull', 'bear', 'rally', 'fii'],
    'AI & Tech': ['ai', 'artificial intelligence', 'tech', 'technology', 'software', 'digital', 'startup', 'machine learning', 'data', 'cloud', 'cyber'],
    'Startups': ['startup', 'founder', 'venture', 'funding', 'unicorn', 'seed', 'series'],
    'Crypto': ['crypto', 'bitcoin', 'ethereum', 'blockchain', 'defi', 'web3', 'nft'],
    'Sports': ['sport', 'cricket', 'ipl', 'football', 'tennis', 'olympics', 'match', 'tournament'],
    'Politics': ['politic', 'government', 'minister', 'parliament', 'election', 'policy', 'bjp', 'congress', 'modi'],
    'Business': ['business', 'corporate', 'company', 'ceo', 'merger', 'acquisition', 'industry', 'profit', 'revenue'],
    'Health': ['health', 'medical', 'hospital', 'disease', 'vaccine', 'pharma', 'wellness', 'doctor'],
    'Science': ['science', 'research', 'space', 'isro', 'nasa', 'discovery', 'innovation', 'quantum'],
    'Entertainment': ['entertainment', 'bollywood', 'movie', 'film', 'celebrity', 'music', 'ott', 'netflix'],
    'IPO & Equity': ['ipo', 'equity', 'listing', 'share', 'demat', 'sebi', 'mutual fund'],
    'Gold & Commodities': ['gold', 'silver', 'commodity', 'metal', 'crude', 'oil', 'copper'],
    'Global Trade': ['trade', 'export', 'import', 'tariff', 'wto', 'global', 'international', 'foreign'],
}


def _compute_relevance_score(article, user_preferences):
    """Compute a 0-100 relevance score based on how well the article matches user interests."""
    if not user_preferences:
        return 50  # Neutral score

    category_text = (article.category or "").lower()
    title_text = (article.title or "").lower()
    content_text = (article.content or "").lower()
    source_text = (article.source or "").lower()
    text = f"{category_text} {title_text} {content_text} {source_text}"

    total_matches = 0
    weighted_score = 0.0

    for pref in user_preferences:
        keywords = INTEREST_KEYWORD_MAP.get(pref, [pref.lower()])
        best_weight = 0
        for kw in keywords:
            if kw in category_text:
                best_weight = max(best_weight, 3)
            elif kw in title_text:
                best_weight = max(best_weight, 2)
            elif kw in content_text or kw in source_text:
                best_weight = max(best_weight, 1)
        if best_weight > 0:
            total_matches += 1
            weighted_score += best_weight

    if total_matches == 0:
        return 10

    # Coverage rewards how many interests were represented, weighted rewards stronger placements.
    coverage = total_matches / max(len(user_preferences), 1)
    score = min(20 + (coverage * 45) + (weighted_score * 8), 98)
    return score


def _article_preview(article: Article) -> str:
    if article.tldr:
        return article.tldr
    if article.content:
        return article.content[:240]
    return article.title


async def _fetch_visible_articles(
    db: AsyncSession,
    limit: int,
    category: Optional[str] = None,
) -> List[Article]:
    """Fetch summarized stories first, then backfill with the latest raw stories so the UI never appears empty."""
    filters = []
    if category and category.lower() not in ("all", "latest"):
        filters.append(func.lower(Article.category) == category.lower())

    stmt_summarized = select(Article).where(Article.is_summarized == True, *filters).order_by(Article.published_at.desc()).limit(limit)
    result_summarized = await db.execute(stmt_summarized)
    summarized_articles = result_summarized.scalars().all()

    if len(summarized_articles) >= limit:
        return summarized_articles

    exclude_ids = [article.id for article in summarized_articles]
    stmt_latest = select(Article).where(*filters)
    if exclude_ids:
        stmt_latest = stmt_latest.where(Article.id.notin_(exclude_ids))

    remaining = max(limit - len(summarized_articles), 0)
    stmt_latest = stmt_latest.order_by(Article.published_at.desc()).limit(remaining)
    result_latest = await db.execute(stmt_latest)
    latest_articles = result_latest.scalars().all()

    return summarized_articles + latest_articles


class PersonalizedArticleResponse(BaseModel):
    id: int
    title: str
    url: str
    source: str
    category: Optional[str] = None
    published_at: Optional[str] = None
    tldr: Optional[str] = None
    key_points: Optional[List[str]] = None
    why_for_you: Optional[str] = None

@router.get("/user/{user_id}", response_model=List[PersonalizedArticleResponse])
async def get_personalized_feed(
    user_id: int,
    limit: int = 10,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a personalized news feed for a specific user.
    """
    stmt_user = select(User).where(User.id == user_id)
    result_user = await db.execute(stmt_user)
    user = result_user.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    interests = user.preferences or []

    articles = await _fetch_visible_articles(db, limit=limit)

    agent = PersonalizationAgent()
    feed = []
    
    for article in articles:
        personalization = await agent.personalize_news(interests, article)
        
        feed.append(PersonalizedArticleResponse(
            id=article.id,
            title=article.title,
            url=article.url,
            source=article.source,
            category=article.category,
            published_at=str(article.published_at) if article.published_at else None,
            tldr=personalization.get("personalized_tldr", _article_preview(article)),
            key_points=article.key_points,
            why_for_you=personalization.get("why_for_you")
        ))
        
    return feed


@router.get("/personalized")
async def get_public_feed(
    limit: int = 20,
    category: Optional[str] = Query(None, description="Filter by category"),
    user_id: Optional[int] = Query(None, description="User ID for personalized ranking"),
    db: AsyncSession = Depends(get_db)
):
    """
    Public feed endpoint — returns latest articles, ranked by user preferences.
    When user_id is provided, articles are scored by relevance to user interests.
    Includes 'surprise' articles from unrelated categories to break filter bubbles.
    """
    # Look up user preferences if user_id provided
    user_preferences = []
    if user_id:
        stmt_user = select(User).where(User.id == user_id)
        result_user = await db.execute(stmt_user)
        user = result_user.scalar_one_or_none()
        if user:
            user_preferences = user.preferences or []

    # Personalization quality improves when we rerank a broader candidate window.
    candidate_limit = limit
    if user_preferences:
        candidate_limit = max(limit * 5, 80)
    articles = await _fetch_visible_articles(db, limit=candidate_limit, category=category)

    # Build response with relevance scoring
    response_articles = []
    for a in articles:
        relevance = _compute_relevance_score(a, user_preferences) if user_preferences else 50
        
        response_articles.append({
            "id": a.id,
            "title": a.title,
            "url": a.url,
            "source": a.source or "Unknown",
            "category": a.category or "General",
            "published_at": str(a.published_at) if a.published_at else None,
            "content": a.content[:400] if a.content else "",
            "tldr": _article_preview(a),
            "relevance_score": relevance,
            "is_surprise": False,
            "is_summarized": bool(a.is_summarized),
        })

    # Sort by relevance score (personalized ranking), keeping recency as tiebreaker
    if user_preferences:
        response_articles.sort(key=lambda x: (x["relevance_score"], x.get("published_at", "") or ""), reverse=True)
        
        # Inject "surprise" articles: pick 2-3 low-relevance articles and scatter them
        low_relevance = [a for a in response_articles if a["relevance_score"] < 30]
        surprise_count = min(3, len(low_relevance))
        if surprise_count > 0:
            surprises = random.sample(low_relevance, surprise_count)
            for s in surprises:
                s["is_surprise"] = True

        # Dynamically adapt TLDR for top 3 "FOR YOU" articles using Persona Agent
        import asyncio
        from app.agents.personalization import PersonalizationAgent
        
        agent = PersonalizationAgent()
        
        async def personalize_item(item):
            # Pass a mock article object
            class MockArt:
                tldr = item["tldr"]
                key_points = []
                why_it_matters = item["content"]
            
            res = await agent.personalize_news(user_preferences, MockArt())
            item["tldr"] = res.get("personalized_tldr", item["tldr"])
            item["why_for_you"] = res.get("why_for_you", "")
            return item

        # Only personalize top 3 to prevent extreme latency
        top_items = [a for a in response_articles if a["relevance_score"] >= 70][:3]
        if top_items:
            await asyncio.gather(*(personalize_item(item) for item in top_items))

    # Final response should respect requested limit after ranking/surprise injection.
    response_articles = response_articles[:limit]

    return {
        "articles": response_articles,
        "total": len(response_articles),
        "category": category or "all",
        "personalized": bool(user_preferences),
        "user_preferences": user_preferences,
        "summarized_count": sum(1 for item in response_articles if item.get("is_summarized")),
    }


@router.get("/categories")
async def get_available_categories(db: AsyncSession = Depends(get_db)):
    """Return distinct category list with article counts."""
    stmt = select(Article.category, func.count(Article.id).label("count")).group_by(Article.category).order_by(func.count(Article.id).desc())
    result = await db.execute(stmt)
    rows = result.all()
    return {
        "categories": [
            {"name": row[0] or "General", "count": row[1]}
            for row in rows if row[0]
        ]
    }


@router.post("/sync")
async def trigger_news_sync():
    """Manually trigger a multi-category news sync and database populate."""
    from app.services.ingestion.tasks import _async_fetch_and_store_news
    from app.services.processing.tasks import _async_summarize_pending_articles
    try:
        inserted = await _async_fetch_and_store_news()
        summarized = await _async_summarize_pending_articles(batch_limit=8)
        return {
            "status": "success",
            "inserted": inserted,
            "summarized": summarized,
            "message": f"Synced {inserted} new articles and summarized {summarized} of the latest pending stories.",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/sync-with-pipeline")
async def trigger_pipeline_sync():
    """Trigger a full multi-agent pipeline sync with execution trace.
    Returns per-agent timing and status for UI visibility."""
    from app.agents.pipeline import NewsPipeline
    try:
        pipeline = NewsPipeline()
        result = await pipeline.run_sync_pipeline()
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
