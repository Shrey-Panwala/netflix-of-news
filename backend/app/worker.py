from celery import Celery
from app.core.config import settings

celery_app = Celery(
    "ai_news_tasks",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

@celery_app.task(name="fetch_news_task")
def fetch_news_task():
    """
    Celery task to periodically fetch news from APIs and store in DB.
    """
    from app.services.ingestion.tasks import run_fetch_and_store_news
    
    inserted_count = run_fetch_and_store_news()
    return {"status": "success", "inserted_count": inserted_count}

@celery_app.task(name="summarize_news_task")
def summarize_news_task():
    """
    Celery task to summarize pending articles using LLM.
    """
    from app.services.processing.tasks import run_summarize_pending_articles
    
    processed_count = run_summarize_pending_articles()
    return {"status": "success", "processed_count": processed_count}

@celery_app.task(name="generate_viral_video_task", bind=True)
def generate_viral_video_task(self, title: str, script: str, audio_path: str):
    """
    Background job to generate a 60-second stitched video from a script.
    """
    import logging
    from app.agents.video_compiler import LTXVideoCompiler
    logger = logging.getLogger(__name__)
    
    compiler = LTXVideoCompiler()
    
    # Very crude chunking: Split script into roughly 12 parts
    words = script.split()
    chunk_size = max(1, len(words) // 12)
    chunks = [" ".join(words[i:i+chunk_size]) for i in range(0, len(words), chunk_size)][:12]
    
    clip_paths = []
    
    for i, chunk in enumerate(chunks):
        # Update celery state if tracked
        logger.info(f"Generating clip {i+1}/12...")
        
        # Visual prompt is simply the chunk of the script + some stylistic boosters
        visual_prompt = f"A high-quality, cinematic news broadcast scene depicting: {chunk}. hyper-detailed, realistic, 4k"
        
        filename = f"clip_{self.request.id}_{i}.mp4"
        clip_path = compiler.generate_scene(prompt=visual_prompt, filename=filename)
        
        if clip_path:
            clip_paths.append(clip_path)
    
    if clip_paths:
        logger.info("Stitching clips together...")
        final_filename = f"final_viral_{self.request.id}.mp4"
        # We change fps to 25 to match typical LTX output framing
        final_path = compiler.stitch_clips_with_audio(clip_paths, audio_path, final_filename)
        return {"status": "success", "video_path": final_path}
        
    return {"status": "failed", "error": "No clips were generated"}
