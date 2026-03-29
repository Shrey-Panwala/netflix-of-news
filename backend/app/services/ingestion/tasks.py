import asyncio
import logging
from typing import List, Dict, Any
from datetime import datetime, timezone
from sqlalchemy.future import select
from dateutil.parser import parse as parse_date

from app.db.session import async_session
from app.db.models.article import Article
from app.services.ingestion.news_api_client import NewsDataClient
from app.services.ingestion.rss_client import ET_RSSClient
from app.agents.rag_engine import RAGEngine

logger = logging.getLogger(__name__)

def parse_published_at(date_str: str) -> datetime:
    """Safely parse the published date."""
    if not date_str:
        return datetime.now(timezone.utc)
    try:
        dt = parse_date(date_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return datetime.now(timezone.utc)

async def _async_fetch_and_store_news() -> int:
    """
    Async core function to fetch from APIs and store in DB.
    Returns the number of new articles inserted.
    Fetches ALL categories concurrently for maximum coverage.
    """
    news_client = NewsDataClient()
    rss_client = ET_RSSClient()
    
    logger.info("Starting multi-category background news fetch...")
    
    # Fetch ALL categories concurrently alongside multi-source RSS feeds.
    all_api_articles, rss_articles = await asyncio.gather(
        news_client.fetch_all_categories(country="in"),
        rss_client.fetch_all_feeds(),
        return_exceptions=True
    )
    
    if isinstance(all_api_articles, Exception):
        logger.error(f"Failed to fetch NewsData.io: {all_api_articles}")
        all_api_articles = []
    if isinstance(rss_articles, Exception):
        logger.error(f"Failed to fetch RSS feeds: {rss_articles}")
        rss_articles = []

    normalized_articles = []
    
    # Normalize NewsData.io articles (already have category from client)
    for item in all_api_articles:
        title = item.get("title")
        url = item.get("url")
        if not title or not url:
            continue
        normalized_articles.append({
            "title": title,
            "url": url,
            "source": item.get("source", "Unknown"),
            "category": item.get("category", "General"),
            "published_at": parse_published_at(item.get("pubDate", "")),
            "content": item.get("content", "") or "",
            "author": item.get("author", "")
        })

    # Normalize RSS articles with per-feed categories
    for item in (rss_articles or []):
        title = item.get("title")
        url = item.get("url")
        if not title or not url:
            continue
        normalized_articles.append({
            "title": title,
            "url": url,
            "source": item.get("source", "Economic Times"),
            "category": item.get("category", "General"),
            "published_at": parse_published_at(item.get("published_at", "")),
            "content": item.get("content", "") or "",
            "author": item.get("author", "ET Bureau")
        })

    # In-memory dedupe before DB checks reduces duplicate query overhead.
    unique_map = {}
    for a in normalized_articles:
        key = (a.get("url", "").strip(), a.get("title", "").strip().lower())
        if key[0] and key[1] and key not in unique_map:
            unique_map[key] = a
    normalized_articles = list(unique_map.values())
    
    logger.info(f"Fetched {len(normalized_articles)} articles total. Deduplicating and saving...")
    
    inserted_count = 0
    new_articles_for_rag = []
    
    async with async_session() as session:
        for article_data in normalized_articles:
            stmt = select(Article.id).where(Article.url == article_data["url"])
            result = await session.execute(stmt)
            exists = result.scalar_one_or_none()
            
            if not exists:
                new_article = Article(
                    title=article_data["title"],
                    url=article_data["url"],
                    source=article_data["source"],
                    category=article_data.get("category", "General"),
                    published_at=article_data["published_at"],
                    content=article_data["content"],
                    authors=article_data.get("author", ""),
                    is_summarized=False
                )
                session.add(new_article)
                inserted_count += 1
                
        try:
            await session.commit()
            logger.info(f"Successfully inserted {inserted_count} new articles.")
            
            # Sync to RAG vector store
            if inserted_count > 0:
                logger.info("Syncing new articles to RAG vector store...")
                stmt = select(Article).order_by(Article.id.desc()).limit(inserted_count)
                result = await session.execute(stmt)
                new_articles_for_rag = result.scalars().all()
                
                rag = RAGEngine()
                rag.add_articles(new_articles_for_rag)
                logger.info(f"RAG sync complete for {len(new_articles_for_rag)} articles.")
                
        except Exception as e:
            await session.rollback()
            logger.error(f"Error saving articles to database: {e}")
            
    return inserted_count

def run_fetch_and_store_news():
    """Synchronous wrapper to be called by Celery task or startup trigger."""
    return asyncio.run(_async_fetch_and_store_news())
