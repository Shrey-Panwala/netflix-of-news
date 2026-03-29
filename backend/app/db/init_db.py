import asyncio
import logging
from app.db.session import engine
from app.db.models.article import Base as ArticleBase
from app.db.models.user import Base as UserBase

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def init_db():
    logger.info("Initializing database tables...")
    async with engine.begin() as conn:
        # Create all tables defined in models
        await conn.run_sync(ArticleBase.metadata.create_all)
        await conn.run_sync(UserBase.metadata.create_all)
    logger.info("Database tables initialized successfully.")

if __name__ == "__main__":
    asyncio.run(init_db())
