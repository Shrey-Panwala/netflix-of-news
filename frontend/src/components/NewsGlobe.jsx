import { useRef, useEffect, useState } from 'react'

const CITIES = [
  { name: 'New Delhi', lat: 28.6, lon: 77.2, breaking: true, headline: 'Policy reforms drive economic surge' },
  { name: 'Mumbai', lat: 19.0, lon: 72.8, breaking: true, headline: 'Sensex hits new high amid FII inflows' },
  { name: 'New York', lat: 40.7, lon: -74.0, breaking: false, headline: 'Wall Street mixed on Fed outlook' },
  { name: 'London', lat: 51.5, lon: -0.1, breaking: true, headline: 'UK inflation drops below target' },
  { name: 'Tokyo', lat: 35.6, lon: 139.6, breaking: false, headline: 'BOJ holds rates steady' },
  { name: 'Beijing', lat: 39.9, lon: 116.4, breaking: true, headline: 'China tech sector faces scrutiny' },
  { name: 'Sydney', lat: -33.8, lon: 151.2, breaking: false, headline: 'Commodity exports boost AU economy' },
  { name: 'Dubai', lat: 25.2, lon: 55.2, breaking: false, headline: 'Oil price stabilizes near $80/bbl' },
  { name: 'Singapore', lat: 1.3, lon: 103.8, breaking: true, headline: 'ASEAN trade summit in progress' },
  { name: 'Sao Paulo', lat: -23.5, lon: -46.6, breaking: false, headline: 'Brazil agricultural output rises' },
  { name: 'Lagos', lat: 6.5, lon: 3.3, breaking: false, headline: 'African fintech investments grow' },
  { name: 'Moscow', lat: 55.7, lon: 37.6, breaking: false, headline: 'Energy exports face sanctions' },
  { name: 'Berlin', lat: 52.5, lon: 13.4, breaking: false, headline: 'EU green energy policy advances' },
  { name: 'Paris', lat: 48.8, lon: 2.3, breaking: true, headline: 'French AI regulation framework released' },
]

const GLOBE_THEME = {
  light: {
    glow: ['rgba(73, 153, 255, 0.22)', 'rgba(120, 193, 255, 0.12)', 'rgba(120, 193, 255, 0)'],
    body: ['rgba(205, 238, 255, 0.98)', 'rgba(106, 177, 232, 0.94)', 'rgba(40, 88, 148, 0.84)'],
    border: 'rgba(71, 132, 204, 0.5)',
    grid: 'rgba(81, 140, 198, 0.18)',
    lonGrid: 'rgba(81, 140, 198, 0.16)',
    label: '245,250,255',
    activeDot: 'rgba(226, 245, 255, ALPHA)',
    breakingDot: 'rgba(228, 90, 78, ALPHA)',
    beam: 'rgba(228, 90, 78, ALPHA)',
    ring: 'rgba(228, 90, 78, ALPHA)',
  },
  dark: {
    glow: ['rgba(63, 148, 255, 0.2)', 'rgba(80, 168, 255, 0.1)', 'rgba(80, 168, 255, 0)'],
    body: ['rgba(88, 152, 214, 0.96)', 'rgba(28, 74, 136, 0.92)', 'rgba(10, 30, 71, 0.9)'],
    border: 'rgba(116, 188, 255, 0.56)',
    grid: 'rgba(149, 206, 255, 0.22)',
    lonGrid: 'rgba(149, 206, 255, 0.18)',
    label: '235,246,255',
    activeDot: 'rgba(205, 232, 255, ALPHA)',
    breakingDot: 'rgba(255, 128, 115, ALPHA)',
    beam: 'rgba(255, 128, 115, ALPHA)',
    ring: 'rgba(255, 171, 156, ALPHA)',
  },
}

function latLonTo3D(lat, lon, radius) {
  const phi = (90 - lat) * (Math.PI / 180)
  const theta = (lon + 180) * (Math.PI / 180)
  return {
    x: -(radius * Math.sin(phi) * Math.cos(theta)),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  }
}

function withAlpha(color, alpha) {
  return color.replace('ALPHA', alpha.toFixed(3))
}

