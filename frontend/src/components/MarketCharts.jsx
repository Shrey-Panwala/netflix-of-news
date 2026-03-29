import { useState, useEffect, useRef } from 'react'

function Sparkline({ data, color, width = 200, height = 50, unit, name }) {
  const [hover, setHover] = useState(null)
  const svgRef = useRef(null)
  
  if (!data || data.length < 2) return <div style={{width, height, opacity:0.3, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'0.6rem', color:'var(--text-muted)'}}>Loading...</div>
  
  const prices = data.map(d => typeof d === 'number' ? d : d.price || 0)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1
  const stepX = width / (prices.length - 1)

  const coords = prices.map((v, i) => {
    const x = i * stepX
    const y = height - ((v - min) / range) * (height - 10) - 5
    return [x, y, v]
  })
  const points = coords.map(([x, y]) => `${x},${y}`).join(' ')
  const lastY = coords[coords.length - 1][1]
  const pathParts = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`)
  const areaPath = `M0,${height} ${pathParts.join(' ')} L${width},${height} Z`

  function handleMouse(e) {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const mx = ((e.clientX - rect.left) / rect.width) * width
    let closest = 0, closestDist = Infinity
    coords.forEach(([x], i) => {
      const d = Math.abs(x - mx)
      if (d < closestDist) { closestDist = d; closest = i }
    })
    setHover(closest)
  }

  return (
    <svg
      ref={svgRef} width={width} height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="sparkline-svg sparkline-interactive"
      onMouseMove={handleMouse} onMouseLeave={() => setHover(null)}
    >
      <defs>
        <linearGradient id={`grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#grad-${color.replace('#','')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={width} cy={lastY} r="3" fill={color} />
      <circle cx={width} cy={lastY} r="5" fill={color} opacity="0.3">
        <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
      </circle>
      {hover !== null && coords[hover] && (
        <>
          <line x1={coords[hover][0]} y1={0} x2={coords[hover][0]} y2={height} stroke={color} strokeWidth="0.8" strokeDasharray="2,2" opacity="0.5" />
          <circle cx={coords[hover][0]} cy={coords[hover][1]} r="4" fill="white" stroke={color} strokeWidth="2" />
          <rect x={Math.min(coords[hover][0] - 32, width - 66)} y={Math.max(coords[hover][1] - 22, 2)} width="64" height="18" rx="4" fill="rgba(0,0,0,0.8)" />
          <text x={Math.min(coords[hover][0], width - 34)} y={Math.max(coords[hover][1] - 9, 14)} textAnchor="middle" fill="white" fontSize="9" fontWeight="700" fontFamily="var(--font-body)">
            {coords[hover][2].toLocaleString('en-IN', { maximumFractionDigits: 2 })}
          </text>
        </>
      )}
      {data[0] && typeof data[0] === 'object' && data[0].time && (
        <>
          <text x="2" y={height - 1} fontSize="7" fill="rgba(128,128,128,0.5)" fontFamily="var(--font-body)">{data[0].time}</text>
          <text x={width - 30} y={height - 1} fontSize="7" fill="rgba(128,128,128,0.5)" fontFamily="var(--font-body)">{data[data.length-1].time}</text>
        </>
      )}
    </svg>
  )
}

const DEFAULT_COLORS = ['#c0392b', '#2980b9', '#f39c12', '#27ae60', '#8e44ad', '#e84393', '#0984e3', '#d35400']

