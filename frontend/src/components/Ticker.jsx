const FALLBACK_HEADLINES = [
  { title: 'Markets live: Sensex up 350 pts, Nifty reclaims 22,500' },
  { title: 'RIL Q4 results beat estimates; EBITDA jumps 18% YoY' },
  { title: 'Budget 2026: FM hints at income tax relief for middle class' },
  { title: 'Adani Group stocks surge after Supreme Court ruling' },
  { title: 'Gold hits all-time high of Rs 74,000 per 10 gm' },
  { title: 'SEBI tightens F&O regulations for retail investors' },
]

export default function Ticker({ articles, onSelect }) {
  const headlines = articles.length > 0
    ? articles.filter(article => article?.title).map(article => ({ title: article.title, article }))
    : FALLBACK_HEADLINES

  const doubled = [...headlines, ...headlines]

  return (
    <div className="ticker-bar">
      <div className="ticker-label">
        <span className="blink"></span>
        Breaking
      </div>
      <div className="ticker-track">
        <div className="ticker-inner">
          {doubled.map((item, index) => (
            <span
              key={`${item.title}-${index}`}
              className={`ticker-item ${item.article ? 'clickable' : ''}`}
              onClick={() => item.article && onSelect?.(item.article)}
              role={item.article ? 'button' : undefined}
              tabIndex={item.article ? 0 : undefined}
              onKeyDown={(event) => {
                if (item.article && (event.key === 'Enter' || event.key === ' ')) {
                  event.preventDefault()
                  onSelect?.(item.article)
                }
              }}
            >
              {item.title}
              <span className="sep">◆</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
