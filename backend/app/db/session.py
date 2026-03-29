from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from typing import AsyncGenerator
from app.core.config import settings

# Create the async engine
# For local testing if the user doesn't have postgres instantly ready, we can use an async SQLite URL in .env
engine = create_async_engine(settings.DATABASE_URL, echo=False)

# Create an async session maker
async_session = async_sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False, autoflush=False
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides a database session.
    """
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
