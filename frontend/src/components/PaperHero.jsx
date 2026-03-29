import NewsGlobe from './NewsGlobe'
import SentimentMap from './SentimentMap'
import MarketCharts from './MarketCharts'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function SkeletonLead() {
  return (
    <div className="hero-grid">
      <div className="hero-col" style={{ padding: 20 }}>
        {[70, 50, 85, 60, 40].map((width, index) => (
          <div key={index} className="skeleton" style={{ height: 12, width: `${width}%`, marginBottom: 10, borderRadius: 2 }} />
        ))}
      </div>
      <div className="hero-col-main">
        {[90, 70, 80, 60, 100, 80].map((width, index) => (
          <div key={index} className="skeleton" style={{ height: index < 3 ? 22 : 12, width: `${width}%`, marginBottom: 12, borderRadius: 2 }} />
        ))}
      </div>
      <div className="hero-col" style={{ padding: 20 }}>
        {[70, 50, 85, 60, 40, 70, 50].map((width, index) => (
          <div key={index} className="skeleton" style={{ height: 12, width: `${width}%`, marginBottom: 10, borderRadius: 2 }} />
        ))}
      </div>
    </div>
  )
}

function articleSnippet(article) {
  return (article?.tldr || article?.content?.slice(0, 180) || article?.title || '').trim()
}

export default function PaperHero({ lead, sideLeft, sideRight, onSelect, loading }) {
  const leftRail = sideLeft?.length ? sideLeft : lead ? [lead] : []
  const rightRail = sideRight?.length ? sideRight : lead ? [lead] : []

  return (
    <div className="paper-hero">
      {loading ? <SkeletonLead /> : (
        <div className="hero-grid">
          <div className="hero-col">
            {leftRail.length > 0
              ? leftRail.map((article, index) => (
                  <SidebarArt key={`${article.id || article.title}-${index}`} article={article} onSelect={onSelect} delay={index * 0.1} />
                ))
              : <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No articles yet. Sync is warming up the latest edition.</p>
            }
            <NewsGlobe />
          </div>

          <div className="hero-col-main reveal-up" style={{ animationDelay: '0.1s' }}>
            <div className="hero-markets-section">
              <div className="hero-markets-label">
                <span className="live-indicator"></span>
                Market Pulse
              </div>
              <MarketCharts />
            </div>

            {lead ? (
              <>
                <div className="hero-eyebrow" style={{ marginTop: '20px' }}>Top Story</div>
                <h2 className="hero-headline">{lead.title}</h2>
                <p className="hero-deck">{articleSnippet(lead)}</p>
                <button className="dive-btn" onClick={() => onSelect(lead)}>
                  Dive Deeper &rarr;
                </button>
                <div className="hero-byline">
                  {lead.source} &middot; {timeAgo(lead.published_at)}
                </div>
              </>
            ) : (
              <>
                <div className="hero-eyebrow" style={{ marginTop: '20px' }}>Netflix of News</div>
                <h2 className="hero-headline">The Future of News is <em>Here.</em></h2>
                <p className="hero-deck">
                  We are not building a news app. We are building an AI that <em>thinks for you before you read news.</em>
                  Hyper-personalized, multilingual, and delivered in seconds.
                </p>
                <a href="#feed" className="dive-btn">Explore Feed</a>
                <div className="hero-byline">Netflix of News &middot; Economic Times Hackathon 2026</div>
              </>
            )}
          </div>

          <div className="hero-col">
            {rightRail.length > 0
              ? rightRail.map((article, index) => (
                  <SidebarArt key={`${article.id || article.title}-right-${index}`} article={article} onSelect={onSelect} delay={index * 0.1} />
                ))
              : <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>Sync news to populate the right rail.</p>
            }
            <SentimentMap />
          </div>
        </div>
      )}
    </div>
  )
}

function SidebarArt({ article, onSelect, delay }) {
  return (
    <div
      className="sidebar-article reveal-left"
      style={{ animationDelay: `${delay}s` }}
      onClick={() => onSelect(article)}
    >
      <div className="art-tag">{article.source}</div>
      <h4>{article.title}</h4>
      <p>{articleSnippet(article).slice(0, 92)}...</p>
    </div>
  )
}