export default function MarketCharts({ apiBase }) {
  const [marketData, setMarketData] = useState([])
  const [expanded, setExpanded] = useState(null)
  const [showInfo, setShowInfo] = useState(false)
  const [showAddStock, setShowAddStock] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [userSymbols, setUserSymbols] = useState(() => {
    const saved = localStorage.getItem('ainews_watchlist')
    return saved ? JSON.parse(saved) : []
  })
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)

  const effectiveApiBase = apiBase || (import.meta.env.VITE_API_BASE || 'http://localhost:8005/api/v1')

  // Build symbol list: defaults + user-selected
  const allSymbols = ['^BSESN', '^NSEI', 'GC=F', 'CL=F', ...userSymbols.map(s => s.symbol)]
  const symbolsParam = [...new Set(allSymbols)].join(',')

  async function fetchQuotes() {
    try {
      const r = await fetch(`${effectiveApiBase}/market/quotes?symbols=${encodeURIComponent(symbolsParam)}`)
      if (r.ok) {
        const data = await r.json()
        const quotes = data.quotes || {}
        const items = Object.entries(quotes).map(([symbol, q], idx) => {
          const prices = (q.intraday || []).map(p => typeof p === 'number' ? p : p.price || 0)
          const validPrices = prices.filter(p => p > 0)
          const fallbackOpen = validPrices.length > 0 ? validPrices[0] : 0
          const fallbackHigh = validPrices.length > 0 ? Math.max(...validPrices) : 0
          const fallbackLow = validPrices.length > 0 ? Math.min(...validPrices) : 0
          return {
          id: symbol,
          name: q.name || symbol,
          current: q.current || 0,
          change: q.change || 0,
          changePct: q.change_pct || 0,
          open: q.open || fallbackOpen,
          high: q.high || fallbackHigh,
          low: q.low || fallbackLow,
          color: q.color || DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
          unit: q.unit || '',
          type: q.type || 'stock',
          data: q.intraday || [],
          error: q.error,
          desc: q.type === 'index' 
            ? `${q.name} is a benchmark market index.`
            : symbol === 'GC=F' 
            ? 'Gold futures track precious metal demand and global safe-haven inflows.'
            : symbol === 'CL=F'
            ? 'Brent Crude Oil reflects global energy consumption and geopolitical stability.'
            : `${q.name} stock on NSE.`,
          }
        })
        setMarketData(items)
        setLastUpdated(data.timestamp)
      }
    } catch (e) {
      console.error('Market fetch error:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchQuotes()
    const interval = setInterval(fetchQuotes, 30000) // Refresh every 30s
    return () => clearInterval(interval)
  }, [symbolsParam])

  async function searchStocks(q) {
    setSearchQuery(q)
    if (q.length < 1) { setSearchResults([]); return }
    try {
      const r = await fetch(`${effectiveApiBase}/market/search?q=${encodeURIComponent(q)}`)
      if (r.ok) {
        const data = await r.json()
        setSearchResults(data.results || [])
      }
    } catch { setSearchResults([]) }
  }

  function addStock(stock) {
    const exists = userSymbols.find(s => s.symbol === stock.symbol)
    if (!exists) {
      const updated = [...userSymbols, stock]
      setUserSymbols(updated)
      localStorage.setItem('ainews_watchlist', JSON.stringify(updated))
    }
    setShowAddStock(false)
    setSearchQuery('')
    setSearchResults([])
  }

  function removeStock(symbol) {
    const updated = userSymbols.filter(s => s.symbol !== symbol)
    setUserSymbols(updated)
    localStorage.setItem('ainews_watchlist', JSON.stringify(updated))
  }

  return (
    <div className="market-charts-container">
      {/* Header with Add Stock button */}
      <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8}}>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          {lastUpdated && (
            <span style={{fontSize:'0.5rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.08em'}}>
              Live · Updated {new Date(lastUpdated).toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'})}
            </span>
          )}
        </div>
        <button 
          onClick={() => setShowAddStock(!showAddStock)}
          style={{
            fontSize:'0.6rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em',
            padding:'4px 10px', background:'var(--accent-soft)', color:'var(--primary)',
            border:'1px solid var(--primary)', borderRadius:'var(--radius-sm)', cursor:'pointer'
          }}
        >
          {showAddStock ? '✕ Close' : '+ Add Stock'}
        </button>
      </div>

      {/* Add Stock Panel */}
      {showAddStock && (
        <div style={{
          background:'var(--surface)', border:'1px solid var(--divider)', borderRadius:'var(--radius-md)',
          padding:12, marginBottom:12, animation:'fadeInUp 0.3s ease'
        }}>
          <input
            value={searchQuery}
            onChange={e => searchStocks(e.target.value)}
            placeholder="Search stocks — Reliance, TCS, HDFC..."
            style={{
              width:'100%', padding:'8px 12px', fontSize:'0.8rem', border:'1px solid var(--divider)',
              borderRadius:'var(--radius-sm)', background:'var(--bg-inset)', color:'var(--text)',
              fontFamily:'var(--font-body)', outline:'none'
            }}
          />
          {searchResults.length > 0 && (
            <div style={{marginTop:8, maxHeight:150, overflowY:'auto'}}>
              {searchResults.map(s => (
                <div key={s.symbol} onClick={() => addStock(s)} style={{
                  display:'flex', justifyContent:'space-between', alignItems:'center',
                  padding:'6px 8px', cursor:'pointer', borderBottom:'1px solid var(--divider)',
                  fontSize:'0.75rem', transition:'background 0.15s',
                }} onMouseEnter={e => e.target.style.background = 'var(--accent-soft)'}
                   onMouseLeave={e => e.target.style.background = 'transparent'}>
                  <span><strong>{s.name}</strong> <span style={{color:'var(--text-muted)'}}>{s.symbol}</span></span>
                  <span style={{color:'var(--text-dim)',fontSize:'0.65rem'}}>{s.sector}</span>
                </div>
              ))}
            </div>
          )}
          {/* User's watchlist */}
          {userSymbols.length > 0 && (
            <div style={{marginTop:8, display:'flex', flexWrap:'wrap', gap:4}}>
              <span style={{fontSize:'0.55rem',color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',width:'100%'}}>Your Watchlist:</span>
              {userSymbols.map(s => (
                <span key={s.symbol} style={{
                  fontSize:'0.6rem', padding:'2px 8px', background:'var(--accent-soft)',
                  border:'1px solid var(--divider)', borderRadius:12, display:'flex', alignItems:'center', gap:4
                }}>
                  {s.name}
                  <button onClick={(e) => { e.stopPropagation(); removeStock(s.symbol) }} style={{
                    fontSize:'0.55rem', color:'var(--primary)', cursor:'pointer', fontWeight:700,
                    background:'none', border:'none', padding:0
                  }}>✕</button>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info overlay */}
      {showInfo && (
        <div className="graph-info-overlay" onClick={() => setShowInfo(false)}>
          <div className="graph-info-card" onClick={e => e.stopPropagation()}>
            <button className="graph-info-close" onClick={() => setShowInfo(false)}>✕</button>
            <h4>Market Pulse — Live Data</h4>
            <p>These charts show <strong>real-time market data</strong> from Yahoo Finance. Charts auto-refresh every 30 seconds.</p>
            <ul>
              <li><strong>SENSEX</strong> — BSE 30-stock benchmark index</li>
              <li><strong>NIFTY 50</strong> — NSE 50-stock benchmark index</li>
              <li><strong>GOLD</strong> — International gold price (safe-haven asset)</li>
              <li><strong>CRUDE OIL</strong> — Brent Crude Oil (energy commodity)</li>
              {userSymbols.map(s => (
                <li key={s.symbol}><strong>{s.name}</strong> — {s.sector} sector</li>
              ))}
            </ul>
            <p className="graph-info-hint"><strong>Hover over charts</strong> for exact prices. <strong>Click "Add Stock"</strong> to track your own stocks.</p>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{textAlign:'center',padding:20,color:'var(--text-muted)',fontSize:'0.8rem'}}>
          <span className="loading-spinner" style={{marginRight:8}}></span>
          Fetching live market data...
        </div>
      ) : (
        <div className="market-charts-grid">
          {marketData.map((m, idx) => {
            const isUp = m.change >= 0
            const isExpanded = expanded === m.id
            const isUserStock = userSymbols.some(s => s.symbol === m.id)
            return (
              <div
                key={m.id}
                className={`market-chart-card ${isExpanded ? 'expanded' : ''}`}
                onClick={() => setExpanded(isExpanded ? null : m.id)}
              >
                <div className="market-chart-header">
                  <span className="market-name">
                    {m.name}
                    {isUserStock && <span style={{fontSize:'0.45rem',color:'var(--primary)',marginLeft:4}}>★</span>}
                  </span>
                  <span className={`market-arrow ${isUp ? 'up' : 'down'}`}>
                    {isUp ? '▲' : '▼'}
                  </span>
                </div>
                <div className="market-price-row">
                  <span className="market-price">
                    {m.current ? m.current.toLocaleString('en-IN', { maximumFractionDigits: 2 }) : '—'}
                    {m.unit ? <span className="market-unit">{m.unit}</span> : ''}
                  </span>
                  <span className={`market-change ${isUp ? 'up' : 'down'}`}>
                    {m.current ? `${isUp ? '+' : ''}${m.change.toFixed(2)} (${isUp ? '+' : ''}${m.changePct.toFixed(2)}%)` : 'Loading...'}
                  </span>
                </div>
                <Sparkline data={m.data} color={m.color} width={200} height={50} unit={m.unit} name={m.name} />
                <div className="market-timeframe">
                  <span>Intraday · 5min intervals</span>
                </div>
                {isExpanded && (
                  <div className="market-card-detail">
                    <p>{m.desc}</p>
                    <div className="market-detail-stats">
                      {m.open > 0 && <span>Open: {m.open.toLocaleString('en-IN', {maximumFractionDigits: 2})}</span>}
                      {m.high > 0 && <span>High: {m.high.toLocaleString('en-IN', {maximumFractionDigits: 2})}</span>}
                      {m.low > 0 && <span>Low: {m.low.toLocaleString('en-IN', {maximumFractionDigits: 2})}</span>}
                    </div>
                    {isUserStock && (
                      <button onClick={(e) => { e.stopPropagation(); removeStock(m.id) }} style={{
                        marginTop:8, fontSize:'0.6rem', color:'var(--primary)', background:'var(--accent-soft)',
                        border:'1px solid var(--primary)', padding:'3px 8px', borderRadius:4, cursor:'pointer',
                        fontWeight:600
                      }}>Remove from Watchlist</button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
      <button className="graph-explain-btn" onClick={() => setShowInfo(true)} title="What is this?">ⓘ Explain Charts</button>
    </div>
  )
}
