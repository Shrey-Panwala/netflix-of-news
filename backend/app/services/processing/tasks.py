import asyncio
import logging
from sqlalchemy.future import select
from app.db.session import async_session
from app.db.models.article import Article
from app.agents.summarizer import SummarizationAgent
from app.agents.rag_engine import RAGEngine

logger = logging.getLogger(__name__)

async def _async_summarize_pending_articles(batch_limit: int = 12) -> int:
    """Find articles that haven't been summarized and process them."""
    processed_count = 0
    agent = SummarizationAgent()
    
    async with async_session() as session:
        # Process a larger batch so a live sync can populate the homepage immediately.
        stmt = select(Article).where(Article.is_summarized == False).order_by(Article.published_at.desc()).limit(batch_limit)
        result = await session.execute(stmt)
        articles = result.scalars().all()
        
        if not articles:
            return 0
            
        logger.info(f"Found {len(articles)} articles to summarize.")
        rag_engine = RAGEngine()
        summarized_articles = []
        
        for article in articles:
            try:
                summary_data = await agent.summarize_article(
                    title=article.title, 
                    content=article.content, 
                    source=article.source
                )
                
                article.tldr = summary_data.get("tldr")
                article.key_points = summary_data.get("key_points")
                article.why_it_matters = summary_data.get("why_it_matters")
                article.is_summarized = True
                
                summarized_articles.append(article)
                processed_count += 1
                
            except Exception as e:
                logger.error(f"Error summarizing article {article.id}: {e}")
                
        # Embed newly summarized articles
        if summarized_articles:
            rag_engine.add_articles(summarized_articles)
            
        try:
            await session.commit()
            logger.info(f"Successfully summarized and saved {processed_count} articles.")
        except Exception as e:
            await session.rollback()
            logger.error(f"Failed saving summaries to database: {e}")
            
    return processed_count

def run_summarize_pending_articles():
    """Synchronous wrapper for Celery."""
    return asyncio.run(_async_summarize_pending_articles())
