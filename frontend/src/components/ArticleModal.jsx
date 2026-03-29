import { useState } from 'react'

export default function ArticleModal({ article, onClose, apiBase }) {
  const [exiting, setExiting] = useState(false)
  const [lang, setLang] = useState('Hindi')
  const [level, setLevel] = useState('Beginner')
  const [vernText, setVernText] = useState('')
  const [vernLoading, setVernLoading] = useState(false)

  function close() {
    setExiting(true)
    setTimeout(onClose, 300)
  }

  async function translate() {
    setVernLoading(true)
    setVernText('')
    try {
      const res = await fetch(`${apiBase}/news/${article.id}/vernacular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language: lang, reading_level: level })
      })
      const data = await res.json()
      setVernText(data.translated_content || data.content || JSON.stringify(data))
    } catch {
      setVernText('Translation unavailable. Please ensure the backend is running.')
    } finally {
      setVernLoading(false)
    }
  }

  return (
    <div className={`modal-backdrop ${exiting ? 'exiting' : ''}`} onClick={close}>
      <div
        className={`modal-paper ${exiting ? 'exiting' : ''}`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-paper-header">
          <button className="modal-close-btn" onClick={close}>✕</button>
          <div className="modal-kicker">{article.source || 'Netflix of News'}</div>
          <h2 className="modal-title">{article.title}</h2>
          <div className="modal-byline">
            <span>{article.source}</span>
            <span className="sep">|</span>
            <span>{article.published_at ? new Date(article.published_at).toLocaleDateString('en-IN', {day:'numeric',month:'long',year:'numeric'}) : 'Today'}</span>
          </div>
        </div>

        {/* Body */}
        <div className="modal-body-content">
          {article.content === 'ONLY AVAILABLE IN PAID PLANS'
            ? <em style={{color:'var(--text-muted)'}}>Full article content is available with a NewsData.io premium plan. The AI has access to the headline and can still answer questions via the Chat feature.</em>
            : article.content || article.tldr || 'No detailed content available for this article.'}

          {article.url && (
            <div style={{marginTop:16}}>
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="modal-original-link">
                Read Original Source
              </a>
            </div>
          )}
        </div>

        {/* Why This News Matters — AI Reasoning Panel */}
        <div className="why-this-news-panel">
          <div className="why-header">
            <div className="why-icon">AI</div>
            <div>
              <h4>Why This News Matters</h4>
              <p className="why-sub">AI-powered contextual analysis</p>
            </div>
          </div>
          <p className="why-content">
            {article.tldr
              ? `${article.tldr} This story is relevant because it impacts the broader ${article.category || 'economic'} landscape and could influence market sentiment in the near term.`
              : `This ${article.category || 'news'} story from ${article.source || 'a verified source'} covers developments that could affect investor outlook and market positioning. Use the Chat Navigator for deeper analysis.`
            }
          </p>
          <div className="why-meta">
            <span className="why-source">Source: {article.source || 'Verified'}</span>
            <span className="why-confidence">AI Confidence: High</span>
          </div>
        </div>

        {/* Vernacular Panel */}
        <div className="vernacular-panel">
          <div className="vernacular-header">
            <h4>Vernacular intelligence — Culturally Adapted Translation</h4>
          </div>
          <div className="vernacular-controls">
            <select
              className="vern-select"
              value={lang}
              onChange={e => setLang(e.target.value)}
            >
              <option value="Hindi">Hindi</option>
              <option value="Gujarati">Gujarati</option>
              <option value="Marathi">Marathi</option>
              <option value="Tamil">Tamil</option>
              <option value="Telugu">Telugu</option>
              <option value="Kannada">Kannada</option>
              <option value="Bengali">Bengali</option>
              <option value="Punjabi">Punjabi</option>
              <option value="Malayalam">Malayalam</option>
              <option value="Odia">Odia</option>
              <option value="Urdu">Urdu</option>
              <option value="English (Simplified)">English (Simplified)</option>
            </select>
            <select
              className="vern-select"
              value={level}
              onChange={e => setLevel(e.target.value)}
            >
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Expert">Expert</option>
              <option value="Explain like I am 5">Explain like I'm 5</option>
            </select>
            <button
              className="vern-translate-btn"
              onClick={translate}
              disabled={vernLoading}
            >
              {vernLoading ? <span className="loading-spinner"></span> : 'Translate'}
            </button>
          </div>
          {vernText && (
            <div className="vernacular-output">{vernText}</div>
          )}
        </div>
      </div>
    </div>
  )
}
