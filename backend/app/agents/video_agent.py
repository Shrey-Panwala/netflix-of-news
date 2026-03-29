import os
import time
import logging
import textwrap
import re
import math
from urllib.parse import quote
from io import BytesIO
from typing import Dict, Any, List
import requests

logger = logging.getLogger(__name__)

try:
    from PIL import Image, ImageDraw, ImageFont
except ImportError:
    Image = ImageDraw = ImageFont = None
    logger.warning("Pillow not installed. Video generation will be unavailable.")

try:
    from moviepy import ImageClip, AudioFileClip, concatenate_videoclips
except ImportError:
    try:
        # Backward compatibility for older MoviePy builds.
        from moviepy.editor import ImageClip, AudioFileClip, concatenate_videoclips
    except ImportError:
        ImageClip = AudioFileClip = concatenate_videoclips = None
        logger.warning("MoviePy not installed. Video compilation will be unavailable.")

try:
    from gtts import gTTS
except ImportError:
    gTTS = None
    logger.warning("gTTS not installed. Audio generation will be unavailable.")


# --- Color palette ---
BG_COLORS = [
    (15, 15, 25),
    (20, 12, 28),
    (12, 18, 30),
    (25, 10, 15),
]
ACCENT = (192, 57, 43)
WHITE = (255, 255, 255)
DIM = (160, 160, 170)
HIGHLIGHT = (231, 76, 60)

# Highlight keywords for visual emphasis
HIGHLIGHT_WORDS = {
    'india', 'market', 'ai', 'breaking', 'surge', 'crash', 'growth',
    'billion', 'million', 'record', 'highest', 'lowest', 'crisis',
    'economy', 'stock', 'nifty', 'sensex', 'gdp', 'rbi', 'budget',
}

STOPWORDS = {
    "the", "and", "for", "with", "from", "that", "this", "news", "about",
    "into", "over", "under", "after", "before", "have", "has", "will",
    "your", "their", "where", "when", "which", "while", "today", "india",
}

LOCAL_CONTEXT_POOL = [
    "markets_hero.png",
    "tech_ai.png",
    "business_office.png",
    "feat_video_reels.png",
    "feat_rag_chat.png",
]

WIDTH, HEIGHT = 1280, 720
MARGIN = 80
FPS = 24
SLIDE_DURATION = 7


