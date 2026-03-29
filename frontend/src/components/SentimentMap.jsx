import { useRef, useEffect, useState } from 'react'

const REGIONS = [
  { name: 'North America', sentiment: 'positive', desc: 'Economic growth, strong consumer confidence', dots: [
    [-120,48],[-115,50],[-110,52],[-105,50],[-100,48],[-95,46],[-90,44],[-85,42],[-80,40],[-75,42],
    [-120,44],[-115,46],[-110,48],[-105,46],[-100,44],[-95,42],[-90,40],[-85,38],[-80,36],
    [-110,40],[-105,38],[-100,36],[-95,34],[-90,32],[-85,30],[-100,32],[-95,30],
  ]},
  { name: 'Europe', sentiment: 'tech', desc: 'AI regulation advances, tech innovation hub', dots: [
    [0,50],[5,52],[10,54],[15,52],[20,50],[25,48],[30,56],[35,58],[0,46],[5,48],[10,50],[15,48],[20,46],[25,44],
    [-5,42],[0,44],[5,46],[10,46],[15,44],[20,42],[30,50],[35,54],[25,52],
  ]},
  { name: 'South Asia', sentiment: 'growth', desc: 'Rapid economic expansion, startup boom', dots: [
    [70,30],[75,28],[80,26],[85,28],[75,24],[80,22],[85,24],[70,26],[72,20],[78,18],[80,14],[78,10],
    [75,32],[80,30],[85,32],[90,26],[95,22],[88,24],
  ]},
  { name: 'East Asia', sentiment: 'tech', desc: 'Leading semiconductor & AI development', dots: [
    [100,40],[105,42],[110,38],[115,36],[120,34],[125,36],[130,36],[135,38],[140,36],
    [100,36],[105,34],[110,32],[115,30],[120,28],[105,26],[110,24],[115,22],
    [100,22],[105,18],[110,16],[100,14],
  ]},
  { name: 'Middle East', sentiment: 'crisis', desc: 'Geopolitical tensions, oil price volatility', dots: [
    [35,32],[40,34],[45,32],[50,28],[55,26],[45,28],[50,24],[55,22],[40,30],[42,26],
  ]},
  { name: 'Africa', sentiment: 'growth', desc: 'Emerging markets, fintech revolution', dots: [
    [0,14],[5,12],[10,10],[15,8],[20,6],[25,4],[30,2],[35,0],[30,-4],[25,-8],[20,-12],[25,-16],
    [0,10],[5,8],[-5,8],[-10,10],[-15,14],[0,6],[5,4],[10,2],[15,0],[20,-2],[28,-6],[32,-10],
    [30,-20],[28,-24],[26,-28],[30,-30],
  ]},
  { name: 'South America', sentiment: 'positive', desc: 'Agricultural output surge, trade growth', dots: [
    [-75,4],[-70,2],[-65,0],[-60,-2],[-55,-4],[-50,-6],[-45,-8],[-40,-10],
    [-70,-6],[-65,-8],[-60,-10],[-55,-12],[-50,-14],[-45,-16],[-40,-18],
    [-65,-16],[-60,-20],[-55,-24],[-50,-28],[-55,-30],[-60,-34],[-65,-38],[-70,-40],
  ]},
  { name: 'Oceania', sentiment: 'positive', desc: 'Stable markets, commodity exports', dots: [
    [120,-20],[125,-22],[130,-24],[135,-26],[140,-28],[145,-30],[150,-28],[148,-26],[145,-24],
    [130,-18],[135,-16],[140,-14],[150,-20],[152,-24],[148,-32],[140,-34],
  ]},
]

const SENTIMENT_COLORS = {
  positive: '#27ae60',
  crisis: '#e74c3c',
  tech: '#3498db',
  growth: '#f39c12',
  neutral: '#7f8c8d',
}
const SENTIMENT_LABELS = {
  positive: 'Positive · Growth & stability signals detected',
  crisis: 'Crisis · Geopolitical tensions & conflict alerts',
  tech: 'Tech · Innovation & digital transformation coverage',
  growth: 'Growth · Emerging market expansion & investment',
}

