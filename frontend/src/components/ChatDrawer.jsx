import { useState, useRef, useEffect } from 'react'

const INTENT_LABELS = {
  explain: 'Deep Explain',
  summarize: 'Summarize',
  compare: 'Compare',
  predict: 'Predict',
  video: 'Video Script',
  market: 'Market Intel',
  general: 'RAG Search',
  deep_brief: 'Intelligence Briefing',
}

const INTENT_COLORS = {
  explain: '#3498db',
  summarize: '#2ecc71',
  compare: '#f39c12',
  predict: '#9b59b6',
  video: '#e74c3c',
  market: '#c0392b',
  general: '#95a5a6',
  deep_brief: '#1abc9c',
}

// Simple markdown-like rendering for chat responses
function renderFormattedText(text) {
  if (!text) return null
  
  const lines = text.split('\n')
  const elements = []
  let key = 0

  for (let line of lines) {
    key++
    const trimmed = line.trim()
    
    if (!trimmed) {
      elements.push(<div key={key} style={{height: 8}} />)
      continue
    }

    // Convert markdown-style formatting
    let formatted = trimmed
    // Bold: **text** or __text__
    const parts = []
    let remaining = formatted
    let partKey = 0
    
    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/)
      if (boldMatch) {
        const idx = remaining.indexOf(boldMatch[0])
        if (idx > 0) parts.push(<span key={`p${partKey++}`}>{remaining.substring(0, idx)}</span>)
        parts.push(<strong key={`p${partKey++}`} style={{color:'var(--text)'}}>{boldMatch[1]}</strong>)
        remaining = remaining.substring(idx + boldMatch[0].length)
      } else {
        parts.push(<span key={`p${partKey++}`}>{remaining}</span>)
        break
      }
    }

    // Bullet points
    if (trimmed.startsWith('- ') || trimmed.startsWith('• ') || trimmed.match(/^\d+\.\s/)) {
      const bulletText = trimmed.replace(/^[-•]\s/, '').replace(/^\d+\.\s/, '')
      // Re-process bold in bullet
      const bulletParts = []
      let bRemaining = bulletText
      let bKey = 0
      while (bRemaining.length > 0) {
        const bMatch = bRemaining.match(/\*\*(.+?)\*\*/)
        if (bMatch) {
          const bIdx = bRemaining.indexOf(bMatch[0])
          if (bIdx > 0) bulletParts.push(<span key={`b${bKey++}`}>{bRemaining.substring(0, bIdx)}</span>)
          bulletParts.push(<strong key={`b${bKey++}`} style={{color:'var(--text)'}}>{bMatch[1]}</strong>)
          bRemaining = bRemaining.substring(bIdx + bMatch[0].length)
        } else {
          bulletParts.push(<span key={`b${bKey++}`}>{bRemaining}</span>)
          break
        }
      }
      elements.push(
        <div key={key} style={{
          paddingLeft: 16, position: 'relative', marginBottom: 4, lineHeight: 1.6,
        }}>
          <span style={{
            position: 'absolute', left: 0, top: 6, width: 5, height: 5,
            borderRadius: '50%', background: 'var(--primary)', flexShrink: 0,
          }}></span>
          {bulletParts}
        </div>
      )
    } else {
      elements.push(<div key={key} style={{marginBottom: 6, lineHeight: 1.7}}>{parts}</div>)
    }
  }

  return elements
}

