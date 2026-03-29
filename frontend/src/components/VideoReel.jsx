import { useState, useRef, useEffect } from 'react'

export default function VideoReel({ apiBase }) {
  const parsedApi = new URL(apiBase)
  const mediaBase = `${parsedApi.protocol}//${window.location.hostname}:${parsedApi.port}`

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [result, setResult] = useState(null)
  const [mediaToken, setMediaToken] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [progress, setProgress] = useState('')
  const [latestArticles, setLatestArticles] = useState([])
  const videoRef = useRef(null)
  const audioRef = useRef(null)

  const videoSrc = result?.video_url ? `${mediaBase}${result.video_url}?t=${mediaToken}` : ''
  const audioSrc = result?.audio_url ? `${mediaBase}${result.audio_url}?t=${mediaToken}` : ''

  const presets = [
    { label: 'Top Market Move', title: 'Sensex Surges 600 Points', content: 'Indian markets opened strongly today with the Sensex surging over 600 points. IT sector stocks led the rally amid positive global cues and strong FII inflow.' },
    { label: 'Budget Update', title: 'Budget 2026 Key Highlights', content: 'Finance Minister announced income tax relief for middle class, increased infrastructure spend by 30%, and new PLI schemes for electronics and semiconductor manufacturing.' },
    { label: 'Adani Group', title: 'Adani Ports Q4 Results Beat Estimates', content: 'Adani Ports reported a 24% jump in Q4 net profit, beating analyst estimates. The company also announced a major expansion in the Middle East with a new port deal.' },
    { label: 'RBI Policy', title: 'RBI Holds Rates for Third Consecutive Meeting', content: 'The Reserve Bank of India kept the repo rate unchanged at 6.5% in its latest monetary policy committee meeting, while maintaining a hawkish stance on inflation.' },
  ]

  // Fetch latest articles for "Generate from Latest" feature
  useEffect(() => {
    async function fetchLatest() {
      try {
        const r = await fetch(`${apiBase}/feed/personalized?limit=5`)
        if (r.ok) {
          const data = await r.json()
          setLatestArticles(data.articles || [])
        }
      } catch {}
    }
    fetchLatest()
  }, [apiBase])

  useEffect(() => {
    if (!audioRef.current) return
    const audio = audioRef.current
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => setIsPlaying(false)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)
    return () => {
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
    }
  }, [result])

  useEffect(() => {
    if (!videoRef.current || !videoSrc) return
    const v = videoRef.current
    v.load()
    const playPromise = v.play()
    if (playPromise && typeof playPromise.catch === 'function') {
      playPromise.catch(() => {})
    }
  }, [videoSrc])

  async function generate() {
    if (!title.trim()) { setError('Please enter a title'); return }
    setLoading(true); setError(''); setResult(null)
    setProgress('Generating AI script...')
    
    // Simulate progress steps
    const progressSteps = [
      { msg: 'Generating AI script...', delay: 0 },
      { msg: 'Creating visual scenes...', delay: 3000 },
      { msg: 'Generating voice-over...', delay: 6000 },
      { msg: 'Compiling video frames...', delay: 9000 },
      { msg: 'Finalizing MP4 output...', delay: 12000 },
    ]
    const timers = progressSteps.map(step => 
      setTimeout(() => setProgress(step.msg), step.delay)
    )

    try {
      const r = await fetch(`${apiBase}/video/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim() || title.trim() })
      })
      if (r.ok) {
        const data = await r.json()
        setMediaToken(Date.now())
        setResult(data.video_assets)
        if (data.video_assets?.error) {
          setError(data.video_assets.error)
        }
        setProgress('')
      } else {
        const err = await r.json()
        setError(err.detail || 'Generation failed')
        setProgress('')
      }
    } catch(e) {
      setError('Connection error — is the backend running?')
      setProgress('')
    } finally {
      setLoading(false)
      timers.forEach(t => clearTimeout(t))
    }
  }

  function useArticle(article) {
    setTitle(article.title || '')
    setContent(article.content || article.tldr || article.title || '')
    setResult(null)
    setError('')
  }

  return (
    <div className="video-reel-section">
      {/* Latest News Quick Pick */}
      {latestArticles.length > 0 && (
        <div style={{marginBottom:20}}>
          <div className="section-label" style={{color:'#2ecc71'}}>Generate from Latest News</div>
          <div style={{display:'flex',gap:8,overflowX:'auto',paddingBottom:6}}>
            {latestArticles.slice(0, 4).map((a, i) => (
              <button key={i} onClick={() => useArticle(a)}
                style={{
                  flexShrink:0, maxWidth:220, textAlign:'left', padding:'8px 12px',
                  background:'var(--surface)', border:'1px solid var(--divider)',
                  borderRadius:'var(--radius-sm)', cursor:'pointer', transition:'all 0.2s',
                  fontSize:'0.7rem', lineHeight:1.4, color:'var(--text)',
                }}
                onMouseEnter={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.background = 'var(--accent-soft)' }}
                onMouseLeave={e => { e.target.style.borderColor = 'var(--divider)'; e.target.style.background = 'var(--surface)' }}
              >
                <div style={{fontWeight:700,fontSize:'0.65rem',marginBottom:3}}>{a.title?.slice(0, 60)}{a.title?.length > 60 ? '...' : ''}</div>
                <div style={{fontSize:'0.55rem',color:'var(--text-muted)'}}>{a.source}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Presets */}
      <div style={{marginBottom:20}}>
        <div className="section-label">Quick Presets</div>
        <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
          {presets.map(p => (
            <button key={p.label} onClick={() => { setTitle(p.title); setContent(p.content); setResult(null) }}
              className="preset-chip">{p.label}</button>
          ))}
        </div>
      </div>

      {/* Input Form */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:16}}>
        <div>
          <label className="section-label" style={{display:'block',marginBottom:6}}>
            News Headline *
          </label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="e.g. Sensex surges 600 points on strong FII inflow"
            className="video-input"
          />
        </div>
        <div>
          <label className="section-label" style={{display:'block',marginBottom:6}}>
            Context (optional)
          </label>
          <input
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Additional context for the AI script..."
            className="video-input"
          />
        </div>
      </div>

      <button onClick={generate} disabled={loading} className="generate-btn" style={{whiteSpace: 'pre-wrap', lineHeight: 1.4}}>
        {loading ? (
          <>
            <span className="loading-spinner"></span>
            <span>{progress || 'Generating...'}</span>
          </>
        ) : 'Generate Netflix of News Reel\n(60-120s Broadcast w/ Contextual Data Overlays)'}
      </button>

      {/* Progress indicator */}
      {loading && progress && (
        <div style={{
          marginTop:12, padding:'10px 14px', background:'var(--surface)',
          border:'1px solid var(--divider)', borderRadius:'var(--radius-sm)',
          display:'flex', alignItems:'center', gap:10,
        }}>
          <div style={{
            width:8, height:8, borderRadius:'50%', background:'var(--primary)',
            animation:'pulse-dot 1s ease-in-out infinite',
          }} />
          <span style={{fontSize:'0.78rem',color:'var(--text-sub)',fontWeight:500}}>{progress}</span>
        </div>
      )}

      {error && <p style={{color:'var(--primary)',fontStyle:'italic',marginTop:12,fontSize:'0.85rem'}}>{error}</p>}

      {/* Result */}
      {result && (
        <div className="reel-result-grid">
          {/* Video Player Panel */}
          {result.video_url ? (
            <div className="reel-panel reel-video-panel">
              <div className="panel-label" style={{color:'#2ecc71'}}>Netflix of News Reel Video</div>
              <div className="video-wrapper">
                <video
                  ref={videoRef}
                  controls
                  autoPlay
                  muted
                  playsInline
                  preload="auto"
                  src={videoSrc}
                  style={{width:'100%',borderRadius:'4px',background:'#000',maxHeight:'400px'}}
                >
                  Your browser does not support the video element.
                </video>

                {/* AI Anchor Overlay */}
                <div className="ai-anchor-overlay">
                  <div className="anchor-avatar">
                    <div className="anchor-avatar-inner">AI</div>
                    {isPlaying && <div className="anchor-pulse-ring"></div>}
                  </div>
                  <div className="anchor-info">
                    <div className="anchor-name">Netflix of News Anchor</div>
                    <div className="anchor-badge-row">
                      <span className="anchor-live-badge">
                        <span className="anchor-live-dot"></span>
                        LIVE
                      </span>
                      <span className="anchor-network">Netflix of News</span>
                    </div>
                  </div>
                  {isPlaying && (
                    <div className="speaking-waveform">
                      {[...Array(5)].map((_, i) => (
                        <span key={i} className="wave-bar" style={{ animationDelay: `${i * 0.1}s` }}></span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {result.scene_count && (
                <div style={{fontSize:'0.6rem',color:'var(--text-muted)',marginTop:6}}>
                  {result.scene_count} scenes · {result.visual_mode === 'scene_t2i_with_fallback' ? 'AI-generated visuals' : 'Standard visuals'}
                </div>
              )}
              <a href={videoSrc} download className="download-link">
                Download Video (MP4)
              </a>
            </div>
          ) : (
            <div className="reel-panel">
              <div className="panel-label" style={{color:'#f39c12'}}>Video</div>
              <p style={{color:'var(--text-muted)',fontSize:'0.85rem'}}>
                Video generation unavailable right now. {error ? `Details: ${error}` : 'Ensure MoviePy and ffmpeg are installed.'}
              </p>
            </div>
          )}

          {/* Script Panel */}
          <div className="reel-panel">
            <div className="panel-label" style={{color:'var(--primary)'}}>AI-Generated Script</div>
            <p style={{fontSize:'0.88rem',color:'var(--text-sub)',lineHeight:1.75,whiteSpace:'pre-wrap',fontFamily:'var(--font-display)'}}>
              {result.script}
            </p>

            {/* Audio Player with Anchor */}
            {result.audio_url && (
              <div style={{marginTop:18,paddingTop:14,borderTop:'1px solid var(--divider)'}}>
                <div className="panel-label" style={{color:'#27ae60',marginBottom:8}}>Voice-Over Audio</div>
                <div className="audio-anchor-row">
                  <div className="audio-anchor-mini">
                    <div className="anchor-avatar-small">AI</div>
                    {isPlaying && (
                      <div className="speaking-waveform-small">
                        {[...Array(4)].map((_, i) => (
                          <span key={i} className="wave-bar-sm" style={{ animationDelay: `${i * 0.12}s` }}></span>
                        ))}
                      </div>
                    )}
                  </div>
                  <audio
                    ref={audioRef}
                    controls
                    preload="auto"
                    src={audioSrc}
                    style={{flex:1,outline:'none'}}
                  >
                    Your browser does not support the audio element.
                  </audio>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