export default function SentimentMap() {
  const canvasRef = useRef(null)
  const frameRef = useRef(null)
  const regionBoundsRef = useRef([])
  const [tooltip, setTooltip] = useState(null)
  const [showInfo, setShowInfo] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const w = canvas.parentElement?.clientWidth || 200
    const h = w * 0.72
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = w + 'px'
    canvas.style.height = h + 'px'
    ctx.scale(dpr, dpr)

    function project(lon, lat) {
      const x = ((lon + 180) / 360) * w
      const y = ((90 - lat) / 180) * h
      return [x, y]
    }

    // Precompute region centers for hover detection
    const bounds = REGIONS.map(region => {
      const projected = region.dots.map(d => project(d[0], d[1]))
      const cx = projected.reduce((s, p) => s + p[0], 0) / projected.length
      const cy = projected.reduce((s, p) => s + p[1], 0) / projected.length
      return { name: region.name, sentiment: region.sentiment, desc: region.desc, cx, cy, dots: projected }
    })
    regionBoundsRef.current = bounds

    let t = 0
    function draw() {
      ctx.clearRect(0, 0, w, h)
      t += 0.02
      ctx.fillStyle = 'rgba(20,15,15,0.05)'
      for (let x = 0; x < w; x += 8) {
        for (let y = 0; y < h; y += 8) {
          ctx.fillRect(x, y, 1, 1)
        }
      }
      REGIONS.forEach((region) => {
        const color = SENTIMENT_COLORS[region.sentiment] || SENTIMENT_COLORS.neutral
        const r = parseInt(color.slice(1, 3), 16)
        const g = parseInt(color.slice(3, 5), 16)
        const b = parseInt(color.slice(5, 7), 16)
        region.dots.forEach((dot, i) => {
          const [x, y] = project(dot[0], dot[1])
          const pulse = Math.sin(t + i * 0.3) * 0.3 + 0.7
          const dotSize = 2.2
          ctx.beginPath()
          ctx.arc(x, y, dotSize + 1.5, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${r},${g},${b},${0.15 * pulse})`
          ctx.fill()
          ctx.beginPath()
          ctx.arc(x, y, dotSize, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(${r},${g},${b},${0.5 + pulse * 0.3})`
          ctx.fill()
        })
      })
      frameRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  function handleMove(e) {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    let found = null
    for (const b of regionBoundsRef.current) {
      for (const d of b.dots) {
        if (Math.abs(d[0] - mx) < 10 && Math.abs(d[1] - my) < 10) {
          found = { ...b, screenX: mx, screenY: my }
          break
        }
      }
      if (found) break
    }
    setTooltip(found)
  }

  return (
    <div className="sentiment-map-wrap">
      <div className="globe-label">
        <span className="globe-dot" style={{ background: '#27ae60' }}></span>
        Global Sentiment
        <button className="graph-info-icon" onClick={() => setShowInfo(!showInfo)} title="What is this?">ⓘ</button>
      </div>
      {showInfo && (
        <div className="graph-inline-info">
          A dot-matrix world map showing the <strong>mood of news</strong> from each region. Colors indicate sentiment: 🟢 Positive, 🔴 Crisis, 🔵 Tech/Innovation, 🟡 Growth. Hover over any region to learn more.
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <canvas ref={canvasRef} className="sentiment-map-canvas" onMouseMove={handleMove} onMouseLeave={() => setTooltip(null)} />
        {tooltip && (
          <div className="canvas-tooltip" style={{ left: Math.min(tooltip.screenX, 160), top: tooltip.screenY - 45 }}>
            <strong>{tooltip.name}</strong>
            <span className="tooltip-sentiment" style={{ color: SENTIMENT_COLORS[tooltip.sentiment] }}>
              {tooltip.sentiment?.charAt(0).toUpperCase() + tooltip.sentiment?.slice(1)}
            </span>
            <span className="tooltip-headline">{tooltip.desc}</span>
          </div>
        )}
      </div>
      <div className="sentiment-legend">
        {Object.entries(SENTIMENT_COLORS).slice(0, 4).map(([key, color]) => (
          <span key={key} className="legend-item" title={SENTIMENT_LABELS[key]}>
            <span className="legend-dot" style={{ background: color }}></span>
            {key.charAt(0).toUpperCase() + key.slice(1)}
          </span>
        ))}
      </div>
    </div>
  )
}