export default function ChatDrawer({ open, onClose, apiBase, user }) {
  const [msgs, setMsgs] = useState([
    { role:'ai', text:`Hey${user?.full_name ? ` ${user.full_name.split(' ')[0]}` : ''}! I'm your Netflix of News Navigator. Ask me anything about today's news, markets, or business stories.`, confidence: null, sources: [], intent: null, reasoning: null }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const endRef = useRef(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }) }, [msgs])

  async function send() {
    const q = input.trim(); if (!q || loading) return
    setMsgs(m => [...m, { role:'user', text:q }])
    setInput('')
    setLoading(true)
    setMsgs(m => [...m, { role:'ai', text:'...', typing:true }])
    try {
      const res = await fetch(`${apiBase}/chat/`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          query: q,
          session_id: 'demo-session',
          user_id: user?.id || null,
          user_preferences: user?.preferences || []
        })
      })
      const data = res.ok ? await res.json() : null
      setMsgs(m => {
        const filtered = m.filter(x => !x.typing)
        return [...filtered, {
          role: 'ai',
          text: data?.response || 'Sorry, I couldn\'t process that right now.',
          confidence: data?.confidence || 0,
          sources: data?.source_details || [],
          intent: data?.intent || 'general',
          reasoning: data?.reasoning || ''
        }]
      })
    } catch {
      setMsgs(m => {
        const filtered = m.filter(x => !x.typing)
        return [...filtered, { role:'ai', text:'Connection error — is the backend on port 8005 running?', confidence: 0, sources: [], intent: null, reasoning: null }]
      })
    } finally { setLoading(false) }
  }

  const suggestions = [
    'What\'s the top story today?',
    'Summarize the latest market news',
    'What sectors are trending?',
    user?.preferences?.length > 0 ? `Any news on ${user.preferences[0]}?` : 'Explain the top business story',
  ]

  return (
    <div className={`chat-drawer ${open ? 'open' : ''}`}>
      <div className="chat-header">
        <span>Navigator</span>
        <h3>Netflix of News Navigator</h3>
        <button className="close-btn" onClick={onClose}>X</button>
      </div>

      <div className="chat-suggestions-row">
        {suggestions.map(s => (
          <button key={s} onClick={() => { setInput(s); }}>{s}</button>
        ))}
      </div>

      <div className="chat-messages">
        {msgs.map((m, i) => (
          <div key={i} className={`chat-bubble ${m.role} ${m.typing ? 'typing' : ''}`}>
            {/* Intent Badge */}
            {m.role === 'ai' && m.intent && !m.typing && (
              <div className="chat-intent-badge" style={{background: INTENT_COLORS[m.intent] || '#95a5a6'}}>
                {INTENT_LABELS[m.intent] || m.intent}
              </div>
            )}

            {/* Formatted text with markdown support and followup extraction */}
            {m.role === 'ai' && !m.typing ? (() => {
              const textStr = m.text || ''
              const lines = textStr.split('\n')
              const cleanLines = []
              const followups = []
              
              for (const l of lines) {
                if (l.includes('[FOLLOWUP]')) {
                  followups.push(l.replace('[FOLLOWUP]', '').trim())
                } else {
                  cleanLines.push(l)
                }
              }

              return (
                <div className="chat-formatted-text">
                  {renderFormattedText(cleanLines.join('\n'))}
                  {followups.length > 0 && (
                    <div style={{marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6}}>
                      {followups.map((fq, fi) => (
                        <button key={fi} style={{
                          textAlign:'left', fontSize:'0.75rem', padding:'8px 12px',
                          background:'var(--bg-inset)', border:'1px solid var(--primary)',
                          color:'var(--text)', borderRadius:8, cursor:'pointer'
                        }} onClick={() => {
                          setInput(fq)
                          // Short delay to let the UI update the input state before sending, or we can just call send logic
                        }}>{fq}</button>
                      ))}
                    </div>
                  )}
                </div>
              )
            })() : (
              m.text
            )}

            {/* Trust Layer: Confidence + Sources + Reasoning */}
            {m.role === 'ai' && m.confidence > 0 && !m.typing && (
              <div className="chat-trust-layer">
                {/* Confidence Score */}
                <div className="confidence-row">
                  <span className="confidence-label">Confidence:</span>
                  <span className={`confidence-score ${m.confidence >= 70 ? 'high' : m.confidence >= 40 ? 'mid' : 'low'}`}>
                    {m.confidence}%
                  </span>
                  <span className="confidence-bar-bg">
                    <span className="confidence-bar-fill" style={{width: `${m.confidence}%`, background: m.confidence >= 70 ? '#2ecc71' : m.confidence >= 40 ? '#f39c12' : '#e74c3c'}}></span>
                  </span>
                </div>

                {/* Reasoning */}
                {m.reasoning && (
                  <div className="reasoning-row">
                    <span className="reasoning-label">Analysis:</span> {m.reasoning}
                  </div>
                )}

                {/* Sources */}
                {m.sources?.length > 0 && (
                  <div className="sources-row">
                    <span className="sources-label">Sources ({m.sources.length}):</span>
                    <div className="source-chips">
                      {m.sources.map((s, j) => (
                        <span key={j} className="source-chip">{s.source}: {s.title?.slice(0,50)}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="chat-input-row">
        <input
          type="text"
          placeholder="Ask anything about the news..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          disabled={loading}
        />
        <button onClick={send} disabled={loading}>
          {loading ? <span className="loading-spinner"></span> : 'Send'}
        </button>
      </div>
    </div>
  )
}
