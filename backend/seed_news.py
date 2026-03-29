"""
Mass news seeder — populates the DB with articles across all categories.
Uses newsdata.io API + ET RSS.
Run: python seed_news.py
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.ingestion.tasks import _async_fetch_and_store_news

async def main():
    print("  Starting mass news seed across all categories...")
    print("   Fetching: Business, Tech, Politics, Sports, Health, Entertainment, Science, World, Environment, Markets")
    print("   This may take 30-60 seconds...")
    
    total = 0
    # Run multiple rounds to maximize coverage (API rate limits may apply)
    for i in range(2):
        print(f"\n Round {i+1}/2 ...")
        count = await _async_fetch_and_store_news()
        total += count
        print(f"    Inserted {count} new articles")
        if i < 1:
            await asyncio.sleep(3)  # Brief pause between rounds

    print(f"\n Seed complete! Total new articles: {total}")
    print("   Open http://localhost:5173 to see the populated feed.")

if __name__ == "__main__":
    asyncio.run(main())
