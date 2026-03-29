import asyncio
from app.db.session import async_session
from app.db.models.article import Article

async def create_dummy_article():
    async with async_session() as db:
        article = Article(
            title="AI Revolutionizes Financial Trading in 2026",
            source="Tech News Hackathon",
            url="https://example.com/ai-trading-2026",
            content="Recent advancements in AI, specifically lightweight 8B models, have entirely changed high-frequency trading. Hedge funds are now employing agents that parse news in real-time, generate automated analysis, and even synthesize audio briefings for executives. This shift represents a $100 Billion market transformation.",
            category="finance"
        )
        db.add(article)
        try:
            await db.commit()
            await db.refresh(article)
            print(f"Created Dummy Article with ID: {article.id}")
            
            # Update test_video.py to hit this valid ID
            with open("test_video.py", "r") as f:
                content = f.read()
            content = content.replace("/generate/1", f"/generate/{article.id}")
            with open("test_video.py", "w") as f:
                f.write(content)
                
        except Exception as e:
            print(f"Failed or already exists: {e}")

if __name__ == "__main__":
    asyncio.run(create_dummy_article())
