import { useState } from 'react'

const IMPACT_COLORS = {
  High: { bg: 'rgba(192,57,43,0.15)', border: '#e74c3c', text: '#e74c3c', glow: '0 0 10px rgba(231,76,60,0.4)' },
  Medium: { bg: 'rgba(243,156,18,0.15)', border: '#f39c12', text: '#f39c12', glow: '0 0 10px rgba(243,156,18,0.4)' },
  Low: { bg: 'rgba(39,174,96,0.15)', border: '#2ecc71', text: '#2ecc71', glow: '0 0 10px rgba(46,204,113,0.4)' },
}

const SENTIMENT_COLORS = {
  Bullish: { bg: 'rgba(39,174,96,0.15)', border: '#2ecc71', text: '#2ecc71', icon: '↗', gradient: 'linear-gradient(135deg, rgba(46,204,113,0.2) 0%, transparent 100%)' },
  Bearish: { bg: 'rgba(192,57,43,0.15)', border: '#e74c3c', text: '#e74c3c', icon: '↘', gradient: 'linear-gradient(135deg, rgba(231,76,60,0.2) 0%, transparent 100%)' },
  Neutral: { bg: 'rgba(52,152,219,0.15)', border: '#3498db', text: '#3498db', icon: '→', gradient: 'linear-gradient(135deg, rgba(52,152,219,0.2) 0%, transparent 100%)' },
}

function SkeletonTimeline() {
  return (
    <div className="arc-loading-state" style={{ background: 'var(--surface-alt)', border: '1px solid var(--divider)', padding: 32, borderRadius: 'var(--radius-lg)' }}>
      <div className="arc-loading-header" style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <div className="arc-loading-icon" style={{ animation: 'spin 3s linear infinite' }}>
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="var(--primary)" strokeWidth="2">
            <circle cx="12" cy="12" r="10" strokeOpacity="0.3"/>
            <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round"/>
          </svg>
        </div>
        <div>
          <div className="arc-loading-title" style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>AI analyzing story arc...</div>
          <div className="arc-loading-sub" style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>Extracting timeline, sentiment, and key players from thousands of articles.</div>
        </div>
      </div>
      <div className="arc-skeleton-grid" style={{ position: 'relative', paddingLeft: 24, borderLeft: '2px solid var(--divider)' }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="arc-skeleton-card" style={{ padding: 16, background: 'var(--bg-inset)', borderRadius: 12, marginBottom: 16, animationDelay: `${i * 0.15}s`, opacity: 0.6 }}>
            <div className="skeleton" style={{ width: '30%', height: 12, marginBottom: 12 }} />
            <div className="skeleton" style={{ width: '80%', height: 16, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: '100%', height: 14, marginBottom: 6 }} />
            <div className="skeleton" style={{ width: '60%', height: 14 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function SentimentTrajectory({ timeline }) {
  const [hoverIdx, setHoverIdx] = useState(null)
  
  if (!timeline || timeline.length < 2) return null
  const width = 400, height = 80, padding = 15
  const sentMap = { Bullish: 1, Neutral: 0.5, Bearish: 0 }
  const points = timeline.map((ev, i) => {
    const x = padding + (i / (timeline.length - 1)) * (width - padding * 2)
    const y = height - padding - (sentMap[ev.sentiment] || 0.5) * (height - padding * 2)
    return { x, y, sentiment: ev.sentiment, date: ev.date, title: ev.title }
  })
  
  return (
    <div style={{ padding: '20px', background: 'var(--surface-alt)', border: '1px solid var(--divider)', borderRadius: 'var(--radius-md)', marginBottom: 24, position: 'relative' }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ width: 6, height: 6, background: 'var(--primary)', borderRadius: '50%' }}></span>
        Sentiment Trajectory
      </div>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ maxWidth: 800, overflow: 'visible' }}>
        <defs>
          <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2ecc71" stopOpacity="0.2" />
            <stop offset="50%" stopColor="#3498db" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#e74c3c" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        <rect x={0} y={0} width={width} height={height} fill="url(#sentGrad)" rx="8" />
        <line x1={0} y1={height/2} x2={width} y2={height/2} stroke="var(--divider)" strokeWidth="1" strokeDasharray="4,4" />
        <polyline points={points.map(p => `${p.x},${p.y}`).join(' ')} fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))', animation: 'dash 2s ease forwards' }} />
        {points.map((p, i) => (
          <g key={i} 
             style={{ animation: `zoomIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) ${i * 0.1 + 0.5}s both` }}
             onMouseEnter={() => setHoverIdx(i)}
             onMouseLeave={() => setHoverIdx(null)}
          >
            <circle cx={p.x} cy={p.y} r={hoverIdx === i ? "8" : "6"} 
              fill={SENTIMENT_COLORS[p.sentiment]?.border || '#3498db'} 
              stroke="var(--surface)" strokeWidth={hoverIdx === i ? "3" : "2.5"} 
              style={{ transition: 'all 0.2s', cursor: 'pointer' }} 
            />
          </g>
        ))}
        <text x={8} y={height - 8} fontSize="9" fill="var(--text-muted)" fontWeight="700">Bearish</text>
        <text x={8} y={15} fontSize="9" fill="var(--text-muted)" fontWeight="700">Bullish</text>
      </svg>
      
      {/* Tooltip Overlay */}
      {hoverIdx !== null && (
        <div style={{
          position: 'absolute', top: -10, right: 20, pointerEvents: 'none',
          background: 'var(--text)', color: 'var(--surface)', padding: '8px 12px',
          borderRadius: 8, fontSize: '0.75rem', boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          zIndex: 10, maxWidth: 250, animation: 'fadeIn 0.2s ease',
          border: `1px solid ${SENTIMENT_COLORS[points[hoverIdx].sentiment]?.border}`
        }}>
          <div style={{ fontSize: '0.65rem', opacity: 0.8, marginBottom: 4, fontWeight: 700, textTransform: 'uppercase' }}>
            {points[hoverIdx].date} • {points[hoverIdx].sentiment}
          </div>
          <div style={{ lineHeight: 1.4, fontWeight: 500 }}>
            {points[hoverIdx].title}
          </div>
        </div>
      )}
    </div>
  )
}

