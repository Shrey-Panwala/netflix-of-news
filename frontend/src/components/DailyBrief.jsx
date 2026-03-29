import { useState, useEffect } from 'react'

export default function DailyBrief({ apiBase, user }) {
  const [briefing, setBriefing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [activeTheme, setActiveTheme] = useState(null)

  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!user) return
    const fetchBriefing = async () => {
      try {
        const url = `${apiBase}/briefing/daily${user.id ? `?user_id=${user.id}` : ''}`
        const r = await fetch(url)
        if (r.ok) {
          const data = await r.json()
          setBriefing(data)
        }
      } catch (e) {
        console.error('Briefing fetch error:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchBriefing()
  }, [user, apiBase])

  if (loading || !briefing) return null

  const stats = briefing.stats || {}
  
  const currentHour = new Date().getHours()
  let timeGreeting = 'Good evening'
  if (currentHour < 12) timeGreeting = 'Good morning'
  else if (currentHour < 17) timeGreeting = 'Good afternoon'


  return (
    <div className="daily-brief-container" style={{
      margin: '0 20px 20px',
      padding: collapsed ? '16px 20px' : '24px',
      background: 'linear-gradient(135deg, var(--surface) 0%, var(--bg-alt) 100%)',
      border: '1px solid var(--divider)',
      borderRadius: 'var(--radius-lg)',
      position: 'relative',
      boxShadow: 'var(--shadow-md)',
      overflow: 'hidden',
      transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      {/* Decorative pulse border on the left */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 4,
        background: 'var(--primary)',
        boxShadow: '0 0 10px var(--primary-glow)'
      }} />



      {/* Header — always shown */}
      <div onClick={() => setCollapsed(!collapsed)} style={{
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 16,
        userSelect: 'none'
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '12px',
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: '0.85rem', fontWeight: 900, flexShrink: 0,
          boxShadow: '0 4px 12px var(--primary-glow)',
          fontFamily: 'var(--font-display)', fontStyle: 'italic'
        }}>ET</div>
        
        <div style={{ flex: 1 }}>
          <h2 style={{
            fontSize: collapsed ? '1.1rem' : '1.3rem', fontWeight: 800, color: 'var(--text)',
            fontFamily: 'var(--font-display)', letterSpacing: '-0.02em', margin: 0,
            transition: 'var(--transition)'
          }}>
            {timeGreeting}, {briefing.user_name || 'User'}, hope you're having a fantastic day!
          </h2>
          
          <div style={{
            fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 4,
            fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em',
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <span style={{ color: 'var(--primary)' }}>• Live Dashboard</span>
            {collapsed && (
              <>
                <span>|</span>
                <span>{stats.interest_matches} Curated Stories</span>
                <span>|</span>
                <span>Click to Expand ▼</span>
              </>
            )}
          </div>
        </div>
        
        {!collapsed && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', paddingRight: 32 }}>
            Collapse ▲
          </span>
        )}
      </div>

      {/* Expanded grid content */}
      {!collapsed && (
        <div style={{
          marginTop: 24,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 20,
          animation: 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        }}>
          
          {/* Main Left Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Market Summary */}
            {briefing.market_summary && (
              <div style={{
                background: 'var(--surface-alt)', padding: 16, borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--divider)', borderLeft: '3px solid var(--text-dim)'
              }}>
                <h4 style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>
                  Market Pulse
                </h4>
                <p style={{
                  fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.6,
                  fontFamily: 'var(--font-body)', fontWeight: 500
                }}>
                  {briefing.market_summary}
                </p>
                {briefing.actionable_insight && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--divider)', fontSize: '0.8rem', color: 'var(--text-sub)', fontStyle: 'italic' }}>
                    <span style={{ color: '#f39c12', fontWeight: 800, fontStyle: 'normal', marginRight: 6 }}>💡</span>
                    {briefing.actionable_insight}
                  </div>
                )}
              </div>
            )}

            {/* Personalized Matches */}
            {briefing.interest_matches && (
              <div style={{
                background: 'rgba(39, 174, 96, 0.05)', padding: 16, borderRadius: 'var(--radius-sm)',
                border: '1px solid rgba(39, 174, 96, 0.2)', borderLeft: '3px solid #27ae60'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#27ae60', animation: 'pulse-dot 2s infinite' }} />
                  <h4 style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#27ae60', fontWeight: 800 }}>
                    Curated For You
                  </h4>
                </div>
                <p style={{ fontSize: '0.9rem', color: 'var(--text)', lineHeight: 1.6, fontWeight: 500 }}>
                  {briefing.interest_matches}
                </p>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Top Themes Pills */}
            <div style={{
              background: 'var(--surface)', padding: 16, borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--divider)', height: '100%'
            }}>
              <h4 style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 12 }}>
                Global Intelligence
              </h4>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                <span style={{
                  fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                  padding: '6px 12px', borderRadius: 20, background: 'var(--primary)', color: '#fff',
                  boxShadow: '0 2px 8px var(--primary-glow)'
                }}>
                  {stats.total_articles || 0} Stories Digested
                </span>
                
                {briefing.top_themes?.map((theme, i) => (
                  <div key={theme} style={{ display: 'inline-block' }}>
                    <span onClick={() => setActiveTheme(activeTheme === theme ? null : theme)} style={{
                      fontSize: '0.65rem', fontWeight: 600, padding: '6px 12px', borderRadius: 20, cursor: 'pointer',
                      background: activeTheme === theme ? 'var(--text)' : 'var(--tag-bg)', 
                      color: activeTheme === theme ? 'var(--surface)' : 'var(--tag-text)', 
                      border: '1px solid var(--divider-dark)', transition: 'all 0.2s', display: 'inline-block'
                    }}>
                      #{theme}
                    </span>
                  </div>
                ))}
              </div>
              
              {activeTheme && (
                <div style={{ padding: '12px', background: 'var(--bg-inset)', border: '1px solid var(--divider)', borderRadius: 'var(--radius-sm)', marginBottom: 20, fontSize: '0.85rem', color: 'var(--text)', animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6, fontWeight: 800 }}>Active Topic Insights</div>
                  Showing recent stories and analysis related to <strong>{activeTheme}</strong>. These insights are extracted in real-time by the AI matching your interest profile.
                </div>
              )}

              {/* Surprise Pick Component */}
              {briefing.surprise_pick && (
                <div style={{
                  padding: 14, background: 'var(--bg-inset)', borderRadius: 8,
                  border: '1px solid var(--divider)'
                }}>
                  <h4 style={{ fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--primary)', marginBottom: 6, fontWeight: 800 }}>
                    <span style={{ marginRight: 6 }}>🎯</span> Surprise Contrarian Pick
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-sub)', lineHeight: 1.5, fontStyle: 'italic' }}>
                    "{briefing.surprise_pick}"
                  </p>
                </div>
              )}
            </div>
            
          </div>

        </div>
      )}
    </div>
  )
}
