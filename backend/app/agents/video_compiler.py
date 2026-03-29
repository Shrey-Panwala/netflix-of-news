import os
import logging
import requests
from typing import List

logger = logging.getLogger(__name__)

class LTXVideoCompiler:
    """
    Handles Text-to-Video generation using Replicate's LTX-Video.
    """
    def __init__(self, output_dir: str = "static/video"):
        self.output_dir = output_dir
        os.makedirs(self.output_dir, exist_ok=True)
        # Ensure token exists in environment
        self.replicate_token = os.environ.get("REPLICATE_API_TOKEN")
        if not self.replicate_token:
            logger.warning("REPLICATE_API_TOKEN is not set. Video generation will fail.")

    def generate_scene(self, prompt: str, filename: str) -> str:
        """Generates a high quality cinematic clip via Replicate."""
        import replicate
        
        filepath = os.path.join(self.output_dir, filename)
        
        try:
            logger.info(f"Generating LTX-Video scene for prompt: '{prompt[:50]}...'")
            output = replicate.run(
                "lightricks/ltx-video", 
                input={
                    "prompt": prompt,
                    "aspect_ratio": "16:9",
                    "negative_prompt": "low quality, worst quality, deformed, distorted, watermark",
                }
            )
            
            # The output could be a URL directly or a list with the URL or a FileOutput object
            video_url = str(output[0]) if isinstance(output, list) else str(output)
            
            logger.info(f"Downloading generated video to {filepath}")
            response = requests.get(video_url, stream=True)
            response.raise_for_status()
            
            with open(filepath, "wb") as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
                    
            return filepath
            
        except Exception as e:
            logger.error(f"Error generating video scene via Replicate: {e}")
            return ""
    def stitch_clips_with_audio(self, clip_paths: List[str], audio_path: str, final_filename: str) -> str:
        """Combines multiple video segments and an audio track into one final video."""
        from moviepy.editor import VideoFileClip, AudioFileClip, concatenate_videoclips
        
        valid_clips = [p for p in clip_paths if os.path.exists(p)]
        if not valid_clips:
            logger.error("No valid video clips to stitch.")
            return ""
            
        final_path = os.path.join(self.output_dir, final_filename)
        
        try:
            # Load video clips and concatenate
            video_clips = [VideoFileClip(c) for c in valid_clips]
            final_video = concatenate_videoclips(video_clips, method="compose")
            
            # Load and set audio
            if os.path.exists(audio_path):
                audio_clip = AudioFileClip(audio_path)
                final_video = final_video.set_audio(audio_clip)
                
            final_video.write_videofile(
                final_path, 
                codec="libx264", 
                audio_codec="aac", 
                temp_audiofile="temp-audio.m4a", 
                remove_temp=True,
                fps=25
            )
            
            # Cleanup clips from memory
            for c in video_clips:
                c.close()
            if os.path.exists(audio_path):
                audio_clip.close()
                
            return final_path
            
        except Exception as e:
            logger.error(f"Failed to stitch video: {e}")
            return ""
