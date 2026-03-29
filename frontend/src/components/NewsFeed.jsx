import { useState, useEffect, useCallback } from 'react'
import CategoryAnalytics from './CategoryAnalytics'

const CATEGORIES = ['All', 'Markets', 'Business', 'Tech', 'Politics', 'Sports', 'Health', 'Entertainment', 'Science', 'World']

const PIPELINE_AGENTS = [
  { key: 'Ingestion Agent', label: 'Ingestion', icon: 'D' },
  { key: 'Summarizer Agent', label: 'Summarizer', icon: 'S' },
  { key: 'Personalization Agent', label: 'Personalization', icon: 'P' },
  { key: 'RAG Indexer', label: 'RAG Index', icon: 'R' },
  { key: 'Story Arc Agent', label: 'Story Arc', icon: 'A' },
  { key: 'Sentiment Agent', label: 'Sentiment', icon: 'M' },
]

const CAT_ICONS = {
  All: '🌐', Markets: '📈', Business: '💼', Tech: '💻', Politics: '🏛️',
  Sports: '⚽', Health: '⚕️', Entertainment: '🎬', Science: '🔬', World: '🌍'
}

const CAT_COLORS = {
  Markets: '#c0392b', Business: '#2980b9', Tech: '#8e44ad', Politics: '#f39c12',
  Sports: '#27ae60', Health: '#16a085', Entertainment: '#e84393', Science: '#0984e3',
  World: '#d35400', General: '#7f8c8d'
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`
  return `${Math.floor(diff/86400)}d ago`
}

function SkeletonCard() {
  return (
    <div className="skeleton-card-wrap">
      <div className="skeleton" style={{width:'30%',height:10,marginBottom:10}}/>
      <div className="skeleton" style={{width:'95%',height:16,marginBottom:8}}/>
      <div className="skeleton" style={{width:'80%',height:12,marginBottom:6}}/>
      <div className="skeleton" style={{width:'60%',height:12,marginBottom:14}}/>
      <div style={{display:'flex',justifyContent:'space-between'}}>
        <div className="skeleton" style={{width:'35%',height:10}}/>
        <div className="skeleton" style={{width:'20%',height:10}}/>
      </div>
    </div>
  )
}

export default function NewsFeed({ apiBase, onSelect, user }) {
  const [articles, setArticles] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('All')
  const [fallbackCategory, setFallbackCategory] = useState(null)
  const [syncing, setSyncing] = useState(false)
  const [pipelineTrace, setPipelineTrace] = useState(null)
  const [pipelineStep, setPipelineStep] = useState(-1)
  const [catCounts, setCatCounts] = useState({})

  const CAT_MAP = {
    'Markets': ['markets', 'market', 'finance', 'stock', 'sensex', 'nifty', 'equity', 'ipo', 'commodity'],
    'Business': ['business', 'corporate', 'company', 'industry'],
    'Tech': ['tech', 'technology', 'ai', 'digital', 'software', 'startup'],
    'Politics': ['politics', 'political', 'government', 'policy', 'india'],
    'Sports': ['sports', 'sport', 'cricket', 'ipl'],
    'Health': ['health', 'medical', 'medicine', 'wellness', 'hospital', 'disease'],
    'Entertainment': ['entertainment', 'bollywood', 'celebrity', 'film'],
    'Science': ['science', 'research', 'space', 'innovation'],
    'World': ['world', 'international', 'global', 'foreign'],
  }

  function deriveCategory(article) {
    const text = [article.category, article.source, article.title, article.content]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    for (const [cat, patterns] of Object.entries(CAT_MAP)) {
      if (patterns.some(p => text.includes(p))) return cat
    }
    return 'World'
  }

  const fetchByCategory = useCallback(async (cat) => {
    setLoading(true)
    try {
      const userId = user?.id ? `&user_id=${user.id}` : ''
      const url = `${apiBase}/feed/personalized?limit=80${userId}`
      const r = await fetch(url)
      if (r.ok) {
        const data = await r.json()
        const all = (data.articles || []).map(a => ({ ...a, _cat: deriveCategory(a) }))
        const counts = {}
        all.forEach(a => { counts[a._cat] = (counts[a._cat] || 0) + 1 })
        setCatCounts(counts)
        const filtered = cat === 'All' ? all : all.filter(a => a._cat === cat)
        if (cat !== 'All' && filtered.length === 0) {
          setFallbackCategory(cat)
          setArticles(all.slice(0, 20))
        } else {
          setFallbackCategory(null)
          setArticles(filtered)
        }
      }
    } catch(e) {
      console.error('Feed fetch error', e)
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => { fetchByCategory(activeCategory) }, [activeCategory, fetchByCategory])

  useEffect(() => {
    if (!syncing || pipelineStep < 0) return
    if (pipelineStep >= PIPELINE_AGENTS.length) return
    const timer = setTimeout(() => setPipelineStep(s => s + 1), 800)
    return () => clearTimeout(timer)
  }, [syncing, pipelineStep])

  async function handleSync() {
    setSyncing(true)
    setPipelineTrace(null)
    setPipelineStep(0)
    try {
      const r = await fetch(`${apiBase}/feed/sync-with-pipeline`, { method: 'POST' })
      const data = await r.json()
      setPipelineStep(PIPELINE_AGENTS.length)
      setPipelineTrace(data.pipeline_trace || null)
      setTimeout(() => {
        fetchByCategory(activeCategory)
        setSyncing(false)
        setTimeout(() => { setPipelineTrace(null); setPipelineStep(-1) }, 5000)
      }, 1500)
    } catch {
      alert('Sync failed — is the backend running on port 8005?')
      setSyncing(false)
      setPipelineStep(-1)
    }
  }

  const [lead, ...rest] = articles
  const mainCards = rest.slice(0, 8)
  const sidebarCards = rest.slice(8, 14)

  const trending = articles
    .filter(a => a._cat !== lead?._cat)
    .slice(0, 5)

  const topSources = [...new Set(articles.map(a => a.source).filter(Boolean))].slice(0, 4)

  return (
    <div id="feed" className="news-section">
      {(syncing || pipelineTrace) && (
        <div className="pipeline-bar">
          <div className="pipeline-header">
            <span className="pipeline-title">Multi-Agent Pipeline</span>
            <span className="pipeline-status">
              {pipelineStep >= PIPELINE_AGENTS.length ? 'Complete' : `${pipelineStep + 1}/${PIPELINE_AGENTS.length} agents`}
            </span>
          </div>
          <div className="pipeline-steps">
            {PIPELINE_AGENTS.map((agent, i) => {
              const trace = pipelineTrace?.find(t => t.agent === agent.key)
              const isActive = pipelineStep === i
              const isDone = pipelineStep > i || (trace && trace.status === 'completed')
              return (
                <div key={agent.key} className={`pipeline-step ${isDone ? 'done' : ''} ${isActive ? 'active' : ''}`}>
                  <div className="step-icon">{agent.icon}</div>
                  <div className="step-label">{agent.label}</div>
                  {trace && isDone && (
                    <div className="step-time">{trace.time_ms}ms</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="category-tabs-bar reveal-up intelligence-control-bar">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
          >
            <span className="cat-icon">{CAT_ICONS[cat]}</span>
            {cat}
            {catCounts[cat] > 0 && <span className="cat-count">{catCounts[cat]}</span>}
          </button>
        ))}
        <button onClick={handleSync} disabled={syncing} className="sync-btn">
          {syncing ? <span className="loading-spinner"></span> : '⟳'} Sync News
        </button>
      </div>

      {!loading && articles.length > 0 && (
        <div className="feed-signal-strip reveal-scale">
          <div className="signal-chip">
            <span className="signal-k">Live Cards</span>
            <span className="signal-v">{articles.length}</span>
          </div>
          <div className="signal-chip">
            <span className="signal-k">Category</span>
            <span className="signal-v">{activeCategory}</span>
          </div>
          <div className="signal-chip signal-sources">
            <span className="signal-k">Sources</span>
            <span className="signal-v">{topSources.join(' • ') || 'Mixed'}</span>
          </div>
        </div>
      )}

      {fallbackCategory && !loading && (
        <div className="feed-fallback-note">
          No strong matches in <strong>{fallbackCategory}</strong> right now. Showing the latest cross-category intelligence instead.
        </div>
      )}

      {loading ? (
        <div className="feed-full-layout">
          <div className="feed-main-col">
            {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
          </div>
          <div className="feed-sidebar-col">
            {[1,2,3].map(i => <SkeletonCard key={i} />)}
          </div>
        </div>
      ) : !articles.length ? (
        <div className="empty-msg">
          No articles in <strong>{activeCategory}</strong> category yet.<br/>
          <button onClick={handleSync} className="sync-empty-btn">
            Sync Now to Populate
          </button>
        </div>
      ) : (
        <>
          <div className="feed-full-layout reveal-up">
            <div className="feed-main-col">
              <div className="news-lead scroll-card" onClick={() => lead && onSelect(lead)} style={{ borderTop: `4px solid ${CAT_COLORS[lead?._cat] || CAT_COLORS.General}` }}>
                <div className="lead-kicker">
                  <span className="live-dot" style={{ background: CAT_COLORS[lead?._cat] || CAT_COLORS.General }}></span>
                  {lead?._cat || 'Latest'} · {lead?.source}
                </div>
                <h2>{lead?.title}</h2>
                <p className="lead-deck">
                  {lead?.tldr || lead?.content?.slice(0, 150) || 'Click to explore the full AI analysis of this story.'}
                </p>
                <div className="news-lead-footer">
                  <span className="source">{lead?.source}</span>
                  <span>{timeAgo(lead?.published_at)}</span>
                  <button className="dive-btn">Dive Deeper →</button>
                </div>
              </div>

              <div className="main-cards-grid">
                {mainCards.map((a, i) => (
                  <div
                    key={i}
                    className="news-card scroll-card"
                    style={{ borderTop: `2px solid ${CAT_COLORS[a._cat] || CAT_COLORS.General}` }}
                    onClick={() => onSelect(a)}
                  >
                    <div className="card-kicker" style={{ color: CAT_COLORS[a._cat] || CAT_COLORS.General }}>
                      {CAT_ICONS[a._cat] || '📰'} {a._cat || a.source}
                      {a.relevance_score > 70 && <span style={{marginLeft:6,fontSize:'0.5rem',fontWeight:700,padding:'2px 6px',borderRadius:8,background:'rgba(39,174,96,0.15)',color:'#27ae60',border:'1px solid #27ae60'}}>FOR YOU</span>}
                      {a.is_surprise && <span style={{marginLeft:6,fontSize:'0.5rem',fontWeight:700,padding:'2px 6px',borderRadius:8,background:'rgba(243,156,18,0.15)',color:'#f39c12',border:'1px solid #f39c12'}}>DISCOVER</span>}
                    </div>
                    <h3>{a.title}</h3>
                    <p>{a.tldr?.slice(0, 120) || a.content?.slice(0,88) || 'Click to read.'}</p>
                    <div className="news-card-footer">
                      <span className="src">{a.source}</span>
                      <span>{timeAgo(a.published_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="feed-sidebar-col">
              <div className="sidebar-section reveal-right">
                <div className="sidebar-section-title">🔥 Trending Now</div>
                {trending.map((a, i) => (
                  <div key={i} className="sidebar-trending-item" onClick={() => onSelect(a)}>
                    <span className="trending-num">{i + 1}</span>
                    <div>
                      <div className="trending-title">{a.title}</div>
                      <div className="trending-meta">{a.source} · {timeAgo(a.published_at)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="sidebar-section reveal-right">
                <div className="sidebar-section-title">📰 More Headlines</div>
                {sidebarCards.map((a, i) => (
                  <div key={i} className="sidebar-card" onClick={() => onSelect(a)} style={{borderLeft: `3px solid ${CAT_COLORS[a._cat] || CAT_COLORS.General}`}}>
                    <div className="sidebar-card-cat" style={{color: CAT_COLORS[a._cat] || CAT_COLORS.General}}>{a._cat}</div>
                    <div className="sidebar-card-title">{a.title}</div>
                    <div className="sidebar-card-meta">{a.source} · {timeAgo(a.published_at)}</div>
                  </div>
                ))}
              </div>

              <div className="sidebar-section reveal-right">
                <div className="sidebar-section-title">🤖 AI Highlights</div>
                <div className="ai-highlight-box">
                  <p>{articles.length} cards live. {Object.keys(catCounts).length} categories detected. Signal strength: {catCounts['Markets'] > 3 ? 'high' : 'steady'}.</p>
                  {user?.preferences?.length > 0 && (
                    <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid var(--divider)'}}>                      <div style={{fontSize:'0.55rem',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.06em',color:'var(--primary)',marginBottom:6}}>Your Interests</div>
                      <div style={{display:'flex',flexWrap:'wrap',gap:4}}>
                        {user.preferences.map(p => (
                          <span key={p} style={{fontSize:'0.6rem',fontWeight:600,padding:'2px 8px',borderRadius:10,background:'var(--accent-soft)',border:'1px solid var(--divider)',color:'var(--text-sub)'}}>{p}</span>
                        ))}
                      </div>
                      <div style={{fontSize:'0.72rem',color:'var(--text-dim)',marginTop:8,lineHeight:1.5}}>
                        Articles matching <strong>{user.preferences.slice(0,3).join(', ')}</strong> are ranked higher in your feed.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Analytics Dashboard — replaces bottom compact cards */}
          <CategoryAnalytics
            activeCategory={activeCategory}
            articleCount={articles.length}
            catCounts={catCounts}
            activeArticles={activeCategory === 'All' ? articles : articles.filter(a => a._cat === activeCategory)}
          />
        </>
      )}
    </div>
  )
}
