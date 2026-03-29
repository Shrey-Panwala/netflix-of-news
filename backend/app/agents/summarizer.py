import json
import logging
from typing import Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from app.core.config import settings

logger = logging.getLogger(__name__)

# Fallback fake response for testing if OpenAI key is not provided
FAKE_SUMMARY = {
    "tldr": "Market showed unexpected resilience despite inflation reports. Tech stocks led the rebound.",
    "key_points": [
        "Major indices closed 2% higher.",
        "Inflation data met expectations, reducing fears of rate hikes.",
        "Tech sector outperformed with major AI announcements."
    ],
    "why_it_matters": "For investors, this signals a potential stabilization in high-growth sectors and reducing macroeconomic headwinds."
}

class SummarizationAgent:
    """Agent responsible for understanding and summarizing raw news."""

    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.groq_key = settings.GROQ_API_KEY
        
        if self.groq_key:
            from langchain_groq import ChatGroq
            # Note: response_format JSON is supported on llama-3.1-8b-instant for Groq
            self.llm = ChatGroq(
                model="llama-3.1-8b-instant",
                temperature=0.2,
                api_key=self.groq_key,
                model_kwargs={"response_format": {"type": "json_object"}}
            )
        elif self.api_key and self.api_key != "your-openai-api-key-here":
            self.llm = ChatOpenAI(
                model="gpt-4o-mini",
                temperature=0.2,
                openai_api_key=self.api_key,
                model_kwargs={"response_format": {"type": "json_object"}}
            )
        else:
            self.llm = None
            logger.warning("API keys not configured. Summarization will return mock data.")

        self.prompt = PromptTemplate(
            input_variables=["title", "content", "source"],
            template='''You are an elite financial news analyst for the AI News OS.
Analyze the following news article and provide a highly structured JSON output.

News Source: {source}
Title: {title}
Content: {content}

Instructions:
1. Provide a sharp 2-line TLDR ("tldr").
2. Provide a list of strictly 3 crucial bullet points ("key_points").
3. Explain "Why it matters" to an investor or tech enthusiast in 2-3 sentences ("why_it_matters").

Output your response strictly in the following JSON structure:
{{
    "tldr": "string",
    "key_points": ["string", "string", "string"],
    "why_it_matters": "string"
}}
'''
        )

    async def summarize_article(self, title: str, content: str, source: str) -> Dict[str, Any]:
        """Summarize an article into TLDR, key points, and why it matters context."""
        if not self.llm:
            return FAKE_SUMMARY
        
        # Combine if content is very short
        full_text = f"{title}. {content}" if len(content) < 50 else content
        # Safeguard text length basic
        full_text = full_text[:4000]

        try:
            chain = self.prompt | self.llm
            response = await chain.ainvoke({
                "title": title,
                "content": full_text,
                "source": source
            })
            # Parse the JSON response
            output = json.loads(response.content)
            return {
                "tldr": output.get("tldr", ""),
                "key_points": output.get("key_points", []),
                "why_it_matters": output.get("why_it_matters", "")
            }
        except Exception as e:
            logger.error(f"Error during LLM summarization: {e}")
            return {
                "tldr": "Summarization failed.",
                "key_points": ["Could not parse key points."],
                "why_it_matters": "Context analysis failed."
            }
