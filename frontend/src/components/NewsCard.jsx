export default function NewsCard({ article, onClick, delay = 0 }) {
  const timeAgo = article.published_at
    ? getTimeAgo(new Date(article.published_at))
    : ''

  return (
    <div
      className="news-card glass reveal"
      onClick={onClick}
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="news-card-source">
        <span className="source-dot"></span>
        {article.source || 'Unknown Source'}
      </div>

      <h3>{article.title}</h3>

      <p>
        {article.tldr || article.content?.slice(0, 180) || 'Click to read the full story...'}
      </p>

      <div className="news-card-footer">
        <span className="read-more">Dive In →</span>
        <span className="time-ago">{timeAgo}</span>
      </div>
    </div>
  )
}

function getTimeAgo(date) {
  const now = new Date()
  const diff = Math.floor((now - date) / 1000)
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}
