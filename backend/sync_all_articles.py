import asyncio
import sys
import os

sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from app.db.session import async_session
from app.db.models.article import Article
from sqlalchemy.future import select
from app.agents.rag_engine import RAGEngine

async def sync_all():
    print('Starting full RAG sync...')
    async with async_session() as session:
        stmt = select(Article)
        result = await session.execute(stmt)
        articles = result.scalars().all()
        print(f'Found {len(articles)} articles in DB. Adding to FAISS...')
        rag = RAGEngine()
        rag.add_articles(articles)
        print('Done!')

if __name__ == "__main__":
    asyncio.run(sync_all())
