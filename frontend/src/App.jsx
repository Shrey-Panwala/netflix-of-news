import { useState, useEffect } from 'react'
import './index.css'
import AuthPage from './components/AuthPage'
import Masthead from './components/Masthead'
import Ticker from './components/Ticker'
import PaperHero from './components/PaperHero'
import NewsFeed from './components/NewsFeed'
import DailyBrief from './components/DailyBrief'
import StoryArc from './components/StoryArc'
import Features from './components/Features'
import VideoReel from './components/VideoReel'
import ChatDrawer from './components/ChatDrawer'
import ArticleModal from './components/ArticleModal'
import PaperFooter from './components/PaperFooter'
import CursorSparkle from './components/CursorSparkle'

const API = import.meta.env.VITE_API_BASE || 'http://localhost:8005/api/v1'
const LIVE_SYNC_INTERVAL = 2 * 60 * 1000 // 2 minutes

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light')
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('ainews_user')
    return saved ? JSON.parse(saved) : null
  })
  const [heroArticles, setHeroArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedArticle, setSelectedArticle] = useState(null)
  const [chatOpen, setChatOpen] = useState(false)
  const [liveStatus, setLiveStatus] = useState('idle')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light')

  async function loadHeroArticles(currentUser) {
    if (!currentUser) return

    const userId = currentUser.id ? `&user_id=${currentUser.id}` : ''
    const primaryUrl = `${API}/feed/personalized?limit=18${userId}`
    const fallbackUrl = `${API}/feed/personalized?limit=24`

    try {
      const primaryRes = await fetch(primaryUrl)
      const primaryData = primaryRes.ok ? await primaryRes.json() : null
      const primaryArticles = primaryData?.articles || []

      let mergedArticles = primaryArticles
      if (primaryArticles.length < 8) {
        const fallbackRes = await fetch(fallbackUrl)
        const fallbackData = fallbackRes.ok ? await fallbackRes.json() : null
        const fallbackArticles = fallbackData?.articles || []
        const seen = new Set(primaryArticles.map(article => article.id))
        mergedArticles = [
          ...primaryArticles,
          ...fallbackArticles.filter(article => !seen.has(article.id)),
        ]
      }

      setHeroArticles(mergedArticles.slice(0, 18))
    } catch {
      setHeroArticles([])
    }
  }

  function handleLogin(userData) {
    setUser(userData)
    localStorage.setItem('ainews_user', JSON.stringify(userData))
  }

  function handleLogout() {
    setUser(null)
    localStorage.removeItem('ainews_user')
  }

  // Fetch hero articles
  useEffect(() => {
    if (!user) return
    let alive = true

    loadHeroArticles(user)
      .catch(() => {})
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
    }
  }, [user, liveStatus])

  // Live data ingestion
  useEffect(() => {
    if (!user) return
    const doSync = async () => {
      setLiveStatus('syncing')
      try {
        await fetch(`${API}/feed/sync`, { method: 'POST' })
        setLiveStatus('live')
      } catch {
        setLiveStatus('idle')
      }
    }
    doSync()
    const interval = setInterval(doSync, LIVE_SYNC_INTERVAL)
    return () => clearInterval(interval)
  }, [user])

  // Scroll reveal — multiple directions + staggered cards
  useEffect(() => {
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('visible')
      }),
      { threshold: 0.06, rootMargin: '0px 0px -40px 0px' }
    )
    document.querySelectorAll('.reveal-up,.reveal-left,.reveal-right,.reveal-scale,.scroll-card').forEach((el, i) => {
      el.style.transitionDelay = `${(i % 8) * 0.06}s`
      obs.observe(el)
    })
    return () => obs.disconnect()
  })

  // Auth gate
  if (!user) {
    return <AuthPage onLogin={handleLogin} apiBase={API} />
  }

  const [lead, ...rest] = heroArticles

  return (
    <>
      <CursorSparkle />
      <Ticker articles={heroArticles} onSelect={setSelectedArticle} />
      <Masthead
        theme={theme}
        toggleTheme={toggleTheme}
        onChatOpen={() => setChatOpen(true)}
        user={user}
        onLogout={handleLogout}
        liveStatus={liveStatus}
      />

      <PaperHero
        lead={lead}
        sideLeft={rest.slice(0, 3)}
        sideRight={rest.slice(3, 6)}
        onSelect={setSelectedArticle}
        loading={loading}
      />

      {/* Personalized Daily Briefing */}
      <DailyBrief apiBase={API} user={user} />

      <div className="section-divider" />

      <div className="section-masthead reveal-up latest-intelligence-masthead">
        <h2>Latest Intelligence</h2>
        <div className="sm-rule"></div>
        <span className="sm-tag">Filter by Category</span>
      </div>
      <div className="latest-intelligence-shell reveal-scale">
        <NewsFeed apiBase={API} onSelect={setSelectedArticle} user={user} />
      </div>



      <div className="section-masthead reveal-scale">
        <h2>Story Arc Tracker</h2>
        <div className="sm-rule"></div>
        <span className="sm-tag">Follow Stories Like Netflix Series</span>
      </div>
      <div className="arc-section">
        <StoryArc apiBase={API} />
      </div>

      <div className="section-divider" />

      <div className="section-masthead reveal-up" id="video">
        <h2>AI Video Reels</h2>
        <div className="sm-rule"></div>
        <span className="sm-tag">Script + Voiceover in 15 Seconds</span>
      </div>
      <VideoReel apiBase={API} user={user} />

      <div className="section-divider" />

      <div className="section-masthead reveal-scale" id="features">
        <h2>AI-Powered Features</h2>
        <div className="sm-rule"></div>
        <span className="sm-tag">6 Intelligent Agents</span>
      </div>
      <div className="features-section">
        <Features />
      </div>

      <PaperFooter apiBase={API} />

      {!chatOpen && (
        <div style={{ position: 'fixed', bottom: 40, right: 40, zIndex: 9999 }}>
        {/* Floating Namaste Message */}
        <div style={{
          position: 'absolute', top: -55, right: -10,
          background: '#ffffff', color: '#e81c2e', 
          padding: '8px 20px', borderRadius: '24px 24px 0 24px',
          fontFamily: 'var(--font-display)', fontWeight: 900, fontSize: '1rem',
          boxShadow: '0 8px 20px rgba(232, 28, 46, 0.3)',
          border: '2px solid #e81c2e', whiteSpace: 'nowrap',
          animation: 'namaste-pop 2.5s infinite ease-in-out',
          pointerEvents: 'none', letterSpacing: '0.05em',
          display: 'flex', alignItems: 'center', gap: 8
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#e81c2e', boxShadow: '0 0 6px #e81c2e', animation: 'pulse-dot 1.5s infinite' }}></span>
          Namaste
        </div>
        
        <button onClick={() => setChatOpen(true)} title="Ask AI Navigator"
          style={{
            position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #ff2344 0%, #d80b2a 100%)',
            border: 'none', borderRadius: '50%', width: 72, height: 72,
            boxShadow: '0 12px 32px rgba(232, 28, 46, 0.45)', cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)', margin: 0,
            padding: 0
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-6px) scale(1.04)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(232, 28, 46, 0.6)' }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 12px 32px rgba(232, 28, 46, 0.45)' }}
        >
          {/* Custom Smiling Robot SVG */}
          <svg viewBox="6 5 36 36" width="52" height="52" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ transform: 'translateY(-2px)' }}>
            <path d="M24 14V8 M24 6 A2 2 0 1 1 24 5.9" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 21C12 15.5 16.5 11 22 11H26C31.5 11 36 15.5 36 21V27C36 32.5 31.5 37 26 37H20C16 37 13.5 35 12 32L6 40L12 30V21Z" fill="#ffffff"/>
            <path d="M12 20H8 M12 28H8 M36 20H40 M36 28H40" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round"/>
            <circle cx="18" cy="24" r="2.5" fill="#d80b2a"/>
            <circle cx="30" cy="24" r="2.5" fill="#d80b2a"/>
            <path d="M20 29.5C20 29.5 22 31.5 24 31.5C26 31.5 28 29.5 28 29.5" stroke="#d80b2a" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </button>
        </div>
      )}

      <ChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} apiBase={API} user={user} />

      {selectedArticle && (
        <ArticleModal article={selectedArticle} onClose={() => setSelectedArticle(null)} apiBase={API} />
      )}
    </>
  )
}
