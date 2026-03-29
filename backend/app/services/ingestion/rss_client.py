import httpx
import feedparser
import logging
from typing import List, Dict, Any
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

class ET_RSSClient:
    """Client for fetching Economic Times RSS feeds."""

    RSS_FEEDS = {
        "Markets": [
            "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
            "https://news.google.com/rss/search?q=india+markets+OR+sensex+OR+nifty&hl=en-IN&gl=IN&ceid=IN:en",
        ],
        "Business": [
            "https://economictimes.indiatimes.com/industry/rssfeeds/13352306.cms",
            "https://news.google.com/rss/search?q=india+business&hl=en-IN&gl=IN&ceid=IN:en",
        ],
        "Tech": [
            "https://economictimes.indiatimes.com/tech/rssfeeds/13357270.cms",
            "https://news.google.com/rss/search?q=india+technology+AI&hl=en-IN&gl=IN&ceid=IN:en",
        ],
        "Politics": [
            "https://news.google.com/rss/search?q=india+politics&hl=en-IN&gl=IN&ceid=IN:en",
        ],
        "Sports": [
            "https://news.google.com/rss/search?q=india+sports+cricket&hl=en-IN&gl=IN&ceid=IN:en",
        ],
        "Health": [
            "https://news.google.com/rss/search?q=india+health&hl=en-IN&gl=IN&ceid=IN:en",
        ],
        "Entertainment": [
            "https://news.google.com/rss/search?q=india+entertainment+bollywood&hl=en-IN&gl=IN&ceid=IN:en",
        ],
        "Science": [
            "https://news.google.com/rss/search?q=india+science+space&hl=en-IN&gl=IN&ceid=IN:en",
        ],
        "World": [
            "https://news.google.com/rss/search?q=world+economy+geopolitics&hl=en-IN&gl=IN&ceid=IN:en",
        ],
    }

    @staticmethod
    def clean_html(html_content: str) -> str:
        """Utility to strip HTML tags if present."""
        if not html_content:
            return ""
        soup = BeautifulSoup(html_content, "html.parser")
        return soup.get_text(separator=" ", strip=True)

    async def _fetch_single_feed(self, feed_url: str, category: str) -> List[Dict[str, Any]]:
        """Fetch and parse one RSS feed."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(feed_url)
                response.raise_for_status()

                # Parse RSS XML
                feed = feedparser.parse(response.content)
                articles = []

                for entry in feed.entries:
                    # Clean descriptive content
                    description = self.clean_html(getattr(entry, 'description', ''))

                    articles.append({
                        "title": entry.title,
                        "url": entry.link,
                        "source": getattr(entry, 'source', {}).get('title') if isinstance(getattr(entry, 'source', None), dict) else "Economic Times",
                        "category": category,
                        "published_at": getattr(entry, 'published', None),
                        "content": description,
                        "author": getattr(entry, 'author', 'ET Bureau')
                    })

                return articles
            except Exception as e:
                logger.error(f"Error fetching RSS feed [{category}] {feed_url}: {e}")
                return []

    async def fetch_all_feeds(self) -> List[Dict[str, Any]]:
        """Fetch all configured RSS feeds concurrently and return deduped articles."""
        import asyncio

        tasks = []
        for category, urls in self.RSS_FEEDS.items():
            for url in urls:
                tasks.append(self._fetch_single_feed(url, category))

        results = await asyncio.gather(*tasks, return_exceptions=True)
        combined = []
        for result in results:
            if isinstance(result, Exception):
                continue
            combined.extend(result)

        # Deduplicate by canonical URL/title pair.
        seen = set()
        deduped = []
        for item in combined:
            key = ((item.get("url") or "").strip(), (item.get("title") or "").strip().lower())
            if key in seen:
                continue
            seen.add(key)
            deduped.append(item)

        return deduped
