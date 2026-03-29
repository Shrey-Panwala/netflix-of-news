import { useState, useEffect, useRef } from 'react'

const INTERESTS = [
  'Markets', 'AI & Tech', 'Startups', 'Crypto', 'Sports',
  'Politics', 'Business', 'Health', 'Science', 'Entertainment',
  'IPO & Equity', 'Gold & Commodities', 'Global Trade'
]

const CLOUD_WORDS = [
  'Artificial Intelligence', 'Markets', 'Blockchain', 'Sensex', 'Economy',
  'Neural Networks', 'Deep Learning', 'FinTech', 'Global Trade', 'Startups',
  'Data', 'Analytics', 'Algorithms', 'News', 'Insights', 'Prediction',
  'NLP', 'GPT', 'Agents', 'RAG', 'Sentiment', 'Portfolio', 'IPO',
  'Nifty', 'Commodities', 'Innovation', 'Machine Learning', 'Automation',
  'Real-time', 'Intelligence', 'Summarize', 'Translate', 'Video',
  'Personalize', 'ETF', 'Bonds', 'Equity', 'Forex', 'Crypto',
  'Breaking', 'Analysis', 'Research', 'Forecast', 'Trending',
  'RBI', 'Budget', 'GDP', 'Inflation', 'FII', 'DII', 'NSE', 'BSE',
  'Adani', 'Tata', 'Reliance', 'Infosys', 'TCS', 'HDFC',
  'LLM', 'Vector', 'FAISS', 'Embeddings', 'Knowledge', 'Context',
  'India', 'Growth', 'Recession', 'Bull', 'Bear', 'Hedge',
  'OpenAI', 'Groq', 'Llama', 'FastAPI', 'React', 'Python',
]

function WordCloud({ mousePos }) {
  const words = useRef(
    CLOUD_WORDS.map((word) => ({
      word,
      x: Math.random() * 96 + 2,
      y: Math.random() * 96 + 2,
      size: ['AI', 'News', 'Intelligence', 'Markets', 'Sensex', 'India'].includes(word)
        ? 1.6 + Math.random() * 0.8
        : 0.75 + Math.random() * 0.7,
      rotation: (Math.random() - 0.5) * 40,
      delay: Math.random() * 10,
      duration: 7 + Math.random() * 9,
      opacity: ['AI', 'News', 'Intelligence', 'Markets'].includes(word)
        ? 0.32 + Math.random() * 0.15
        : 0.14 + Math.random() * 0.16,
      z: Math.random() * 100,
    }))
  ).current

  return (
    <div className="word-cloud-container">
      {words.map((w, i) => {
        const px = mousePos ? (mousePos.x - 0.5) * (w.z / 100) * -25 : 0
        const py = mousePos ? (mousePos.y - 0.5) * (w.z / 100) * -25 : 0
        const isHighlight = ['AI', 'News', 'Intelligence', 'Markets', 'Sensex', 'India', 'GPT', 'RAG'].includes(w.word)
        return (
          <span
            key={i}
            className={`cloud-word${isHighlight ? ' cloud-word-highlight' : ''}`}
            style={{
              left: `${w.x}%`,
              top: `${w.y}%`,
              fontSize: `${w.size}rem`,
              transform: `rotate(${w.rotation}deg) translate(${px}px, ${py}px)`,
              animationDelay: `${w.delay}s`,
              animationDuration: `${w.duration}s`,
              opacity: w.opacity,
            }}
          >
            {w.word}
          </span>
        )
      })}
    </div>
  )
}

export default function AuthPage({ onLogin, apiBase }) {
  const brandLogo = '/netflix-of-news-logo.png'
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mousePos, setMousePos] = useState(null)

  function handleMouseMove(e) {
    const rect = e.currentTarget.getBoundingClientRect()
    setMousePos({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top) / rect.height,
    })
  }

  function toggleInterest(i) {
    setSelected(s => s.includes(i) ? s.filter(x => x !== i) : [...s, i])
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!email.trim()) { setError('Email is required'); return }
    if (mode === 'signup' && !name.trim()) { setError('Name is required'); return }
    if (mode === 'signup' && selected.length < 2) { setError('Select at least 2 interests'); return }
    setLoading(true)
    try {
      const url = mode === 'signup' ? `${apiBase}/auth/register` : `${apiBase}/auth/login`
      const body = mode === 'signup'
        ? { email, full_name: name, preferences: selected }
        : { email }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.detail || 'Something went wrong'); return }
      onLogin(data.user)
    } catch {
      setError('Cannot connect to backend. Is it running on port 8005?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page" onMouseMove={handleMouseMove}>
      <WordCloud mousePos={mousePos} />

      <div className="auth-card">
        {/* Red 3D corner accents */}
        <div className="auth-card-corner tl" />
        <div className="auth-card-corner tr" />
        <div className="auth-card-corner bl" />
        <div className="auth-card-corner br" />

        <div className="auth-header">
          <div className="auth-brand-emblem">
            <img className="brand-logo-mark auth-brand-logo" src={brandLogo} alt="Netflix of News logo" />
          </div>
          <h1>
            <span className="auth-brand-line auth-brand-netflix">Netflix</span>
            <span className="auth-brand-line auth-brand-of">of</span>
            <span className="auth-brand-line auth-brand-news">News</span>
          </h1>
          <p className="auth-tagline">The Future of News is Here</p>
        </div>

        <div className="auth-tabs">
          <button className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>Login</button>
          <button className={mode === 'signup' ? 'active' : ''} onClick={() => setMode('signup')}>Sign Up</button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <div className="auth-field">
              <label>Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Enter your name" />
            </div>
          )}
          <div className="auth-field">
            <label>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
          </div>
          {mode === 'signup' && (
            <div className="auth-field">
              <label>Select Interests <span className="hint">(min 2)</span></label>
              <div className="interest-chips">
                {INTERESTS.map(i => (
                  <button key={i} type="button"
                    className={`interest-chip ${selected.includes(i) ? 'selected' : ''}`}
                    onClick={() => toggleInterest(i)}>{i}</button>
                ))}
              </div>
            </div>
          )}
          {error && <div className="auth-error">{error}</div>}
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Login'}
          </button>
        </form>

        <p className="auth-switch">
          {mode === 'login'
            ? <>New here? <button onClick={() => setMode('signup')}>Create an account</button></>
            : <>Already registered? <button onClick={() => setMode('login')}>Login</button></>}
        </p>

        <div className="auth-footer">
          <span>Powered by Artificial Intelligence</span>
          <span>Economic Times Hackathon 2026</span>
        </div>
      </div>
    </div>
  )
}
