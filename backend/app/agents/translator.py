import logging
from typing import Dict, Any
from langchain_core.prompts import PromptTemplate
from app.core.config import settings

logger = logging.getLogger(__name__)

# Language to native script mapping for prompt clarity
LANGUAGE_SCRIPT_GUIDE = {
    "Hindi": "MUST write entirely in Hindi using Devanagari script (हिंदी). Do NOT write romanized Hindi (like 'Kya aapko...'). Write actual Hindi characters.",
    "Tamil": "MUST write entirely in Tamil using Tamil script (தமிழ்). Do NOT use romanized Tamil.",
    "Bengali": "MUST write entirely in Bengali using Bengali script (বাংলা). Do NOT use romanized Bengali.",
    "Marathi": "MUST write entirely in Marathi using Devanagari script (मराठी). Do NOT write romanized Marathi.",
    "Telugu": "MUST write entirely in Telugu using Telugu script (తెలుగు). Do NOT use romanized Telugu.",
    "Kannada": "MUST write entirely in Kannada using Kannada script (ಕನ್ನಡ). Do NOT use romanized Kannada.",
    "English (Simplified)": "Write in plain, simple English. Use short sentences. Avoid jargon.",
}

class TranslatorAgent:
    """Agent that translates and simplifies news content for better accessibility."""

    def __init__(self):
        self.groq_key = settings.GROQ_API_KEY
        
        if self.groq_key:
            from langchain_groq import ChatGroq
            self.llm = ChatGroq(
                model="llama-3.3-70b-versatile",
                temperature=0.1,
                api_key=self.groq_key,
            )
        else:
            self.llm = None
            logger.warning("No LLM key configured for Vernacular Engine.")

        self.prompt = PromptTemplate(
            input_variables=["content", "language", "reading_level", "script_instruction"],
            template='''You are an expert culturally-aware news adapter for the AI News OS.

STRICT RULE: {script_instruction}
Reading Level: {reading_level}

Your task is to craft a "Culturally Adapted Translation" of the provided business news.
CRITICAL REQUIREMENTS:
- DO NOT just literally translate. You must culturally adapt the explanations using local Indian context, idioms, and relevant comparisons to make the business news deeply resonant with local {language} readers.
- If translating to a non-Latin script (Hindi, Tamil, Bengali, etc.), you MUST produce output in that native script. Romanized transliteration is STRICTLY FORBIDDEN.
- Match the reading level thoughtfully:
  - "Beginner" or "Explain like I'm 5": Use very simple local analogies (e.g., comparing stock market moves to a local bazaar pricing).
  - "Expert": Maintain technical precision but use accurate local financial terminology.
- Be factually accurate, but ensure the *explanation* bridges any cultural/technical gap.

ORIGINAL NEWS CONTENT:
{content}

TRANSLATED OUTPUT (output ONLY the translated text, nothing else):
'''
        )

    async def adapt_news(self, content: str, language: str = "Hindi", reading_level: str = "Beginner") -> str:
        """Translate or simplify the provided content."""
        if not self.llm:
            return "Translation LLM not configured."

        script_instruction = LANGUAGE_SCRIPT_GUIDE.get(language, f"Write in {language} using its native script.")

        try:
            chain = self.prompt | self.llm
            response = await chain.ainvoke({
                "content": content[:4000],
                "language": language,
                "reading_level": reading_level,
                "script_instruction": script_instruction
            })
            
            return response.content.strip()
            
        except Exception as e:
            logger.error(f"Vernacular adaptation failed: {e}")
            return "Failed to translate or simplify the news content at this time."
