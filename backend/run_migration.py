"""
Database migration helper: adds 'category' column to articles table if missing.
Run once: python run_migration.py
"""
import asyncio
from sqlalchemy import text
from app.db.session import engine

async def run_migration():
    async with engine.begin() as conn:
        # Add category column if not already present
        try:
            await conn.execute(text(
                "ALTER TABLE articles ADD COLUMN IF NOT EXISTS category VARCHAR DEFAULT 'General'"
            ))
            # Also make content nullable
            await conn.execute(text(
                "ALTER TABLE articles ALTER COLUMN content DROP NOT NULL"
            ))
            print(" Migration complete: 'category' column added, content made nullable.")
        except Exception as e:
            print(f"Migration info: {e}")

if __name__ == "__main__":
    asyncio.run(run_migration())
