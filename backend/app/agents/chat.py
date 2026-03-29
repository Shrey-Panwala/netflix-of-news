import logging
from typing import List, Dict, Any, Optional
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from app.agents.rag_engine import RAGEngine
from app.core.config import settings
from tenacity import RetryError

logger = logging.getLogger(__name__)

# Intent classification keywords
INTENT_KEYWORDS = {
    "explain": ["explain", "why", "how does", "what is", "meaning", "reason", "cause", "tell me about", "what happened"],
    "summarize": ["summarize", "summary", "tldr", "brief", "short", "quick", "overview", "headlines", "top news"],
    "compare": ["compare", "versus", "vs", "difference", "better", "both"],
    "deep_brief": ["deep brief", "deep briefing", "synthesize", "comprehensive review", "everything about", "deep dive"],
    "video": ["video", "reel", "script", "anchor"],
    "predict": ["predict", "forecast", "future", "will", "next", "expect", "outlook"],
    "market": ["market", "stock", "sensex", "nifty", "trading", "sector", "trending", "rally", "crash"],
}


class ConversationalNewsAgent:
    """Agent for interactive Q&A over the news via RAG with Router + Trust Layer."""
    
    _user_memories: Dict[int, List[Any]] = {}

    def __init__(self):
        self.api_key = settings.OPENAI_API_KEY
        self.groq_key = settings.GROQ_API_KEY
        
        if self.groq_key:
            from langchain_groq import ChatGroq
            self.llm = ChatGroq(
                model="llama-3.1-8b-instant",
                temperature=0.35,
                api_key=self.groq_key
            )
        elif self.api_key and self.api_key != "your-openai-api-key-here":
            from langchain_openai import ChatOpenAI
            self.llm = ChatOpenAI(
                model="gpt-4o-mini",
                temperature=0.35,
                openai_api_key=self.api_key
            )
        else:
            self.llm = None
            logger.warning("OPENAI/GROQ API_KEY missing. Chat capabilities are disabled/mocked.")

    def _classify_intent(self, query: str) -> str:
        """Router Agent: classify the user's intent to route to the right agent."""
        query_lower = query.lower().strip()
        for intent, keywords in INTENT_KEYWORDS.items():
            if any(kw in query_lower for kw in keywords):
                return intent
        return "general"

    def _compute_confidence(self, docs: list, query: str) -> int:
        """Compute a confidence score (0-100) based on source quality."""
        if not docs:
            return 15
        
        source_score = min(len(docs), 5) * 12
        query_terms = [t.lower() for t in query.split() if len(t) > 3]
        content_matches = 0
        for d in docs:
            text = d.page_content.lower()
            content_matches += sum(1 for t in query_terms if t in text)
        
        relevance_score = min(content_matches * 5, 30)
        unique_sources = len(set(d.metadata.get('source', '') for d in docs))
        diversity_score = min(unique_sources * 3, 10)
        
        return min(source_score + relevance_score + diversity_score, 98)

    def _get_user_history(self, user_id: int) -> List[Any]:
        if user_id not in self._user_memories:
            self._user_memories[user_id] = []
        return self._user_memories[user_id]

    def _extract_title(self, page_content: str) -> str:
        for line in page_content.split("\n"):
            if line.startswith("Title: "):
                return line.replace("Title: ", "").strip()
        return "Untitled"

    def _build_extractive_answer(self, question: str, docs: List[Any], intent: str) -> str:
        if not docs:
            return "I couldn't find relevant stories for that query yet. Try syncing the latest news first."

        top_docs = docs[:3]
        highlights = []
        for i, d in enumerate(top_docs, 1):
            title = self._extract_title(d.page_content)
            source = d.metadata.get("source", "Unknown")
            highlights.append(f"**{i}. {title}** — _{source}_")

        if intent == "summarize":
            header = "Here's a quick roundup from the latest stories:"
        elif intent == "compare":
            header = "Here are the key stories to compare:"
        elif intent == "predict":
            header = "These are the most recent signals worth watching:"
        elif intent == "market":
            header = "Here's what the markets are showing:"
        else:
            header = f"Here's what I found on that topic:"

        return f"{header}\n\n" + "\n".join(highlights)

    def reset_memory(self, user_id: int) -> None:
        if user_id in self._user_memories:
            del self._user_memories[user_id]

    def _fallback_extractive_response(
        self,
        history: List[Any],
        question: str,
        docs: List[Any],
        intent: str,
        sources: List[str],
        source_details: List[Dict[str, Any]],
        confidence: int,
        error_label: str
    ) -> Dict[str, Any]:
        """Return a deterministic answer when LLM inference is unavailable."""
        answer_text = self._build_extractive_answer(question, docs, intent)
        history.append(HumanMessage(content=question))
        history.append(AIMessage(content=answer_text))
        return {
            "answer": answer_text,
            "sources": sources,
            "source_details": source_details,
            "confidence": confidence,
            "reasoning": f"Extractive fallback mode ({error_label}).",
            "intent": intent
        }

    async def ask_question(self, user_id: int, question: str, user_preferences: list = None) -> Dict[str, Any]:
        """Process a query with Router Agent + Trust Layer + Personalization."""
        
        # Step 1: Router Agent — classify intent
        intent = self._classify_intent(question)
        rag_engine = RAGEngine()
        
        if not getattr(rag_engine, "vector_store", None):
            return {
                "answer": "The news index isn't ready yet. Please sync some news first, then ask me again!",
                "sources": [],
                "source_details": [],
                "confidence": 0,
                "reasoning": "Vector store unavailable for retrieval.",
                "intent": intent
            }
            
        history = self._get_user_history(user_id)
        
        try:
            # Step 2: RAG Retrieval
            retriever = rag_engine.vector_store.as_retriever(search_kwargs={"k": 5})
            docs = retriever.invoke(question)
            
            # Filter dummy docs
            docs = [d for d in docs if not d.page_content.startswith("Initial empty document")]
            
            context_text = "\n\n".join([
                f"Source: {d.metadata.get('source', 'Unknown')}\n{d.page_content}" 
                for d in docs
            ])
            
            # Step 3: Trust Layer — extract source details
            source_details = []
            seen_sources = set()
            for d in docs:
                src = d.metadata.get('source', 'Unknown')
                if src not in seen_sources:
                    seen_sources.add(src)
                    lines = d.page_content.split('\n')
                    title = next((l.replace('Title: ', '') for l in lines if l.startswith('Title:')), src)
                    source_details.append({
                        "source": src,
                        "title": title[:100],
                        "article_id": d.metadata.get('article_id', '')
                    })
            
            sources = [s["source"] for s in source_details]
            
            # Step 4: Compute confidence score
            confidence = self._compute_confidence(docs, question)

            # Step 4.5: Fallback without LLM
            if not self.llm:
                answer_text = self._build_extractive_answer(question, docs, intent)
                reasoning = "Extractive mode — LLM not configured."
                history.append(HumanMessage(content=question))
                history.append(AIMessage(content=answer_text))
                return {
                    "answer": answer_text,
                    "sources": sources,
                    "source_details": source_details,
                    "confidence": confidence,
                    "reasoning": reasoning,
                    "intent": intent
                }

            # Step 5: Build a natural, journalist-style prompt
            preferences_context = ""
            if user_preferences:
                preferences_context = f"\nThe user follows these topics: {', '.join(user_preferences)}. Tailor your response to highlight relevance to their interests when applicable."

            intent_instruction = {
                "explain": "Give a clear, conversational explanation. Break down the 'why' behind events. Use short paragraphs.",
                "summarize": "Provide a crisp, well-structured summary. Use bullet points for key takeaways. Lead with the most important point.",
                "compare": "Compare the different angles, perspectives, or entities. Use a structured format with clear contrasts.",
                "deep_brief": "Synthesize all coverage into a deep, explorable Intelligence Briefing document. Format with sections like 1) Executive Summary, 2) Diverging Angles, 3) What to Watch Next. Crucially, end your response with exactly 3 highly relevant suggested follow-up questions formatted exactly like this: '[FOLLOWUP] Question 1?'",
                "predict": "Analyze trends and provide a forward-looking perspective. Note what signals point to, but be honest about uncertainty.",
                "video": "Generate a brief, engaging script suitable for a 30-second news video reel.",
                "market": "Focus on market-relevant details: numbers, trends, sector impacts. Use a financial journalist's precision.",
                "general": "Give a direct, helpful answer. Structure with key points if the topic is complex."
            }.get(intent, "Give a direct, helpful answer.")
            
            system_msg = SystemMessage(content=(
                f"You are a senior news analyst at AI News OS — think of yourself as a trusted journalist friend, not a chatbot. "
                f"{intent_instruction}\n\n"
                "STYLE RULES:\n"
                "- Write like a sharp journalist, NOT like an AI. Use active voice, present tense.\n"
                "- Use **bold** for key facts and names. Use bullet points for lists.\n"
                "- Never say 'based on the available data' or 'according to the context provided'.\n"
                "- Lead with the most newsworthy point. Be specific with numbers when available.\n"
                "- Keep paragraphs short (2-3 sentences max).\n"
                "- If asked about something not in the context, say 'I don't have coverage on that yet' naturally.\n"
                "- End with a brief forward-looking line when appropriate.\n"
                f"{preferences_context}\n\n"
                f"NEWS CONTEXT:\n{context_text}\n\n"
                "IMPORTANT: Do NOT add 'Reasoning:' at the end. Just give the answer."
            ))
            
            messages = [system_msg] + history[-6:] + [HumanMessage(content=question)]
            
            # Step 6: Invoke LLM (with graceful fallback on provider/rate-limit errors)
            try:
                response = await self.llm.ainvoke(messages)
                answer_text = response.content.strip()
            except RetryError as e:
                logger.warning(f"LLM retry exhausted, using extractive fallback: {e}")
                return self._fallback_extractive_response(
                    history=history,
                    question=question,
                    docs=docs,
                    intent=intent,
                    sources=sources,
                    source_details=source_details,
                    confidence=confidence,
                    error_label="provider retry limit"
                )
            except Exception as e:
                err = str(e).lower()
                if "rate limit" in err or "429" in err or "quota" in err or "tokens per day" in err:
                    logger.warning(f"LLM rate-limited, using extractive fallback: {e}")
                    return self._fallback_extractive_response(
                        history=history,
                        question=question,
                        docs=docs,
                        intent=intent,
                        sources=sources,
                        source_details=source_details,
                        confidence=confidence,
                        error_label="provider rate limit"
                    )
                logger.warning(f"LLM invocation failed, using extractive fallback: {e}")
                return self._fallback_extractive_response(
                    history=history,
                    question=question,
                    docs=docs,
                    intent=intent,
                    sources=sources,
                    source_details=source_details,
                    confidence=confidence,
                    error_label="provider unavailable"
                )
            
            # Clean up any "Reasoning:" the model might still add
            if "Reasoning:" in answer_text:
                answer_text = answer_text.rsplit("Reasoning:", 1)[0].strip()
            
            reasoning = f"Analyzed {len(docs)} sources from {', '.join(sources[:3])}"
            
            # Save context
            history.append(HumanMessage(content=question))
            history.append(AIMessage(content=answer_text))
            
            return {
                "answer": answer_text,
                "sources": sources,
                "source_details": source_details,
                "confidence": confidence,
                "reasoning": reasoning,
                "intent": intent
            }
        except Exception as e:
            logger.error(f"Chat error: {e}")
            return {
                "answer": f"Something went wrong while processing that. Try rephrasing your question.",
                "sources": [],
                "source_details": [],
                "confidence": 0,
                "reasoning": f"Error: {str(e)}",
                "intent": intent
            }
