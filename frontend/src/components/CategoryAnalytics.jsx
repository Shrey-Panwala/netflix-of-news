import { useEffect, useState } from 'react'

const GLOBAL_COLORS = ['#e74c3c', '#3498db', '#9b59b6', '#f1c40f', '#e67e22', '#1abc9c', '#95a5a6']
const SOURCE_COLORS = ['#3498db', '#2ecc71', '#f1c40f', '#e74c3c', '#9b59b6', '#1abc9c']

const CATEGORY_EXPLANATIONS = {
  All: 'Global overview of the current news cycle. Metric cards summarize platform-wide ingestion and AI processing, while the donut chart shows article share by category.',
  Markets: 'Market analytics is computed from the live set of market-tagged stories, highlighting story volume, source depth, sentiment, and summarization coverage.',
  Business: 'Business analytics is computed from corporate and industry stories, with emphasis on IPO mentions, earnings-related impact, and source diversity.',
  Tech: 'Tech analytics tracks innovation-heavy coverage, AI mentions, and how much of the tech feed has already been processed into summaries.',
  Politics: 'Political analytics measures policy-heavy coverage, election watch stories, source spread, and the overall tone of the current political feed.',
}

function toNumber(value, fallback = 50) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function percent(value, total) {
  if (!total) return 0
  return Math.round((value / total) * 100)
}

function countKeywordMatches(articles, patterns) {
  return articles.reduce((count, article) => {
    const haystack = [article.title, article.tldr, article.content, article.category, article.source]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return count + (patterns.some(pattern => haystack.includes(pattern)) ? 1 : 0)
  }, 0)
}

function buildDistribution(entries, colors) {
  if (!entries.length) {
    return [{ name: 'No Data', value: 100, color: '#bdc3c7' }]
  }

  const total = entries.reduce((sum, [, value]) => sum + value, 0) || 1
  const topEntries = entries.slice(0, 5)
  let used = 0

  const distribution = topEntries.map(([name, value], index) => {
    const pct = percent(value, total)
    used += pct
    return {
      name,
      value: pct,
      color: colors[index % colors.length],
    }
  })

  if (distribution.length > 1 && used !== 100) {
    distribution[distribution.length - 1].value += 100 - used
  }

  return distribution
}

function buildGlobalDistribution(catCounts) {
  const entries = Object.entries(catCounts || {})
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])

  return buildDistribution(entries, GLOBAL_COLORS)
}

function buildSourceDistribution(activeArticles) {
  const sourceMap = activeArticles.reduce((acc, article) => {
    const source = article.source || 'Unknown'
    acc[source] = (acc[source] || 0) + 1
    return acc
  }, {})

  const entries = Object.entries(sourceMap).sort((a, b) => b[1] - a[1])
  return buildDistribution(entries, SOURCE_COLORS)
}

function useCountUp(end, duration = 1500) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let startTimestamp = null

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp
      const progress = Math.min((timestamp - startTimestamp) / duration, 1)
      const easeOut = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(easeOut * end))
      if (progress < 1) window.requestAnimationFrame(step)
    }

    setCount(0)
    window.requestAnimationFrame(step)
  }, [end, duration])

  return count > end ? end : count
}

function CircularProgress({ value, max, color, size = 60, delay = 0 }) {
  const [offset, setOffset] = useState(100)
  const radius = (size - 6) / 2
  const circ = 2 * Math.PI * radius

  useEffect(() => {
    const timeout = setTimeout(() => {
      setOffset(((max - value) / max) * 100)
    }, 100 + delay)

    return () => clearTimeout(timeout)
  }, [value, max, delay])

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)', filter: `drop-shadow(0 0 8px ${color}55)` }}>
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--divider-dark)" strokeWidth="4" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={(offset / 100) * circ}
        style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)' }}
      />
    </svg>
  )
}

function AnimatedBar({ value, max, color, delay = 0 }) {
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const timeout = setTimeout(() => setWidth((value / max) * 100), 100 + delay)
    return () => clearTimeout(timeout)
  }, [value, max, delay])

  return (
    <div style={{ height: 6, background: 'var(--divider-dark)', borderRadius: 4, overflow: 'hidden', marginTop: 12 }}>
      <div
        style={{
          height: '100%',
          width: `${width}%`,
          background: `linear-gradient(90deg, ${color}44, ${color})`,
          borderRadius: 4,
          transition: 'width 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
          boxShadow: `0 0 10px ${color}55`,
        }}
      />
    </div>
  )
}

