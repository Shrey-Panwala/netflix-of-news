import os
import logging
from typing import List, Dict, Any
from langchain_community.vectorstores import FAISS
from langchain_openai import OpenAIEmbeddings
from langchain_core.documents import Document
from app.core.config import settings
from app.db.models.article import Article

logger = logging.getLogger(__name__)

class RAGEngine:
    """Manages Vector Store Embeddings and Retrieval for News."""
    
    def __init__(self, index_path: str = "faiss_index"):
        self.index_path = index_path
        self.api_key = settings.OPENAI_API_KEY
        
        if self.api_key and self.api_key != "your-openai-api-key-here":
            self.embeddings = OpenAIEmbeddings(openai_api_key=self.api_key)
        else:
            try:
                from langchain_community.embeddings import HuggingFaceEmbeddings
                self.embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
                logger.info("Using local HuggingFace Embeddings for vector store.")
            except Exception as e:
                self.embeddings = None
                logger.warning(f"Failed to load HuggingFace Embeddings: {e}. RAG mock mode enabled.")
            
        self.vector_store = self._load_or_create_index()

    def _load_or_create_index(self) -> Any:
        if not self.embeddings:
            return None
            
        if os.path.exists(self.index_path):
            try:
                return FAISS.load_local(self.index_path, self.embeddings, allow_dangerous_deserialization=True)
            except Exception as e:
                logger.error(f"Error loading FAISS index: {e}")
                try:
                    return FAISS.from_texts(["Initial empty document to setup index."], self.embeddings)
                except Exception as ex:
                    logger.error(f"Failed to create fresh FAISS index due to API error: {ex}")
                    return None
        else:
            try:
                return FAISS.from_texts(["Initial empty document to setup index."], self.embeddings)
            except Exception as ex:
                logger.error(f"Failed to create fresh FAISS index due to API error: {ex}")
                return None

    def format_article_as_document(self, article: Article) -> Document:
        """Combine article details into a searchable text block."""
        content = [
            f"Title: {article.title}",
            f"Source: {article.source}",
            f"Published: {article.published_at}",
        ]
        
        if article.tldr:
            content.append(f"TLDR: {article.tldr}")
        if article.key_points:
            content.append(f"Key Points: {', '.join(article.key_points)}")
        if article.why_it_matters:
            content.append(f"Context: {article.why_it_matters}")
        if not article.tldr:
            content.append(f"Content: {article.content[:500]}...") # Provide chunks if large
            
        return Document(
            page_content="\n".join(content),
            metadata={"article_id": str(article.id), "source": article.source, "url": article.url}
        )

    def add_articles(self, articles: List[Article]) -> None:
        """Embed and add a list of articles to the vector store."""
        if not self.vector_store or not articles:
            return
            
        docs = [self.format_article_as_document(a) for a in articles]
        self.vector_store.add_documents(docs)
        self.vector_store.save_local(self.index_path)
        logger.info(f"Added {len(docs)} documents to FAISS index.")

    def semantic_search(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """Perform semantic search on the specific query."""
        if not self.vector_store:
            logger.warning("RAG semantic_search requested but vector store is unavailable.")
            return []
            
        # Get raw documents
        docs = self.vector_store.similarity_search(query, k=k)
        
        results = []
        for d in docs:
            # Skip the dummy initiation document
            if d.page_content.startswith("Initial empty document"):
                continue
                
            results.append({
                "content": d.page_content,
                "metadata": d.metadata
            })
        return results

    def search_similar(self, query: str, k: int = 5) -> List[Document]:
        """Return raw Document objects from similarity search (used by StoryArcAgent)."""
        if not self.vector_store:
            return []
        try:
            docs = self.vector_store.similarity_search(query, k=k)
            return [d for d in docs if not d.page_content.startswith("Initial empty document")]
        except Exception as e:
            logger.error(f"search_similar error: {e}")
            return []

