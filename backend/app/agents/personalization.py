import json
import logging
from typing import List, Dict, Any
from langchain_openai import ChatOpenAI
from langchain_core.prompts import PromptTemplate
from app.core.config import settings

logger = logging.getLogger(__name__)

class PersonalizationAgent:
    """Agent for personalizing a news feed to match user preferences."""

    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.groq_key = settings.GROQ_API_KEY
        
        if self.groq_key:
            from langchain_groq import ChatGroq
            # Llama 3.1 8b supports JSON mode response format
            self.llm = ChatGroq(
                model="llama-3.1-8b-instant",
                temperature=0.3,
                api_key=self.groq_key,
                model_kwargs={"response_format": {"type": "json_object"}}
            )
        elif self.api_key and self.api_key != "your-openai-api-key-here":
            self.llm = ChatOpenAI(
                model="gpt-4o-mini",
                temperature=0.3,
                openai_api_key=self.api_key,
                model_kwargs={"response_format": {"type": "json_object"}}
            )
        else:
            self.llm = None
            logger.warning("API keys missing. Personalization will return static mock context.")

        self.prompt = PromptTemplate(
            input_variables=["interests", "tldr", "key_points", "article_context"],
            template='''You are an AI Personalization Engine for an advanced News OS.
Analyze the following news summary against the User's interests to create a "fundamentally different news experience".

User Interests: {interests}

Article TLDR: {tldr}
Article Key Points: {key_points}
Full Context: {article_context}

Task 1: Determine the user's Persona from their interests (e.g., if they like "Markets", they are an Investor. If they like "Tech" or "Education", they might be a Student/Learner. If "Startups", a Founder). 
Task 2: Rewrite the Article TLDR specifically for this persona. 
- A student/learner must get an "explainer-first" summary.
- An investor must get a "portfolio/metrics-first" summary.
- A founder must get a "competitive landscape/funding-first" summary.
Task 3: Provide a personalized insight answering: "Why this news matters to you".

Output your response strictly in the following JSON structure:
{{
    "personalized_tldr": "The rewritten 2-3 sentence TLDR in the specific format required by the user's persona.",
    "why_for_you": "Crucial 2-sentence explanation of why the user should care based on their explicit interests."
}}
'''
        )

    async def personalize_news(self, interests: List[str], article: Any) -> Dict[str, str]:
        """Generate Persona-based TLDR and 'Why this news for you'."""
        fallback = {
            "why_for_you": "Based on your general profile, this macro event could impact broader market trends.",
            "personalized_tldr": getattr(article, "tldr", "This aligns with broader market movements impacting your interests.")
        }
        
        if not self.llm or not interests:
            return fallback
        
        try:
            chain = self.prompt | self.llm
            response = await chain.ainvoke({
                "interests": ", ".join(interests),
                "tldr": getattr(article, "tldr", ""),
                "key_points": ", ".join(getattr(article, "key_points", [])),
                "article_context": getattr(article, "why_it_matters", "")
            })
            output = json.loads(response.content)
            return {
                "why_for_you": output.get("why_for_you", fallback["why_for_you"]),
                "personalized_tldr": output.get("personalized_tldr", fallback["personalized_tldr"])
            }
        except Exception as e:
            logger.error(f"Personalization failed: {e}")
            return fallback
