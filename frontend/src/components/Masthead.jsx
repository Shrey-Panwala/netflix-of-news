export default function Masthead({ theme, toggleTheme, onChatOpen, user, onLogout, liveStatus }) {
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <header className="masthead">
      <div className="masthead-top">
        <div className="masthead-meta">
          <strong>BENNETT, COLEMAN &amp; CO. LTD.</strong><br />
          {dateStr} · AI Edition
        </div>

        <div className="masthead-logo">
          <h1>
            <span className="brand-word brand-word-netflix">Netflix</span>
            <span className="brand-word brand-word-of">of</span>
            <span className="brand-word brand-word-news">News</span>
          </h1>
          <div className="tagline">Powered by Artificial Intelligence · Economic Times Hackathon 2026</div>
        </div>

        <div className="masthead-controls">
          {user && (
            <div className="user-pill">
              <span className="user-name">{user.full_name?.split(' ')[0]}</span>
              <button className="logout-btn" onClick={onLogout} title="Logout">Logout</button>
            </div>
          )}
          <span className="mode-label">{theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</span>
          <div className="mode-toggle" onClick={toggleTheme} role="switch" aria-checked={theme === 'dark'} title="Toggle theme" />
        </div>
      </div>

      <div className="masthead-divider">
        <span className="edition-pill">AI Edition</span>
        {liveStatus === 'live' && (
          <span className="live-badge-pill">
            <span className="live-dot-anim"></span>
            LIVE
          </span>
        )}
        {liveStatus === 'syncing' && (
          <span className="syncing-badge">Syncing...</span>
        )}
        <div className="section-links">
          <a href="#feed" className="active">Markets</a>
          <a href="#feed">Business</a>
          <a href="#feed">Tech</a>
          <a href="#story-arc">Story Arc</a>
          <a href="#video">Video Reels</a>
          <a href="#features">About</a>
        </div>
        <button className="ask-ai-btn" onClick={onChatOpen}>
          Ask AI
        </button>
      </div>
    </header>
  )
}
