# AI News OS: The "Netflix of News" 

> **Empowering the future of journalism with multi-agentic AI, real-time RAG, and immersive story tracking.**

AI News OS is a premium, data-driven news intelligence platform designed for the **ET Hackathon - Problem Statement 8 (AI-Native News Experience)**. It transforms the traditional static newspaper experience into a dynamic, "Netflix-style" consumption model featuring 3D backgrounds, glassmorphism, advanced AI agents, and personalized, contextual intelligence.

We are not building a news app — we are building an AI that *thinks for you before you read news*.

---

## 🌟 Key Functionalities

### 1. 🧠 Hyper-Personalized News Brain
Context-aware intelligence that doesn't just recommend articles but explains *why* they matter to you.
- Input: User profile (student, investor, founder), portfolio, behavioral history.
- Output: Personalized insights like "3 things affecting your portfolio today" or "Opportunities you might be missing".

### 2. 🎬 AI Video Reels
Automatically generate 15-20 second news reels with **AI-generated scripts** and **high-fidelity voiceovers** (gTTS). Turns textual news into engaging visual reels perfect for quick consumption on the go, complete with interactive UI elements.

### 3. 📈 Story Arc Tracker & Command Center
Follow complex news stories as they evolve over time like a Netflix series. High-end, data-driven terminal experience featuring:
- **Timeline construction & Key events tracking**
- **Impact Badges** (Policy, Economic, Market)
- **Sentiment Analysis** (Bullish / Bearish / Neutral trend graphs)
- **Dynamic Analytics Dashboard**: Metric cards, animated progress bars, sparklines, and donut charts updating in real-time.

### 4. 🌐 Vernacular Intelligence Engine
Consuming news natively with contextual explanation, not just bare translation. Supports languages like **Hindi, Tamil, Bengali, Marathi, and more**.
- **Native Script Enforcement**: Real Devanagari/Tamil characters.
- **Persona-Based Context**: Adjustable translation levels from "Beginner" to "Expert" to help everyone understand complex financial news.

### 5. 🤖 RAG-Powered AI Navigator
A state-of-the-art **Retrieval-Augmented Generation (RAG)** engine using **FAISS** and **HuggingFace Embeddings** to answer complex queries based *only* on verified news content. Replace wading through 10 articles with ONE interactive, structured intelligence briefing.

### 6. 🗂️ Categorical News Navigation
A robust ingestion system fetching real-time news across **10+ categories** (Markets, Tech, Business, Politics, Sports, Health, Entertainment, Science, World, and Environment) with an Auto-Sync feature maintaining constant freshness.

---

## 💡 Innovation & Advantages

- **Multi-Agent Pipeline**: Dedicated, coordinated agents taking news through a pipeline: `Ingest → Process → Understand → Personalize → Deliver → Interact`.
- **Insight Over Information**: Stops the endless scroll by prioritizing synthesized intelligence and insights above raw text. 
- **Immersive "Premium" UI/UX**: Built with custom cursor styling, glassmorphism, smooth micro-animations, tailored palettes, and an engaging Command Center terminal aesthetic.
- **Interactive Briefings**: Instead of passive reading, users interact with an AI Navigator that briefs them intelligently on complex ongoing stories.
- **Deep Personalization Engine**: Merging user embeddings with news vectors to pinpoint exact relevancy for every individual reader.

---

## 🛠️ Tech Stack

### AI / ML
- **LLM**: Llama 3.3 70B (via Groq)
- **RAG System**: Retrieval-Augmented Generation using HuggingFace Embeddings (Sentence-Transformers)
- **Vector Database**: FAISS

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL (SQLAlchemy ORM)
- **Utilities**: gTTS (Voice generation), NewsData.io (Real-time ingestion)
- **Multi-Agent Flow**: LangChain / Custom Python routing

### Frontend
- **Framework**: React 18 + Vite
- **UI/UX**: Vanilla CSS for maximum flexibility (Global Token System, Glassmorphism, Masthead animations, Dark Mode Terminal Aesthetics)
- **Icons**: Custom Newspaper Serif icons

---

## 🚀 Getting Started (Running Commands)

### 1. Prerequisites
- Python 3.9+
- Node.js 18+
- PostgreSQL
- API Keys: `NEWSDATA_API_KEY`, `GROQ_API_KEY`

### 2. Backend Setup
```bash
cd backend
python -m venv .venv
# Activate environment
source .venv/bin/activate  # Mac/Linux
.\.venv\Scripts\activate   # Windows

pip install -r requirements.txt
cp .env.example .env       # IMPORTANT: Fill in your API keys in the .env file
python run_migration.py    # Run DB migrations to setup schema
python seed_news.py        # Seed DB with the latest news
python -m uvicorn app.main:app --port 8005 --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Open **http://localhost:5173** in your browser to experience the OS.

---

## 📜 License
Created by **Shrey Panwala** for the ET Hackathon. 

[![GitHub Stars](https://img.shields.io/github/stars/Shrey-Panwala/netflix-of-news?style=social)](https://github.com/Shrey-Panwala/netflix-of-news)
