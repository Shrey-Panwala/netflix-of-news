from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
import os
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend for AI News OS - personalized and agentic news experience",
    docs_url="/docs",
    openapi_url="/openapi.json"
)

# Set up CORS for frontend integration later
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to AI News OS API", "version": settings.VERSION}

# Create strict local dirs
os.makedirs("static/audio", exist_ok=True)
os.makedirs("static/video", exist_ok=True)
app.mount("/static/audio", StaticFiles(directory="static/audio"), name="static_audio")
app.mount("/static/video", StaticFiles(directory="static/video"), name="static_video")

from app.api.endpoints import rag, feed, chat, video, arcs, vernacular, auth, market, briefing
app.include_router(auth.router, prefix=settings.API_V1_STR + "/auth", tags=["auth"])
app.include_router(feed.router, prefix=settings.API_V1_STR + "/feed", tags=["feed"])
app.include_router(rag.router, prefix=settings.API_V1_STR + "/rag", tags=["rag"])
app.include_router(chat.router, prefix=settings.API_V1_STR + "/chat", tags=["chat"])
app.include_router(video.router, prefix=settings.API_V1_STR + "/video", tags=["video"])
app.include_router(arcs.router, prefix=settings.API_V1_STR + "/arcs", tags=["arcs"])
app.include_router(vernacular.router, prefix=settings.API_V1_STR + "/news", tags=["vernacular"])
app.include_router(market.router, prefix=settings.API_V1_STR + "/market", tags=["market"])
app.include_router(briefing.router, prefix=settings.API_V1_STR + "/briefing", tags=["briefing"])


