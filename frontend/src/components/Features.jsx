import { useState } from 'react'

const FEATURE_DETAILS = [
  {
    img: '/images/feat_personalized.png',
    title: 'Hyper-Personalized Feed',
    desc: 'AI ranks news by YOUR interests and portfolio. Not algorithm bubbles — genuine financial intelligence.',
    diagram: ['User Interests', 'Preference Engine', 'Scoring Agent', 'Ranked Feed'],
    explanation: 'When you sign up, you select your interests (Markets, Tech, AI, etc.). Our Personalization Agent scores every incoming article against your interest profile using TF-IDF similarity and topic matching. Articles are then ranked by relevance score × recency × source credibility, delivering a feed that\'s uniquely yours. The more you interact, the smarter it gets.',
    agents: ['Personalization Agent', 'User Profile DB', 'Interest Vector Store'],
    kpis: ['Ranked Feed', 'Interest Match', 'Real Time'],
    color: '#e74c3c'
  },
  {
    img: '/images/feat_rag_chat.png',
    title: 'RAG-Powered Chat',
    desc: 'Ask anything. AI retrieves real sources, reasons over them, and answers with citations. Zero hallucination.',
    diagram: ['User Query', 'Router Agent', 'FAISS Vector Search', 'LLM (Groq)', 'Cited Response'],
    explanation: 'Your question first passes through a Router Agent that classifies intent (explain, summarize, compare, predict). It then performs Retrieval-Augmented Generation: searching the FAISS vector index for the 5 most relevant news documents. These are injected as context into the LLM prompt, ensuring answers are grounded in real, verified news — not hallucinated. A Trust Layer computes confidence scores (0-100%) based on source diversity and relevance.',
    agents: ['Router Agent', 'RAG Engine (FAISS)', 'Groq LLM (Llama 3.1)', 'Trust Layer'],
    kpis: ['Cited Answers', 'Low Hallucination', 'Confidence Score'],
    color: '#3498db'
  },
  {
    img: '/images/feat_video_reels.png',
    title: 'AI Video Reels',
    desc: '60-second cinematic news videos — voice narration, animated scenes, fully automated.',
    diagram: ['News Headline', 'Script Generator (LLM)', 'TTS Engine (gTTS)', 'Video Composer (MoviePy)', 'MP4 Output'],
    explanation: 'Enter any headline and the Video Generation Agent creates a full production pipeline: (1) LLM generates a broadcast-quality script, (2) gTTS converts it to voice-over audio, (3) MoviePy composites animated slides with crossfade transitions, progress bars, keyword highlighting, and scene counters. The final MP4 is rendered locally — no paid video APIs needed.',
    agents: ['Video Generation Agent', 'LLM Script Writer', 'gTTS Audio', 'MoviePy Compositor'],
    kpis: ['Anchor Style', 'MP4 Output', 'Voiceover'],
    color: '#2ecc71'
  },
  {
    img: '/images/feat_story_arc.png',
    title: 'Story Arc Tracker',
    desc: 'Follow ongoing stories like a Netflix series: timeline, sentiment trend, AI-powered predictions.',
    diagram: ['Topic Input', 'News Retrieval', 'Timeline Builder (LLM)', 'Sentiment Analyzer', 'Prediction Engine'],
    explanation: 'Enter any topic (e.g., "Markets Today") and the Story Arc Agent retrieves all related articles, then uses the LLM to construct a chronological timeline of events. Each event is annotated with sentiment (Bullish/Bearish/Neutral), impact level (High/Medium/Low), and key players. Finally, the AI generates a forward-looking prediction based on the arc trajectory.',
    agents: ['Story Arc Agent', 'RAG Retrieval', 'Sentiment Analyzer', 'Prediction LLM'],
    kpis: ['Timeline', 'Sentiment', 'Prediction'],
    color: '#9b59b6'
  },
  {
    img: '/images/feat_vernacular.png',
    title: 'Vernacular Engine',
    desc: 'Read any article in Hindi, Gujarati, Tamil, Bengali or simplified English. Contextual, not just translated.',
    diagram: ['Source Article', 'Context Analyzer', 'LLM Translator', 'Reading Level Adapter', 'Localized Output'],
    explanation: 'The Vernacular Intelligence Engine goes beyond Google Translate. It uses the LLM to contextually translate news while preserving financial terminology, cultural context, and nuance. You can choose from 12 Indian languages (Hindi, Gujarati, Tamil, Bengali, etc.) and 4 reading levels (Beginner to Expert, or "Explain like I\'m 5"). The output reads naturally in the target language.',
    agents: ['Vernacular Agent', 'Groq LLM', 'Reading Level Classifier'],
    kpis: ['12 Languages', '4 Reading Levels', 'Context Aware'],
    color: '#f39c12'
  },
  {
    img: '/images/feat_zero_latency.png',
    title: 'Zero-Latency Ingestion',
    desc: 'NewsData.io + ET RSS hybrid pipeline. 90K+ sources indexed, deduplicated, and searchable instantly.',
    diagram: ['NewsData.io API', 'Ingestion Agent', 'Deduplicator', 'FAISS Indexer', 'PostgreSQL Store'],
    explanation: 'The Ingestion Agent runs a 6-stage pipeline every 5 minutes: (1) Fetch from NewsData.io API with smart pagination, (2) Parse and normalize article schema, (3) Deduplicate against existing titles using similarity matching, (4) Store in PostgreSQL with category tagging, (5) Index content into FAISS vector store for RAG search, (6) Trigger Summarizer Agent for TL;DR generation. The app shows a LIVE badge when actively syncing.',
    agents: ['Ingestion Agent', 'Summarizer Agent', 'FAISS Indexer', 'PostgreSQL', 'Deduplicator'],
    kpis: ['Live RSS', 'Multi Source', 'Auto Sync'],
    color: '#1abc9c'
  },
]