function MetricCard({ chart, index }) {
  const currentVal = useCountUp(chart.value)

  return (
    <div
      style={{
        background: 'var(--surface-alt)',
        border: '1px solid var(--divider)',
        padding: 16,
        borderRadius: 'var(--radius-md)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        cursor: 'default',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.borderColor = chart.color
        e.currentTarget.style.boxShadow = `0 4px 12px ${chart.color}33`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.borderColor = 'var(--divider)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, width: 3, height: '100%', background: chart.color }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {chart.icon} {chart.label}
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--font-display)', marginTop: 8, display: 'flex', alignItems: 'baseline' }}>
            {currentVal.toLocaleString('en-IN')}
            {chart.unit && <span style={{ fontSize: '0.9rem', color: chart.color, marginLeft: 2, fontWeight: 700 }}>{chart.unit}</span>}
          </div>
        </div>
        {chart.isCircular && (
          <CircularProgress value={chart.value} max={chart.max} color={chart.color} delay={index * 150} />
        )}
      </div>

      {!chart.isCircular && (
        <AnimatedBar value={chart.value} max={chart.max} color={chart.color} delay={index * 100} />
      )}

      {chart.tip && (
        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 12, lineHeight: 1.4 }}>
          {chart.tip}
        </div>
      )}
    </div>
  )
}