export default function NewsGlobe() {
  const canvasRef = useRef(null)
  const frameRef = useRef(null)
  const cityPositionsRef = useRef([])
  const [tooltip, setTooltip] = useState(null)
  const [showInfo, setShowInfo] = useState(false)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let rotation = 0

    const dpr = window.devicePixelRatio || 1
    const size = canvas.parentElement?.clientWidth || 200
    canvas.width = size * dpr
    canvas.height = size * dpr
    canvas.style.width = `${size}px`
    canvas.style.height = `${size}px`
    ctx.scale(dpr, dpr)

    const cx = size / 2
    const cy = size / 2
    const radius = size * 0.36

    function draw() {
      const isDark = document.documentElement.getAttribute('data-theme') === 'dark'
      const palette = isDark ? GLOBE_THEME.dark : GLOBE_THEME.light

      ctx.clearRect(0, 0, size, size)
      rotation += 0.003

      const outerGlow = ctx.createRadialGradient(cx, cy, radius * 0.8, cx, cy, radius * 1.42)
      outerGlow.addColorStop(0, palette.glow[0])
      outerGlow.addColorStop(0.55, palette.glow[1])
      outerGlow.addColorStop(1, palette.glow[2])
      ctx.beginPath()
      ctx.arc(cx, cy, radius * 1.42, 0, Math.PI * 2)
      ctx.fillStyle = outerGlow
      ctx.fill()

      const gradient = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, radius * 0.1, cx, cy, radius)
      gradient.addColorStop(0, palette.body[0])
      gradient.addColorStop(0.7, palette.body[1])
      gradient.addColorStop(1, palette.body[2])
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()

      ctx.beginPath()
      ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2)
      ctx.strokeStyle = palette.border
      ctx.lineWidth = isDark ? 2 : 1.7
      ctx.stroke()

      for (let lat = -60; lat <= 60; lat += 30) {
        const phi = (90 - lat) * (Math.PI / 180)
        const lineRadius = radius * Math.sin(phi)
        const lineY = cy - radius * Math.cos(phi)
        ctx.beginPath()
        ctx.ellipse(cx, lineY, lineRadius, lineRadius * 0.15, 0, 0, Math.PI * 2)
        ctx.strokeStyle = palette.grid
        ctx.lineWidth = 0.5
        ctx.stroke()
      }

      for (let i = 0; i < 6; i++) {
        const angle = (i * 30 + (rotation * 180) / Math.PI) * (Math.PI / 180)
        ctx.beginPath()
        ctx.ellipse(cx, cy, radius * Math.abs(Math.cos(angle)), radius, angle + Math.PI / 2, 0, Math.PI * 2)
        ctx.strokeStyle = palette.lonGrid
        ctx.lineWidth = 0.5
        ctx.stroke()
      }

      const time = Date.now() * 0.001
      const positions = []

      CITIES.forEach((city) => {
        const pos = latLonTo3D(city.lat, city.lon + rotation * (180 / Math.PI), radius)
        if (pos.z < 0) return

        const sx = cx + pos.x
        const sy = cy - pos.y
        const depthAlpha = 0.3 + (pos.z / radius) * 0.7
        const dotRadius = city.breaking ? 3.5 : 2

        positions.push({ x: sx, y: sy, city })

        ctx.font = `${city.breaking ? '600' : '400'} 7px sans-serif`
        ctx.fillStyle = `rgba(${palette.label},${(isDark ? depthAlpha * 0.88 : depthAlpha * 0.78).toFixed(3)})`
        ctx.fillText(city.name, sx + dotRadius + 3, sy + 2)

        ctx.beginPath()
        ctx.arc(sx, sy, dotRadius, 0, Math.PI * 2)
        ctx.fillStyle = city.breaking
          ? withAlpha(palette.breakingDot, depthAlpha)
          : withAlpha(palette.activeDot, isDark ? depthAlpha * 0.72 : depthAlpha * 0.58)
        ctx.fill()

        if (city.breaking) {
          const pulse = Math.sin(time * 2 + city.lat) * 0.5 + 0.5
          const beamLen = 12 + pulse * 10
          ctx.beginPath()
          ctx.moveTo(sx, sy)
          ctx.lineTo(sx, sy - beamLen)
          ctx.strokeStyle = withAlpha(palette.beam, depthAlpha * pulse * 0.7)
          ctx.lineWidth = 1
          ctx.stroke()

          const ringRadius = 3 + pulse * 6
          ctx.beginPath()
          ctx.arc(sx, sy, ringRadius, 0, Math.PI * 2)
          ctx.strokeStyle = withAlpha(palette.ring, depthAlpha * (1 - pulse) * 0.5)
          ctx.lineWidth = 0.8
          ctx.stroke()
        }
      })

      cityPositionsRef.current = positions
      frameRef.current = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(frameRef.current)
  }, [])

  function handleCanvasMove(event) {
    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const mx = event.clientX - rect.left
    const my = event.clientY - rect.top
    let found = null

    for (const point of cityPositionsRef.current) {
      const distance = Math.sqrt((point.x - mx) ** 2 + (point.y - my) ** 2)
      if (distance < 14) {
        found = { ...point.city, screenX: point.x, screenY: point.y }
        break
      }
    }

    setTooltip(found)
  }

  return (
    <div className="news-globe-wrap">
      <div className="globe-label">
        <span className="globe-dot"></span>
        Live News Globe
        <button className="graph-info-icon" onClick={() => setShowInfo(!showInfo)} title="What is this?">ⓘ</button>
      </div>
      {showInfo && (
        <div className="graph-inline-info">
          A 3D rotating globe showing cities where news is actively being tracked. <strong>Red beams</strong> mark cities with <strong>breaking news</strong>. Hover over dots to see city headlines.
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <canvas ref={canvasRef} className="news-globe-canvas" onMouseMove={handleCanvasMove} onMouseLeave={() => setTooltip(null)} />
        {tooltip && (
          <div className="canvas-tooltip" style={{ left: tooltip.screenX, top: tooltip.screenY - 40 }}>
            <strong>{tooltip.name}</strong>
            {tooltip.breaking && <span className="tooltip-breaking">BREAKING</span>}
            <span className="tooltip-headline">{tooltip.headline}</span>
          </div>
        )}
      </div>
      <div className="globe-legend">
        <span className="legend-item breaking"><span className="legend-dot"></span> Breaking</span>
        <span className="legend-item"><span className="legend-dot muted"></span> Active</span>
      </div>
    </div>
  )
}
