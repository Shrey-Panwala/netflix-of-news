export default function Hero() {
  return (
    <section className="hero">
      {/* 3D Gradient Mesh Background */}
      <div className="hero-bg">
        <div className="hero-mesh"></div>
        <div className="hero-grid"></div>
      </div>

      <div className="hero-content">
        <div className="hero-badge">
          <span className="dot"></span>
          Live · AI-Powered · Real-Time
        </div>

        <h1>
          The Future of<br />
          <span className="gradient-text">News is Here</span>
        </h1>

        <p className="hero-subtitle">
          We are not building a news app — we are building an AI that{' '}
          <em>thinks for you before you read news.</em> Hyper-personalized,
          multilingual, and delivered in the format you love.
        </p>

        <div className="hero-actions">
          <a href="#feed" className="btn-primary">
            📰 Explore Your Feed
          </a>
          <a href="#story-arc" className="btn-ghost">
            📈 Track a Story →
          </a>
        </div>

        {/* Floating Stats */}
        <div className="hero-stats">
          <div className="stat-card glass">
            <div className="stat-value">6</div>
            <div className="stat-label">AI Agents</div>
          </div>
          <div className="stat-card glass">
            <div className="stat-value">90K+</div>
            <div className="stat-label">Sources</div>
          </div>
          <div className="stat-card glass">
            <div className="stat-value">12</div>
            <div className="stat-label">Languages</div>
          </div>
          <div className="stat-card glass">
            <div className="stat-value">0s</div>
            <div className="stat-label">Latency</div>
          </div>
        </div>
      </div>
    </section>
  )
}
