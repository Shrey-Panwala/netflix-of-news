from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, JSON
from sqlalchemy.sql import func
from app.db.models.base import Base

class Article(Base):
    __tablename__ = "articles"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    url = Column(String, unique=True, index=True, nullable=False)
    source = Column(String, index=True)
    category = Column(String, index=True, nullable=True, default="general")
    authors = Column(String, nullable=True)
    
    # Raw content
    content = Column(Text, nullable=True)
    
    # Processed summaries
    tldr = Column(String, nullable=True)
    key_points = Column(JSON, nullable=True) # List of strings
    why_it_matters = Column(Text, nullable=True)
    is_summarized = Column(Boolean, default=False)
    
    # Vector DB reference (optional, if vectors are stored in FAISS externally or Pinecone)
    vector_id = Column(String, nullable=True)

    published_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