export default function Features() {
  const [activeFeature, setActiveFeature] = useState(null)

  return (
    <>
      <div id="features" className="features-grid">
        {FEATURE_DETAILS.map((f, i) => (
          <div
            key={i}
            className="feat-card reveal-up"
            style={{ animationDelay: `${i * 0.08}s`, cursor: 'pointer', borderTop: `3px solid ${f.color}` }}
            onClick={() => setActiveFeature(f)}
          >
            <div className="feat-image-stage">
              <img src={f.img} alt={f.title} className="feat-image" />
            </div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
            <div className="feat-kpi-row">
              {f.kpis.map((kpi, kpiIdx) => (
                <span key={kpiIdx} className="feat-kpi">{kpi}</span>
              ))}
            </div>
            <div className="feat-click-hint">Click to explore →</div>
          </div>
        ))}
      </div>

      {/* Feature Detail Modal */}
      {activeFeature && (
        <div className="feature-modal-backdrop" onClick={() => setActiveFeature(null)}>
          <div className="feature-modal" onClick={e => e.stopPropagation()}>
            <button className="feature-modal-close" onClick={() => setActiveFeature(null)}>✕</button>

            <div className="feature-modal-header" style={{ borderBottom: `3px solid ${activeFeature.color}` }}>
              <h2>{activeFeature.title}</h2>
              <p className="feature-modal-subtitle">System Architecture & Flow</p>
            </div>

            {/* Flow Diagram */}
            <div className="feature-diagram">
              {activeFeature.diagram.map((step, i) => (
                <div key={i} className="diagram-step">
                  <div className="diagram-node" style={{ borderColor: activeFeature.color, color: activeFeature.color }}>
                    <span className="diagram-num">{i + 1}</span>
                    {step}
                  </div>
                  {i < activeFeature.diagram.length - 1 && (
                    <div className="diagram-arrow" style={{ color: activeFeature.color }}>→</div>
                  )}
                </div>
              ))}
            </div>

            {/* Explanation */}
            <div className="feature-explanation">
              <h4>How It Works</h4>
              <p>{activeFeature.explanation}</p>
            </div>

            {/* Agents Involved */}
            <div className="feature-agents">
              <h4>Agents & Components</h4>
              <div className="agent-chips">
                {activeFeature.agents.map((a, i) => (
                  <span key={i} className="agent-chip" style={{ borderColor: activeFeature.color, color: activeFeature.color }}>
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
