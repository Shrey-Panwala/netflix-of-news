export default function PaperFooter({ apiBase }) {
  const docsUrl = `${apiBase.replace(/\/api\/v1\/?$/, '')}/docs`

  return (
    <footer className="paper-footer">
      <div className="footer-masthead">
        <div>Netflix of News</div>
      </div>
      <p className="footer-tagline">
        "We are not building a news app — we are building an AI that thinks for you before you read news."
      </p>
      <div className="footer-kpi-row">
        <span className="footer-kpi">6 AI Agents</span>
        <span className="footer-kpi">Live Multi-Source Ingestion</span>
        <span className="footer-kpi">RAG + Story Arc + Reels</span>
      </div>
      <div className="footer-links-row">
        <a href="#feed">Markets</a>
        <a href="#story-arc">Story Arc</a>
        <a href="#features">Features</a>
        <a href={docsUrl} target="_blank" rel="noopener noreferrer">API Docs</a>
      </div>
      <p className="footer-copy">
        © 2026 Netflix of News · Built for ET Hackathon · Powered by Groq, FAISS, NewsData.io and ❤️ — BENNETT, COLEMAN &amp; CO. LTD.
      </p>
    </footer>
  )
}