export default function StoryArc({ apiBase }) {
  const [topic, setTopic] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedEvent, setExpandedEvent] = useState(null)

  async function track() {
    if (!topic.trim()) return
    setLoading(true); setError(''); setData(null); setExpandedEvent(null)
    try {
      const res = await fetch(`${apiBase}/arcs/${encodeURIComponent(topic.trim())}`)
      if (res.ok) setData(await res.json())
      else setError('Could not retrieve arc. Check the backend is running.')
    } catch {
      setError('Connection error — make sure backend is live on port 8005.')
    } finally { setLoading(false) }
  }

  const timeline = data?.timeline || []
  const sentiment = data?.overall_sentiment || ''
  const sc = SENTIMENT_COLORS[sentiment] || SENTIMENT_COLORS.Neutral

  const stats = [
    { k: 'Events', v: timeline.length },
    { k: 'Players', v: data?.key_players?.length || 0 },
    { k: 'Outlook', v: sentiment || 'Neutral' },
    { k: 'Sectors', v: data?.related_sectors?.length || 0 }
  ]

  const suggestions = ['Markets Today', 'India Economy', 'Global Trade', 'Technology', 'IPO Watch', 'Gold & Commodities']

  return (
    <div id="story-arc" className="arc-container" style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 20px 60px' }}>
      {/* Premium Search Box */}
      <div style={{ background: 'var(--surface-alt)', padding: 24, borderRadius: 'var(--radius-lg)', border: '1px solid var(--divider)', boxShadow: 'var(--shadow-md)', marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <input
            className="arc-input"
            style={{ flex: 1, minWidth: 250, padding: '14px 20px', fontSize: '1.1rem', background: 'var(--bg-inset)', border: '1px solid var(--divider)', borderRadius: 12, color: 'var(--text)', fontFamily: 'var(--font-body)' }}
            placeholder='Enter a topic — "Global Trade", "AI Regulation"...'
            value={topic}
            onChange={e => setTopic(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && track()}
          />
          <button onClick={track} disabled={loading} style={{ 
            background: 'var(--primary)', color: '#fff', border: 'none', borderRadius: 12, padding: '14px 32px',
            fontSize: '1rem', fontWeight: 800, cursor: loading ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px var(--primary-glow)', transition: 'all 0.2s ease', fontFamily: 'var(--font-display)', letterSpacing: '0.05em'
          }}>
            {loading ? <span className="loading-spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff', width: 20, height: 20 }}/> : 'TRACK STORY'}
          </button>
        </div>
        
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', alignSelf: 'center', marginRight: 8 }}>Track Now:</span>
          {suggestions.map(s => (
            <button key={s} onClick={() => { setTopic(s); }} style={{
              background: 'var(--surface)', border: '1px solid var(--divider)', color: 'var(--text-sub)',
              padding: '6px 14px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)'
            }} onMouseEnter={e => { e.target.style.background = 'var(--text)'; e.target.style.color = 'var(--surface)'; }}
               onMouseLeave={e => { e.target.style.background = 'var(--surface)'; e.target.style.color = 'var(--text-sub)'; }}>
              {s}
            </button>
          ))}
        </div>
      </div>

      {error && <div style={{ padding: 16, background: 'rgba(231,76,60,0.1)', color: '#e74c3c', borderRadius: 8, border: '1px solid #e74c3c', marginBottom: 24, fontWeight: 600 }}>{error}</div>}

      {loading && <SkeletonTimeline />}

      {!data && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '60px 20px', opacity: 0.6 }}>
          <div style={{ fontSize: '3rem', marginBottom: 16 }}>🕰️</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', margin: 0 }}>Follow the Narrative</h2>
          <p style={{ maxWidth: 400, margin: '12px auto 0', color: 'var(--text-dim)', lineHeight: 1.6 }}>Track how a news story evolves over time. Our AI connects the dots between isolated articles to reveal the bigger picture.</p>
        </div>
      )}

      {data && (
        <div style={{ animation: 'fadeIn 0.5s ease' }}>
          
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
            {stats.map((s, i) => s.v ? (
              <div key={i} style={{ flex: '1 1 120px', background: 'var(--surface-alt)', padding: '16px 20px', borderRadius: 'var(--radius-md)', border: '1px solid var(--divider)', borderBottom: `3px solid var(--primary)` }}>
                <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 4 }}>{s.k}</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text)' }}>{s.v}</div>
              </div>
            ) : null)}
          </div>

          <SentimentTrajectory timeline={timeline} />

          {/* Premium Overview Section */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginBottom: 32 }}>
            
            <div style={{ background: sc.gradient, border: `1px solid ${sc.border}`, borderRadius: 'var(--radius-md)', padding: 24, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 20, right: 20, fontSize: '3rem', opacity: 0.1, color: sc.border }}>{sc.icon}</div>
              <h4 style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: sc.border, margin: '0 0 12px' }}>Overall Sentiment</h4>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'var(--font-display)', color: 'var(--text)', marginBottom: 8 }}>{sentiment}</div>
              {data.sentiment_explanation && <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)', lineHeight: 1.6, margin: 0 }}>{data.sentiment_explanation}</p>}
              {data.market_impact && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px dashed ${sc.border}`, fontSize: '0.8rem', color: 'var(--text)', fontStyle: 'italic', display: 'flex', gap: 8 }}>
                  <span>📉</span> <span>{data.market_impact}</span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Key Players */}
              {data.key_players?.length > 0 && (
                <div style={{ background: 'var(--surface-alt)', border: '1px solid var(--divider)', borderRadius: 'var(--radius-md)', padding: 20 }}>
                  <h4 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--text-muted)', margin: '0 0 12px' }}>Key Players</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {data.key_players.map((p,i) => (
                      <span key={i} style={{ background: 'var(--bg-inset)', border: '1px solid var(--divider-dark)', padding: '6px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600, color: 'var(--text)' }}>
                        👤 {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Prediction */}
              {data.prediction && (
                <div style={{ background: 'linear-gradient(135deg, rgba(8,164,228,0.1) 0%, transparent 100%)', border: '1px solid rgba(8,164,228,0.3)', borderRadius: 'var(--radius-md)', padding: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <h4 style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#0984e3', margin: 0 }}>AI Prediction</h4>
                    {data.prediction_confidence && (
                      <span style={{ fontSize: '0.65rem', background: '#0984e3', color: '#fff', padding: '2px 8px', borderRadius: 12, fontWeight: 700 }}>{data.prediction_confidence}/10 Conf.</span>
                    )}
                  </div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>"{data.prediction}"</p>
                </div>
              )}
            </div>
          </div>

          {/* The Timeline */}
          {timeline.length > 0 && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--divider)', borderRadius: 'var(--radius-lg)', padding: '32px 24px', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: 'var(--primary)', opacity: 0.5 }} />
              <h3 style={{ fontSize: '1.2rem', fontFamily: 'var(--font-display)', fontWeight: 900, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 12, height: 12, background: 'var(--primary)', borderRadius: '50%', boxShadow: '0 0 10px var(--primary-glow)' }} /> Event Timeline
              </h3>
              
              <div style={{ position: 'relative', paddingLeft: 32 }}>
                {/* Vertical Connector */}
                <div style={{ position: 'absolute', left: 11, top: 16, bottom: 0, width: 2, background: 'linear-gradient(180deg, var(--divider-dark) 0%, transparent 100%)' }} />

                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {timeline.map((ev, i) => {
                    const evSc = SENTIMENT_COLORS[ev.sentiment] || SENTIMENT_COLORS.Neutral
                    const impColor = IMPACT_COLORS[ev.impact] || IMPACT_COLORS.Medium
                    const isExpanded = expandedEvent === i
                    
                    return (
                      <div key={i} style={{ position: 'relative' }}>
                        {/* Dot */}
                        <div style={{
                          position: 'absolute', left: -25, top: 14, width: 10, height: 10, borderRadius: '50%',
                          background: evSc.border, border: '2px solid var(--surface)', zIndex: 2,
                          boxShadow: `0 0 0 4px ${evSc.bg}`
                        }} />
                        
                        <div 
                          onClick={() => setExpandedEvent(isExpanded ? null : i)}
                          style={{
                            background: 'var(--surface-alt)', border: '1px solid var(--divider)',
                            padding: '16px 20px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            borderLeft: `4px solid ${impColor.border}`,
                            boxShadow: isExpanded ? '0 8px 24px rgba(0,0,0,0.1)' : 'none',
                            transform: isExpanded ? 'translateX(4px)' : 'none'
                          }}
                          onMouseEnter={e => { if(!isExpanded) Object.assign(e.currentTarget.style, { background: 'var(--bg-inset)', transform: 'translateX(2px)' }) }}
                          onMouseLeave={e => { if(!isExpanded) Object.assign(e.currentTarget.style, { background: 'var(--surface-alt)', transform: 'none' }) }}
                        >
                          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: evSc.border, marginBottom: 8, letterSpacing: '0.05em' }}>{ev.date}</div>
                          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text)', margin: '0 0 10px', lineHeight: 1.4 }}>{ev.title}</h4>
                          
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-sub)', lineHeight: 1.6, margin: 0, display: isExpanded ? 'block' : '-webkit-box', WebkitLineClamp: isExpanded ? 'unset' : 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {ev.description}
                          </p>
                          
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 16 }}>
                            {ev.impact && (
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 10px', borderRadius: 4, background: impColor.bg, color: impColor.border }}>{ev.impact} Impact</span>
                            )}
                            {ev.sentiment && (
                              <span style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 10px', borderRadius: 4, background: evSc.bg, color: evSc.border }}>{evSc.icon} {ev.sentiment}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Footer insights */}
          {(data.what_to_watch || data.contrarian_perspective) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, marginTop: 20 }}>
              {data.what_to_watch && (
                <div style={{ background: 'var(--bg-alt)', border: '1px solid var(--divider)', borderLeft: '3px solid #3498db', padding: 20, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#3498db', marginBottom: 8 }}>What To Watch Next</div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)', lineHeight: 1.6, margin: 0 }}>{data.what_to_watch}</p>
                </div>
              )}
              {data.contrarian_perspective && (
                <div style={{ background: 'var(--bg-alt)', border: '1px solid var(--divider)', borderLeft: '3px solid #9b59b6', padding: 20, borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#9b59b6', marginBottom: 8 }}>Contrarian Perspective</div>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)', lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>{data.contrarian_perspective}</p>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  )
}
