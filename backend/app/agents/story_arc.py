import json
import logging
from typing import Dict, Any, List
from langchain_core.prompts import PromptTemplate
from app.agents.rag_engine import RAGEngine
from app.core.config import settings

logger = logging.getLogger(__name__)

class StoryArcAgent:
    """Agent that constructs rich, chronological timelines and sentiment graphs for a topic using RAG."""

    def __init__(self):
        self.groq_key = settings.GROQ_API_KEY
        self.rag_engine = RAGEngine()
        
        if self.groq_key:
            from langchain_groq import ChatGroq
            self.llm = ChatGroq(
                model="llama-3.3-70b-versatile",
                temperature=0.3,
                api_key=self.groq_key,
            )
        else:
            self.llm = None
            logger.warning("No LLM key configured for Story Arc Tracker.")

        self.prompt = PromptTemplate(
            input_variables=["topic", "context"],
            template='''You are a senior financial analyst and journalist building a detailed "Story Arc" for the topic: {topic}.

Based on the news context provided, construct a comprehensive JSON response with EXACTLY these keys:
1. "timeline": A list of 5-8 chronological events. Each event object must have:
   - "date": the date or time period (e.g., "2026-03-27", "Q1 2025", "March 2026")
   - "title": a clear, factual event headline (max 15 words)
   - "description": a 2-3 sentence explanation of what happened and why it matters
   - "sentiment": one of "Bullish", "Bearish", or "Neutral"
   - "impact": one of "High", "Medium", "Low"

2. "overall_sentiment": A single string — "Bullish", "Bearish", or "Neutral"

3. "sentiment_explanation": 1-2 sentences explaining the overall sentiment direction.

4. "key_players": A list of 3-5 key entities (companies, people, government bodies) central to this story.

5. "prediction": A 2-3 sentence forward-looking analysis of what might happen next based on current trends.

6. "prediction_confidence": An integer from 1-10 indicating how confident the prediction is based on available data.

7. "market_impact": A 1-2 sentence summary of the economic/market impact of this story.

8. "related_sectors": A list of 2-4 market sectors most affected by this story (e.g., "Banking", "IT", "Energy").

9. "key_data_points": A list of 3-5 specific numbers, percentages, or statistics mentioned in the context.

10. "what_to_watch": A 1-sentence description of the next key event or date to watch for this story.

11. "contrarian_perspective": A 2-3 sentence explanation of the counter-narrative, bearish view (if bullish), or skeptic's take on this topic based on the context.

CONTEXT ARTICLES:
{context}

IMPORTANT:
- Do NOT make up events or dates not supported by the context.
- If context is limited, still build the best possible timeline from the information available.
- Use clear financial/news journalist language.
- Respond ONLY with valid JSON. No markdown backticks, no preamble.
'''
        )

    async def build_arc(self, topic: str) -> Dict[str, Any]:
        """Fetch relevant articles and build the arc."""
        if not self.llm:
            return {"error": "LLM not configured"}

        # 1. Retrieve context
        try:
            docs = self.rag_engine.search_similar(topic, k=15)
            if not docs:
                # If RAG has no results, build arc with general knowledge + empty context note
                context = f"Limited news context available for topic: {topic}. Build the arc based on general knowledge about this topic in the Indian market context."
            else:
                context = "\n\n---\n".join([
                    f"Source: {d.metadata.get('source', 'Unknown')}\nArticle: {d.page_content}"
                    for d in docs
                ])
            
        except Exception as e:
            logger.error(f"RAG search failed for Story Arc: {e}")
            context = f"Context unavailable for {topic}. Provide a general analysis."

        # 2. Build the JSON narrative
        try:
            chain = self.prompt | self.llm
            response = await chain.ainvoke({"topic": topic, "context": context[:10000]})
            
            raw_text = response.content.strip()
            # Clean any markdown wrappers
            if raw_text.startswith("```json"):
                raw_text = raw_text[7:]
            if raw_text.startswith("```"):
                raw_text = raw_text[3:]
            if raw_text.endswith("```"):
                raw_text = raw_text[:-3]
            raw_text = raw_text.strip()
            
            parsed_json = json.loads(raw_text)
            return parsed_json
            
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error for arc: {e}")
            # Return minimal valid structure so endpoint never 400s
            return {
                "timeline": [
                    {
                        "date": "Present",
                        "title": f"AI analysis in progress for: {topic}",
                        "description": "The AI is analyzing available news articles. Please try again or add more news via the sync function.",
                        "sentiment": "Neutral",
                        "impact": "Medium"
                    }
                ],
                "overall_sentiment": "Neutral",
                "sentiment_explanation": "Insufficient data to determine clear directional sentiment.",
                "key_players": [],
                "prediction": "Monitor this topic as more news becomes available.",
                "market_impact": "Impact analysis pending more data."
            }
        except Exception as e:
            logger.error(f"LLM Arc Generation failed: {e}")
            return {"error": f"Failed to generate arc: {str(e)}"}
