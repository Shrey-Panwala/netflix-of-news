import httpx
import logging
from typing import List, Dict, Any
from app.core.config import settings

logger = logging.getLogger(__name__)

# All categories we want to seed the database with
ALL_CATEGORIES = [
    "business",
    "technology",
    "politics",
    "sports",
    "health",
    "entertainment",
    "science",
    "world",
    "environment",
    "top",
]

# Category display name mapping
CATEGORY_DISPLAY = {
    "business": "Business",
    "technology": "Tech",
    "politics": "Politics",
    "sports": "Sports",
    "health": "Health",
    "entertainment": "Entertainment",
    "science": "Science",
    "world": "World",
    "environment": "Environment",
    "top": "Markets",
}

class NewsDataClient:
    """Client for interacting with NewsData.io for deep Indian content."""
    
    BASE_URL = "https://newsdata.io/api/1/news"
    ARCHIVE_URL = "https://newsdata.io/api/1/archive"

    def __init__(self):
        self.api_key = settings.NEWSDATA_API_KEY

    def _is_configured(self) -> bool:
        return bool(self.api_key and self.api_key != "your-newsdata-key-here")

    async def fetch_by_category(self, category: str = "business", country: str = "in") -> List[Dict[str, Any]]:
        """Fetch top headlines for a specific category."""
        if not self._is_configured():
            logger.warning("NewsData API key is not configured. Returning empty list.")
            return []

        params = {
            "apikey": self.api_key,
            "country": country,
            "category": category,
            "language": "en",
        }
        
        return await self._fetch(self.BASE_URL, params, category)

    async def fetch_top_headlines(self, category: str = "business", country: str = "in") -> List[Dict[str, Any]]:
        """Fetch top headlines — default call from tasks.py."""
        return await self.fetch_by_category(category, country)

    async def fetch_all_categories(self, country: str = "in") -> List[Dict[str, Any]]:
        """Fetch news across all categories concurrently."""
        if not self._is_configured():
            return []

        import asyncio
        tasks = [self.fetch_by_category(cat, country) for cat in ALL_CATEGORIES]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        all_articles = []
        for cat, result in zip(ALL_CATEGORIES, results):
            if isinstance(result, Exception):
                logger.error(f"Failed to fetch category {cat}: {result}")
                continue
            all_articles.extend(result)
        
        logger.info(f"Fetched {len(all_articles)} total articles across {len(ALL_CATEGORIES)} categories")
        return all_articles

    async def _fetch(self, url: str, params: dict, category: str) -> List[Dict[str, Any]]:
        """Internal fetch helper."""
        async with httpx.AsyncClient(timeout=20.0) as client:
            try:
                response = await client.get(url, params=params)
                response.raise_for_status()
                data = response.json()
                
                if data.get("status") == "success":
                    raw_articles = data.get("results", [])
                    mapped = []
                    display_cat = CATEGORY_DISPLAY.get(category, category.title())
                    
                    for raw in raw_articles:
                        title = raw.get("title", "")
                        link = raw.get("link", "")
                        if not title or not link:
                            continue
                        
                        # Use description as content fallback when paid content unavailable
                        content = raw.get("content") or raw.get("description") or ""
                        
                        mapped.append({
                            "title": title,
                            "url": link,
                            "source": raw.get("source_id", "Unknown"),
                            "category": display_cat,
                            "content": content,
                            "pubDate": raw.get("pubDate", ""),
                            "author": (raw.get("creator") or ["Unknown"])[0]
                                      if isinstance(raw.get("creator"), list)
                                      else raw.get("creator", "Unknown"),
                            "image_url": raw.get("image_url", ""),
                        })
                    return mapped
                else:
                    logger.error(f"NewsData returned error: {data.get('message')}")
                    return []
            except Exception as e:
                logger.error(f"Error fetching from NewsData [{category}]: {e}")
                return []