function DonutChart({ data, size = 200 }) {
  const [hovered, setHovered] = useState(null)
  const total = data.reduce((sum, item) => sum + item.value, 0) || 100
  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.35
  const strokeWidth = size * 0.15
  const circumference = 2 * Math.PI * radius
  const [reveal, setReveal] = useState(0)

  useEffect(() => {
    const timeout = setTimeout(() => setReveal(1), 100)
    return () => clearTimeout(timeout)
  }, [data])

  let offset = 0
  const segments = data.map((item, index) => {
    const start = offset
    offset += item.value
    return { ...item, startPct: start / total, endPct: offset / total, index }
  })

  function handleMouseMove(event) {
    const svg = event.currentTarget
    const rect = svg.getBoundingClientRect()
    const mx = ((event.clientX - rect.left) / rect.width) * size - cx
    const my = ((event.clientY - rect.top) / rect.height) * size - cy
    const dist = Math.sqrt(mx * mx + my * my)

    if (dist < radius - strokeWidth || dist > radius + strokeWidth) {
      setHovered(null)
      return
    }

    let angle = Math.atan2(my, mx) + Math.PI / 2
    if (angle < 0) angle += Math.PI * 2
    const pct = angle / (Math.PI * 2)
    const activeSegment = segments.find(segment => pct >= segment.startPct && pct < segment.endPct)
    setHovered(activeSegment ? activeSegment.index : null)
  }

  let renderOffset = 0

  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} onMouseMove={handleMouseMove} onMouseLeave={() => setHovered(null)} style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.15))' }}>
        {data.map((item, index) => {
          const pct = item.value / total
          const dashLen = pct * circumference
          const currentOffset = renderOffset
          renderOffset += item.value
          const isHovered = hovered === index

          return (
            <circle
              key={item.name}
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={isHovered ? strokeWidth * 1.3 : strokeWidth}
              strokeDasharray={`${dashLen * reveal} ${circumference}`}
              strokeDashoffset={-(currentOffset / total) * circumference}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{
                transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                filter: isHovered ? `drop-shadow(0 0 8px ${item.color})` : 'none',
              }}
            />
          )
        })}
      </svg>

      <div style={{ position: 'absolute', pointerEvents: 'none', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text)', fontFamily: 'var(--font-display)', lineHeight: 1 }}>
          {hovered !== null ? `${data[hovered].value}%` : total}
        </div>
        <div style={{ fontSize: '0.65rem', color: hovered !== null ? data[hovered].color : 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>
          {hovered !== null ? data[hovered].name : 'Total'}
        </div>
      </div>
    </div>
  )
}

function computeAnalytics(activeCategory, articleCount, catCounts, activeArticles) {
  const safeArticles = activeArticles || []
  const totalArticles = articleCount || safeArticles.length || 0
  const processedCount = safeArticles.filter(article => article.tldr || article.summary).length
  const processedPct = totalArticles ? percent(processedCount, totalArticles) : 0
  const activeSources = [...new Set(safeArticles.map(article => article.source).filter(Boolean))]
  const avgSentiment = safeArticles.length
    ? Math.round(
        safeArticles.reduce((sum, article) => sum + clamp(toNumber(article.sentiment_score, 50), 0, 100), 0) / safeArticles.length
      )
    : 50

  if (activeCategory === 'All') {
    return {
      charts: [
        { label: 'Total Articles', value: totalArticles, max: Math.max(totalArticles, 10), color: '#e74c3c', icon: '📊', tip: 'Total news articles ingested across all categories in the current cycle.' },
        { label: 'Sources Active', value: activeSources.length, max: Math.max(activeSources.length, 10), color: '#3498db', icon: '🌐', tip: 'Distinct publishers contributing to the current live feed.' },
        { label: 'AI Processing', value: processedPct, max: 100, color: '#2ecc71', icon: '🤖', unit: '%', tip: 'Share of visible stories that already have AI-generated summaries.', isCircular: true },
        { label: 'Sentiment Score', value: avgSentiment, max: 100, color: '#f1c40f', icon: '💡', unit: '/100', tip: 'Average sentiment score across all live articles.', isCircular: true },
      ],
      radialData: buildGlobalDistribution(catCounts),
      explanation: CATEGORY_EXPLANATIONS.All,
      chartTitle: 'Category Distribution',
    }
  }

  const ipoMentions = countKeywordMatches(safeArticles, ['ipo', 'listing', 'public issue', 'draft papers'])
  const earningsImpact = countKeywordMatches(safeArticles, ['revenue', 'profit', 'earnings', 'sales', 'margin', 'guidance', 'loss'])
  const aiMentions = countKeywordMatches(safeArticles, ['ai', 'artificial intelligence', 'machine learning', 'semiconductor', 'chip', 'cloud'])
  const innovationHits = countKeywordMatches(safeArticles, ['startup', 'innovation', 'launch', 'platform', 'software', 'funding'])
  const policyHits = countKeywordMatches(safeArticles, ['policy', 'government', 'bill', 'cabinet', 'ministry', 'parliament', 'regulation'])
  const electionHits = countKeywordMatches(safeArticles, ['election', 'poll', 'vote', 'campaign', 'assembly', 'lok sabha'])

  const genericCharts = [
    { label: 'Stories Tracked', value: totalArticles, max: Math.max(totalArticles, 10), color: '#3498db', icon: '📰', tip: `Live ${activeCategory.toLowerCase()} stories in the current feed.` },
    { label: 'Sources Active', value: activeSources.length, max: Math.max(activeSources.length, 10), color: '#2ecc71', icon: '🌐', tip: `Distinct sources contributing to the ${activeCategory.toLowerCase()} feed.` },
    { label: 'Sentiment Score', value: avgSentiment, max: 100, color: '#f1c40f', icon: '💡', unit: '/100', tip: `Average sentiment score for ${activeCategory.toLowerCase()} articles.`, isCircular: true },
    { label: 'AI Coverage', value: processedPct, max: 100, color: '#e74c3c', icon: '🤖', unit: '%', tip: `Percentage of ${activeCategory.toLowerCase()} stories with AI summaries.`, isCircular: true },
  ]

  const categorySpecificCharts = {
    Markets: [
      { label: 'Market Stories', value: totalArticles, max: Math.max(totalArticles, 10), color: '#3498db', icon: '📈', tip: 'Total market and finance stories currently tracked.' },
      { label: 'Sources Active', value: activeSources.length, max: Math.max(activeSources.length, 10), color: '#2ecc71', icon: '🌐', tip: 'Distinct business and finance publishers in the market feed.' },
      { label: 'Market Sentiment', value: avgSentiment, max: 100, color: '#f1c40f', icon: '💹', unit: '/100', tip: 'Average sentiment score across market-tagged headlines.', isCircular: true },
      { label: 'AI Coverage', value: processedPct, max: 100, color: '#e74c3c', icon: '🤖', unit: '%', tip: 'Share of market stories processed by the AI summarization layer.', isCircular: true },
    ],
    Business: [
      { label: 'Deals Today', value: totalArticles, max: Math.max(totalArticles, 10), color: '#3498db', icon: '🤝', tip: 'Live business stories currently tracked in the feed.' },
      { label: 'IPO Pipeline', value: ipoMentions, max: Math.max(ipoMentions, 5), color: '#2ecc71', icon: '🚀', tip: 'Stories mentioning IPOs, listings, or public issues.' },
      { label: 'Corp. Sentiment', value: avgSentiment, max: 100, color: '#f1c40f', icon: '💼', unit: '/100', tip: 'Average sentiment score across business articles.', isCircular: true },
      { label: 'Revenue Impact', value: percent(earningsImpact, totalArticles), max: 100, color: '#e74c3c', icon: '📊', unit: '%', tip: 'Share of business stories touching revenue, profit, earnings, or margins.', isCircular: true },
    ],
    Tech: [
      { label: 'Tech Stories', value: totalArticles, max: Math.max(totalArticles, 10), color: '#9b59b6', icon: '💻', tip: 'Total technology stories currently in the live feed.' },
      { label: 'AI Mentions', value: aiMentions, max: Math.max(aiMentions, 5), color: '#2ecc71', icon: '🤖', tip: 'Stories mentioning AI, chips, semiconductors, or cloud infrastructure.' },
      { label: 'Innovation Score', value: percent(innovationHits, totalArticles), max: 100, color: '#3498db', icon: '💡', unit: '/100', tip: 'Share of tech stories focused on launches, funding, or innovation.' , isCircular: true },
      { label: 'AI Coverage', value: processedPct, max: 100, color: '#e84393', icon: '🧠', unit: '%', tip: 'Portion of tech stories already summarized by the AI pipeline.', isCircular: true },
    ],
    Politics: [
      { label: 'Policy Updates', value: policyHits, max: Math.max(policyHits, 5), color: '#f1c40f', icon: '🏛️', tip: 'Stories mentioning policies, bills, ministries, or regulations.' },
      { label: 'Sources Active', value: activeSources.length, max: Math.max(activeSources.length, 10), color: '#e74c3c', icon: '🗞️', tip: 'Distinct publishers contributing to the politics feed.' },
      { label: 'Public Opinion', value: avgSentiment, max: 100, color: '#3498db', icon: '📊', unit: '/100', tip: 'Average sentiment score across political coverage.', isCircular: true },
      { label: 'Election Watch', value: electionHits, max: Math.max(electionHits, 5), color: '#2ecc71', icon: '🗳️', tip: 'Stories mentioning elections, polls, voting, or campaigns.' },
    ],
  }

  return {
    charts: categorySpecificCharts[activeCategory] || genericCharts,
    radialData: buildSourceDistribution(safeArticles),
    explanation: CATEGORY_EXPLANATIONS[activeCategory] || `${activeCategory} analytics is computed directly from the currently visible feed, using source mix, sentiment average, and AI-processing coverage.`,
    chartTitle: 'Source Distribution',
  }
}

export default function CategoryAnalytics({ activeCategory, articleCount, catCounts, activeArticles }) {
  const [showExplanation, setShowExplanation] = useState(false)
  const data = computeAnalytics(activeCategory, articleCount, catCounts, activeArticles)

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, var(--surface) 0%, var(--bg-alt) 100%)',
        border: '1px solid var(--divider)',
        borderRadius: 'var(--radius-lg)',
        padding: '24px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: 'var(--shadow-md)',
        margin: '0 20px 20px',
      }}
    >
      <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: 300, height: 300, background: 'radial-gradient(circle, var(--primary-glow) 0%, transparent 70%)', opacity: 0.15, pointerEvents: 'none' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, borderBottom: '1px solid var(--divider)', paddingBottom: 16 }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-display)', letterSpacing: '0.05em' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary-glow)', animation: 'pulse-dot 2s infinite' }}></span>
          COMMAND CENTER: {activeCategory === 'All' ? 'GLOBAL' : activeCategory.toUpperCase()} ANALYTICS
        </h3>
        <button
          onClick={() => setShowExplanation(!showExplanation)}
          style={{
            background: showExplanation ? 'var(--text)' : 'transparent',
            color: showExplanation ? 'var(--surface)' : 'var(--text-sub)',
            border: '1px solid var(--divider-dark)',
            padding: '6px 16px',
            borderRadius: 20,
            fontSize: '0.75rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'all 0.2s ease',
            letterSpacing: '0.05em',
          }}
        >
          ⓘ Explain Charts
        </button>
      </div>

      {showExplanation && (
        <div style={{ background: 'var(--bg-inset)', padding: '16px 20px', borderRadius: 'var(--radius-md)', marginBottom: 24, border: '1px dashed var(--primary)', fontSize: '0.85rem', color: 'var(--text)', lineHeight: 1.6, animation: 'fadeInDown 0.3s ease' }}>
          <strong style={{ color: 'var(--primary)', marginRight: 6 }}>Intelligence Summary:</strong>
          {data.explanation}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.3fr) minmax(280px, 0.9fr)', gap: 24, alignItems: 'start' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {data.charts.map((chart, index) => (
            <MetricCard key={chart.label} chart={chart} index={index} />
          ))}
        </div>

        <div
          style={{
            background: 'var(--surface-alt)',
            border: '1px solid var(--divider)',
            padding: 20,
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: 0,
          }}
        >
          <h4 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 16px', width: '100%', textAlign: 'left' }}>
            {data.chartTitle}
          </h4>

          <DonutChart data={data.radialData} />

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', marginTop: 24, justifyContent: 'center' }}>
            {data.radialData.map((item) => (
              <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-sub)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }}></span>
                {item.name} <span style={{ opacity: 0.6 }}>{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