class VideoGenerationAgent:
    """Generates hackathon-grade MP4 news reels with transitions and highlights."""

    def __init__(self):
        self.backend_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        self.video_dir = os.path.join(self.backend_root, "static", "video")
        self.audio_dir = os.path.join(self.backend_root, "static", "audio")
        self.frontend_images_dir = os.path.abspath(
            os.path.join(self.backend_root, "..", "frontend", "public", "images")
        )

        os.makedirs(self.video_dir, exist_ok=True)
        os.makedirs(self.audio_dir, exist_ok=True)

    def _clip_with_duration(self, clip, duration: float):
        if hasattr(clip, "set_duration"):
            return clip.set_duration(duration)
        return clip.with_duration(duration)

    def _clip_with_audio(self, clip, audio_clip):
        if hasattr(clip, "set_audio"):
            return clip.set_audio(audio_clip)
        return clip.with_audio(audio_clip)

    def _audio_subclip(self, audio_clip, start: float, end: float):
        if hasattr(audio_clip, "subclip"):
            return audio_clip.subclip(start, end)
        return audio_clip.subclipped(start, end)

    def _create_gradient_canvas(self):
        img = Image.new("RGB", (WIDTH, HEIGHT), BG_COLORS[0])
        draw = ImageDraw.Draw(img)
        for y in range(HEIGHT):
            t = y / max(HEIGHT - 1, 1)
            r = int((1 - t) * 18 + t * 8)
            g = int((1 - t) * 16 + t * 10)
            b = int((1 - t) * 30 + t * 18)
            draw.line([(0, y), (WIDTH, y)], fill=(r, g, b))
        return img

    def _fit_cover(self, img: "Image.Image", target_w: int, target_h: int):
        src_w, src_h = img.size
        if src_w == 0 or src_h == 0:
            return img.resize((target_w, target_h))

        scale = max(target_w / src_w, target_h / src_h)
        new_w = max(1, int(src_w * scale))
        new_h = max(1, int(src_h * scale))
        resized = img.resize((new_w, new_h))
        left = max(0, (new_w - target_w) // 2)
        top = max(0, (new_h - target_h) // 2)
        return resized.crop((left, top, left + target_w, top + target_h))

    def _base_canvas(self, bg_color, bg_image: str = None):
        base = self._create_gradient_canvas().convert("RGBA")
        if bg_image and os.path.exists(bg_image):
            try:
                src = Image.open(bg_image).convert("RGB")
                img = self._fit_cover(src, WIDTH, HEIGHT).convert("RGBA")
                img = Image.blend(img, base, 0.38)
                shade = Image.new("RGBA", (WIDTH, HEIGHT), (6, 8, 14, 120))
                return Image.alpha_composite(img, shade).convert("RGB")
            except Exception:
                pass
        return base.convert("RGB")

    def _extract_query_terms(self, topic: str, script: str) -> str:
        words = re.findall(r"[A-Za-z]{4,}", f"{topic} {script}")
        terms = []
        seen = set()
        for word in words:
            w = word.lower()
            if w in STOPWORDS or w in seen:
                continue
            seen.add(w)
            terms.append(word)
            if len(terms) >= 5:
                break
        return " ".join(terms) if terms else topic

    def _scene_style_hint(self, scene_label: str) -> str:
        label = (scene_label or "").upper()
        hints = {
            "TITLE": "breaking financial news studio, city skyline at dusk",
            "KEY DEVELOPMENTS": "corporate boardroom, earnings report visuals, premium business mood",
            "DEEPER INSIGHTS": "data analysis desk, market intelligence screens, cinematic depth",
            "WHY IT MATTERS": "investor discussion, policy and macro economy visual metaphor",
            "MARKET IMPACT": "stock exchange floor, candlestick charts, high-energy market sentiment",
            "OUTRO": "modern AI newsroom, future of journalism, clean cinematic frame",
        }
        return hints.get(label, "financial newsroom, premium business visuals")

    def _build_scene_prompt(self, topic: str, scene_label: str, scene_text: str) -> str:
        scene_hint = self._scene_style_hint(scene_label)
        focus_terms = self._extract_query_terms(topic, scene_text)
        return (
            f"{scene_hint}, headline topic {topic}, key concepts {focus_terms}, "
            "realistic photo, cinematic lighting, 16:9 composition, professional color grading, "
            "high detail, no text, no watermark, no logo"
        )

    def _save_response_image(self, payload: bytes, out_path: str) -> bool:
        try:
            if not payload or len(payload) < 8000:
                return False
            img = Image.open(BytesIO(payload)).convert("RGB")
            img.save(out_path, quality=92)
            return True
        except Exception:
            return False

    def _download_from_urls(self, urls: List[str], out_path: str, timeout: int = 15) -> bool:
        for url in urls:
            try:
                resp = requests.get(url, timeout=timeout)
                if resp.ok and self._save_response_image(resp.content, out_path):
                    return True
            except Exception:
                continue
        return False

    def _pick_local_image(self, topic: str, scene_label: str, scene_text: str, out_path: str) -> bool:
        combined = f"{topic} {scene_label} {scene_text}".lower()
        preferred = "business_office.png"

        if any(k in combined for k in ["market", "sensex", "nifty", "stock", "ipo", "profit", "earnings"]):
            preferred = "markets_hero.png"
        elif any(k in combined for k in ["tech", "ai", "startup", "digital", "model", "agent"]):
            preferred = "tech_ai.png"
        elif any(k in combined for k in ["video", "anchor", "broadcast", "reel"]):
            preferred = "feat_video_reels.png"

        local_candidates = [preferred] + [n for n in LOCAL_CONTEXT_POOL if n != preferred]
        for name in local_candidates:
            local_path = os.path.join(self.frontend_images_dir, name)
            if not os.path.exists(local_path):
                continue
            try:
                img = Image.open(local_path).convert("RGB")
                img.save(out_path, quality=92)
                return True
            except Exception:
                continue
        return False

    def _generate_scene_image(self, topic: str, scene_label: str, scene_text: str, ts: int, idx: int) -> str:
        """Generate scene-specific visuals with local-first strategy for reliable latency."""
        out_path = os.path.join(self.video_dir, f"bg_{ts}_{idx}.jpg")
        prompt = self._build_scene_prompt(topic, scene_label, scene_text)
        encoded_prompt = quote(prompt, safe="")
        query = self._extract_query_terms(topic, scene_text)

        # 1) Local curated fallback first to keep endpoint latency stable.
        if self._pick_local_image(topic, scene_label, scene_text, out_path):
            return out_path

        # 2) Free text-to-image provider (no API key required).
        ai_urls = [
            f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1280&height=720&model=flux&nologo=true&seed={ts + idx}",
            f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1280&height=720&nologo=true&seed={ts + idx}",
        ]
        if self._download_from_urls(ai_urls, out_path, timeout=20):
            return out_path

        # 3) Free stock image fallback.
        web_urls = [
            f"https://source.unsplash.com/1600x900/?{query.replace(' ',',')},business,finance",
            f"https://source.unsplash.com/1600x900/?{topic.replace(' ',',')},economy,news",
        ]
        if self._download_from_urls(web_urls, out_path, timeout=12):
            return out_path

        # 4) Last safety fallback to guarantee a frame background.
        if self._pick_local_image(topic, scene_label, scene_text, out_path):
            return out_path

        return ""

    def _download_context_image(self, topic: str, script: str, ts: int) -> str:
        """Download a contextual image (no API key) for richer reel visuals."""
        query = self._extract_query_terms(topic, script)
        out_path = os.path.join(self.video_dir, f"bg_{ts}.jpg")

        # 1) Prefer local curated images so we always have a visible context image.
        topic_l = (topic or "").lower()
        preferred = "business_office.png"
        if any(k in topic_l for k in ["market", "sensex", "nifty", "stock", "ipo"]):
            preferred = "markets_hero.png"
        elif any(k in topic_l for k in ["tech", "ai", "startup", "digital"]):
            preferred = "tech_ai.png"

        local_candidates = [preferred] + [n for n in LOCAL_CONTEXT_POOL if n != preferred]
        for name in local_candidates:
            local_path = os.path.join(self.frontend_images_dir, name)
            if os.path.exists(local_path):
                try:
                    img = Image.open(local_path).convert("RGB")
                    img.save(out_path, quality=92)
                    return out_path
                except Exception:
                    continue

        # 2) Fallback to free web image sources.
        urls = [
            f"https://source.unsplash.com/1600x900/?{query.replace(' ',',')},news",
            f"https://source.unsplash.com/1600x900/?{topic.replace(' ',',')},business",
        ]

        for url in urls:
            try:
                resp = requests.get(url, timeout=12)
                if resp.ok and len(resp.content) > 10000:
                    img = Image.open(BytesIO(resp.content)).convert("RGB")
                    img.save(out_path, quality=90)
                    return out_path
            except Exception:
                continue
        return ""

    def _draw_anchor_panel(self, draw, font_sm, font_md):
        panel_top = HEIGHT - 130
        panel_bottom = HEIGHT - 36
        draw.rectangle([MARGIN - 10, panel_top, WIDTH - MARGIN + 10, panel_bottom], fill=(10, 12, 18, 220), outline=(55, 65, 78))

        # Anchor avatar block
        draw.ellipse([MARGIN + 4, panel_top + 12, MARGIN + 50, panel_top + 58], fill=(215, 74, 58))
        draw.text((MARGIN + 19, panel_top + 29), "AI", fill=WHITE, font=font_sm)

        draw.text((MARGIN + 60, panel_top + 17), "AINews Anchor", fill=WHITE, font=font_md)
        draw.rectangle([MARGIN + 60, panel_top + 47, MARGIN + 122, panel_top + 65], fill=ACCENT)
        draw.text((MARGIN + 67, panel_top + 50), "LIVE", fill=WHITE, font=font_sm)
        draw.text((MARGIN + 130, panel_top + 50), "AI NEWS OS", fill=DIM, font=font_sm)

        bars_x = WIDTH - MARGIN - 48
        for i, h in enumerate([8, 14, 20, 16, 11]):
            x = bars_x + i * 8
            draw.rectangle([x, panel_top + 58 - h, x + 4, panel_top + 58], fill=ACCENT)

    def _draw_context_card(self, img, draw, bg_image: str):
        """Draw a contextual visual card so users get visual context, not just text."""
        card_w, card_h = 380, 210
        x = WIDTH - MARGIN - card_w
        y = 168
        draw.rectangle([x, y, x + card_w, y + card_h], fill=(8, 12, 20, 170), outline=(85, 95, 110), width=2)

        has_image = False

        if bg_image and os.path.exists(bg_image):
            try:
                src = Image.open(bg_image).convert("RGB")
                fitted = self._fit_cover(src, card_w - 16, card_h - 48)
                img.paste(fitted, (x + 8, y + 8))
                has_image = True
            except Exception:
                pass

        if not has_image:
            inner_x, inner_y = x + 8, y + 8
            inner_w, inner_h = card_w - 16, card_h - 48
            draw.rectangle([inner_x, inner_y, inner_x + inner_w, inner_y + inner_h], fill=(10, 22, 40))

            for i in range(1, 6):
                yy = inner_y + int((inner_h / 6) * i)
                draw.line([(inner_x, yy), (inner_x + inner_w, yy)], fill=(24, 40, 62), width=1)
            for i in range(1, 8):
                xx = inner_x + int((inner_w / 8) * i)
                draw.line([(xx, inner_y), (xx, inner_y + inner_h)], fill=(20, 34, 56), width=1)

            points = []
            for i in range(10):
                px = inner_x + int(i * (inner_w / 9))
                py = inner_y + int(inner_h * (0.72 - 0.35 * (i / 9) + 0.08 * math.sin(i)))
                points.append((px, py))
            draw.line(points, fill=(231, 76, 60), width=3)
            for p in points:
                draw.ellipse([p[0] - 2, p[1] - 2, p[0] + 2, p[1] + 2], fill=WHITE)

        font_sm = self._get_font(14)
        draw.rectangle([x + 8, y + card_h - 34, x + card_w - 8, y + card_h - 8], fill=(12, 16, 25, 220))
        draw.text((x + 14, y + card_h - 28), "Visual Context", fill=WHITE, font=font_sm)

    def _draw_insight_bullets(self, draw, lines, x, y, font, max_width):
        cur_y = y
        for raw_line in lines[:2]:
            line = raw_line.strip()
            if not line:
                continue
            draw.ellipse([x, cur_y + 10, x + 8, cur_y + 18], fill=ACCENT)
            wrapped = textwrap.wrap(line, width=38)
            for i, piece in enumerate(wrapped):
                draw.text((x + 16, cur_y + i * (font.size + 6)), piece, fill=WHITE, font=font)
            cur_y += len(wrapped) * (font.size + 6) + 12

    def _split_sentences(self, text: str):
        parts = re.split(r'(?<=[.!?])\s+', (text or '').replace('\n', ' ').strip())
        return [p.strip() for p in parts if len(p.strip()) > 8]

    async def create_news_video(self, title: str, content: str) -> Dict[str, Any]:
        """Entry point called by the API endpoint.
        Generates a broadcast-quality script then renders full MP4 + audio."""
        # Step 1: Generate script using Groq/LLM if available, else build from content
        script = await self._generate_script(title, content)
        # Step 2: Render the full video reel
        result = await self.generate_reel(topic=title, script=script)
        result["script"] = script
        return result

    async def create_script_audio_preview(self, title: str, content: str) -> Dict[str, Any]:
        """Generate only script + TTS audio for async compile kickoff."""
        if not gTTS:
            return {"error": "gTTS is not installed for audio generation."}

        script = await self._generate_script(title, content)
        ts = int(time.time())
        audio_path = os.path.join(self.audio_dir, f"reel_{ts}.mp3")

        try:
            tts = gTTS(text=script[:800], lang='en', slow=False)
            tts.save(audio_path)
        except Exception as e:
            logger.error(f"Preview audio generation failed: {e}")
            return {"error": f"Audio generation failed: {e}"}

        return {
            "script": script,
            "audio_url": f"/static/audio/reel_{ts}.mp3",
            "scene_count": 0,
            "visual_mode": "script_audio_preview",
        }

    async def _generate_script(self, title: str, content: str) -> str:
        """Generate a broadcast news script using Groq LLM, with a local fallback."""
        try:
            from app.core.config import settings
            if settings.GROQ_API_KEY:
                from langchain_groq import ChatGroq
                from langchain_core.messages import HumanMessage, SystemMessage
                llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0.4,
                               api_key=settings.GROQ_API_KEY)
                system = SystemMessage(content=(
                    "You are a professional TV news anchor and broadcast writer. Write an engaging, detailed 60-90 second broadcast script "
                    "for the following news story. The video will feature animated data visuals and contextual overlays. "
                    "Use present tense, short sentences, and vivid language. Include an opening hook, 3-4 key data points/facts, "
                    "business and market impact, and a strong closing line. Output ONLY the script text without any stage directions or labels."
                ))
                human = HumanMessage(content=f"Headline: {title}\n\nContext: {content[:600]}")
                response = await llm.ainvoke([system, human])
                return response.content.strip()
        except Exception as e:
            logger.warning(f"LLM script generation failed, using fallback: {e}")

        # Local fallback — structured script from content
        sentences = [s.strip() for s in content.replace('\n', ' ').split('.') if len(s.strip()) > 20]
        lead = sentences[0] if sentences else title
        body = '. '.join(sentences[1:3]) if len(sentences) > 1 else "This is a developing story with significant market implications."
        outro = "Stay ahead with AI News OS — your intelligent news companion."
        return f"Breaking news: {title}. {lead}. {body}. {outro}"

    def _get_font(self, size):
        for path in [
            "C:/Windows/Fonts/arialbd.ttf",
            "C:/Windows/Fonts/arial.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
            "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        ]:
            if os.path.exists(path):
                return ImageFont.truetype(path, size)
        return ImageFont.load_default()

    def _draw_progress_bar(self, draw, slide_idx, total_slides):
        bar_y = HEIGHT - 24
        bar_w = WIDTH - MARGIN * 2
        progress = (slide_idx + 1) / total_slides
        # Background
        draw.rectangle([MARGIN, bar_y, MARGIN + bar_w, bar_y + 6], fill=(40, 40, 50))
        # Fill
        draw.rectangle([MARGIN, bar_y, MARGIN + int(bar_w * progress), bar_y + 6], fill=ACCENT)

    def _draw_scene_counter(self, draw, slide_idx, total_slides, font):
        text = f"{slide_idx + 1}/{total_slides}"
        draw.text((WIDTH - MARGIN - 60, 30), text, fill=DIM, font=font)

    def _draw_branding(self, draw, font_sm):
        # Top bar
        draw.rectangle([0, 0, WIDTH, 4], fill=ACCENT)
        # LIVE badge
        draw.rectangle([MARGIN, 24, MARGIN + 50, 46], fill=ACCENT)
        draw.text((MARGIN + 8, 26), "LIVE", fill=WHITE, font=font_sm)
        # Brand
        draw.text((MARGIN + 62, 26), "AI NEWS OS", fill=DIM, font=font_sm)

    def _draw_highlighted_text(self, draw, text, x, y, font, max_width):
        """Draw text with keyword highlighting."""
        words = text.split()
        current_x = x
        current_y = y
        line_height = font.size + 8

        for word in words:
            clean = word.lower().strip('.,!?:;')
            bbox = draw.textbbox((0, 0), word + ' ', font=font)
            word_w = bbox[2] - bbox[0]

            if current_x + word_w > max_width:
                current_x = x
                current_y += line_height

            color = HIGHLIGHT if clean in HIGHLIGHT_WORDS else WHITE
            draw.text((current_x, current_y), word + ' ', fill=color, font=font)
            current_x += word_w

        return current_y + line_height

    def _create_title_frame(self, headline, bg_color, bg_image=None, slide_idx=0, total_slides=6):
        """Create the opening title frame."""
        img = self._base_canvas(bg_color, bg_image)
        draw = ImageDraw.Draw(img)
        font_lg = self._get_font(42)
        font_sm = self._get_font(16)
        font_md = self._get_font(20)

        self._draw_branding(draw, font_sm)

        # Center headline
        wrapped = textwrap.wrap(headline, width=30)[:4]
        total_h = len(wrapped) * 56
        start_y = (HEIGHT - total_h) // 2 - 20

        # Add a subtle panel behind the headline for stronger contrast and cleaner look.
        panel_left = 170
        panel_right = WIDTH - 430
        panel_top = max(120, start_y - 28)
        panel_bottom = min(HEIGHT - 190, start_y + total_h + 40)
        draw.rectangle(
            [panel_left, panel_top, panel_right, panel_bottom],
            fill=(10, 16, 26, 168),
            outline=(56, 72, 94),
            width=2,
        )

        for i, line in enumerate(wrapped):
            bbox = draw.textbbox((0, 0), line, font=font_lg)
            line_w = bbox[2] - bbox[0]
            draw.text(((WIDTH - line_w) // 2, start_y + i * 56), line, fill=WHITE, font=font_lg)

        # Decorative line under title
        draw.rectangle([(WIDTH // 2 - 60), start_y + len(wrapped) * 56 + 10,
                        (WIDTH // 2 + 60), start_y + len(wrapped) * 56 + 14], fill=ACCENT)

        # Bottom tag
        draw.text((MARGIN, HEIGHT - 60), "BREAKING NEWS ALERT", fill=ACCENT, font=font_sm)
        self._draw_anchor_panel(draw, font_sm, font_md)

        self._draw_progress_bar(draw, slide_idx, total_slides)
        self._draw_scene_counter(draw, slide_idx, total_slides, font_sm)

        return img

    def _create_content_frame(self, text, slide_idx, total_slides, bg_color, section_label="ANALYSIS", bg_image=None, show_context=False):
        """Create a content slide with keyword highlighting."""
        img = self._base_canvas(bg_color, bg_image)
        draw = ImageDraw.Draw(img)
        font_body = self._get_font(24)
        font_sm = self._get_font(16)
        font_label = self._get_font(14)
        font_md = self._get_font(20)

        self._draw_branding(draw, font_sm)

        # Section label
        draw.rectangle([MARGIN, 70, MARGIN + len(section_label) * 10 + 16, 92], fill=ACCENT)
        draw.text((MARGIN + 8, 72), section_label, fill=WHITE, font=font_label)

        # Headline strip
        draw.rectangle([MARGIN, 112, WIDTH - MARGIN, 162], fill=(12, 16, 24), outline=(70, 80, 92))
        top_line = textwrap.shorten(text, width=85, placeholder="...")
        draw.text((MARGIN + 14, 126), top_line, fill=WHITE, font=font_body)

        # Insight bullets for better context scanning.
        sentence_bits = self._split_sentences(text)
        self._draw_insight_bullets(draw, sentence_bits, MARGIN, 188, self._get_font(20), WIDTH - MARGIN - 420)
        if show_context:
            self._draw_context_card(img, draw, bg_image)

        # Bottom ticker
        draw.rectangle([0, HEIGHT - 50, WIDTH, HEIGHT - 46], fill=(40, 40, 50))
        draw.text((MARGIN, HEIGHT - 44), "AI NEWS OS  |  Powered by Multi-Agent Intelligence", fill=DIM, font=font_sm)
        self._draw_anchor_panel(draw, font_sm, font_md)

        self._draw_progress_bar(draw, slide_idx, total_slides)
        self._draw_scene_counter(draw, slide_idx, total_slides, font_sm)

        return img

    def _create_outro_frame(self, bg_color, bg_image=None, slide_idx=5, total_slides=6):
        """Create an ending frame."""
        img = self._base_canvas(bg_color, bg_image)
        draw = ImageDraw.Draw(img)
        font_lg = self._get_font(48)
        font_md = self._get_font(24)
        font_sm = self._get_font(16)

        self._draw_branding(draw, font_sm)

        # Central content
        text1 = "AI News OS"
        bbox = draw.textbbox((0, 0), text1, font=font_lg)
        draw.text(((WIDTH - bbox[2] + bbox[0]) // 2, HEIGHT // 2 - 60), text1, fill=WHITE, font=font_lg)

        text2 = "The Future of News is Here"
        bbox2 = draw.textbbox((0, 0), text2, font=font_md)
        draw.text(((WIDTH - bbox2[2] + bbox2[0]) // 2, HEIGHT // 2 + 10), text2, fill=ACCENT, font=font_md)

        text3 = "ET Hackathon 2026"
        bbox3 = draw.textbbox((0, 0), text3, font=font_sm)
        draw.text(((WIDTH - bbox3[2] + bbox3[0]) // 2, HEIGHT // 2 + 55), text3, fill=DIM, font=font_sm)
        self._draw_anchor_panel(draw, font_sm, font_md)

        self._draw_progress_bar(draw, slide_idx, total_slides)
        self._draw_scene_counter(draw, slide_idx, total_slides, font_sm)
        return img

    async def generate_reel(self, topic: str, script: str) -> Dict[str, Any]:
        """Generate a full MP4 reel with transitions, highlights, and audio."""
        if not Image or not ImageClip or not gTTS:
            return {"error": "Video dependencies (Pillow, MoviePy, gTTS) not installed."}

        ts = int(time.time())
        audio_path = os.path.join(self.audio_dir, f"reel_{ts}.mp3")
        video_path = os.path.join(self.video_dir, f"reel_{ts}.mp4")

        # Split script into sections
        sentences = self._split_sentences(script)
        if len(sentences) < 2:
            sentences = [script[:200], script[200:400] if len(script) > 200 else "Stay informed with AI News OS."]

        headline = sentences[0][:120]
        body_1 = '. '.join(sentences[1:3])[:320] if len(sentences) > 1 else "Breaking developments in this story."
        body_2 = '. '.join(sentences[3:5])[:320] if len(sentences) > 3 else "AI News OS delivers real-time intelligence."
        body_3 = '. '.join(sentences[5:7])[:320] if len(sentences) > 5 else "What this means for markets and users right now."
        insight = f"Why it matters: {topic} influences investor behavior, policy interpretation, and near-term market positioning."

        # Generate audio
        try:
            tts = gTTS(text=script[:800], lang='en', slow=False)
            tts.save(audio_path)
        except Exception as e:
            logger.error(f"TTS error: {e}")
            return {"error": f"Audio generation failed: {e}"}

        # Create frames
        try:
            frame_specs = [
                ("TITLE", headline),
                ("KEY DEVELOPMENTS", body_1),
                ("DEEPER INSIGHTS", body_2),
                ("WHY IT MATTERS", insight),
                ("MARKET IMPACT", body_3),
                ("OUTRO", "Stay ahead with AI News OS."),
            ]

            scene_images = []
            for idx, (label, text) in enumerate(frame_specs):
                scene_images.append(self._generate_scene_image(topic, label, text, ts, idx))

            frames = []
            total_slides = len(frame_specs)
            for idx, (label, text) in enumerate(frame_specs):
                bg_image = scene_images[idx] if idx < len(scene_images) else ""
                if label == "TITLE":
                    frames.append(self._create_title_frame(headline, BG_COLORS[idx % len(BG_COLORS)], bg_image=bg_image, slide_idx=idx, total_slides=total_slides))
                elif label == "OUTRO":
                    frames.append(self._create_outro_frame(BG_COLORS[idx % len(BG_COLORS)], bg_image=bg_image, slide_idx=idx, total_slides=total_slides))
                else:
                    # Keep visual context panel only on intro/outro for a cleaner broadcast look.
                    frames.append(self._create_content_frame(text, idx, total_slides, BG_COLORS[idx % len(BG_COLORS)], label, bg_image=bg_image, show_context=False))

            # Tune slide duration to audio length for more natural pacing.
            per_slide_duration = SLIDE_DURATION
            try:
                preview_audio = AudioFileClip(audio_path)
                per_slide_duration = max(5, min(10, int(preview_audio.duration / max(total_slides, 1)) + 1))
                preview_audio.close()
            except Exception:
                per_slide_duration = SLIDE_DURATION

            # Build video clips with crossfade
            clips = []
            for i, frame in enumerate(frames):
                frame_path = os.path.join(self.video_dir, f"frame_{ts}_{i}.png")
                frame.save(frame_path)
                clip = self._clip_with_duration(ImageClip(frame_path), per_slide_duration)
                if i > 0 and hasattr(clip, "crossfadein"):
                    clip = clip.crossfadein(0.5)
                clips.append(clip)

            video = concatenate_videoclips(clips, method="compose")
            audio = AudioFileClip(audio_path)
            video = self._clip_with_audio(video, self._audio_subclip(audio, 0, min(audio.duration, video.duration)))
            video.write_videofile(video_path, fps=FPS, codec="libx264", audio_codec="aac",
                                 logger=None, threads=2)

            # Cleanup temp frames
            for i in range(len(frames)):
                fp = os.path.join(self.video_dir, f"frame_{ts}_{i}.png")
                if os.path.exists(fp):
                    os.remove(fp)
            for bg_image in scene_images:
                if bg_image and os.path.exists(bg_image):
                    os.remove(bg_image)

            return {
                "video_url": f"/static/video/reel_{ts}.mp4",
                "audio_url": f"/static/audio/reel_{ts}.mp3",
                "scene_count": total_slides,
                "visual_mode": "scene_t2i_with_fallback",
            }
        except Exception as e:
            logger.error(f"Video compilation error: {e}")
            return {"error": f"Video compilation failed: {e}"}
