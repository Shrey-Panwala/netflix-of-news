export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-brand">
        <div>Netflix of News</div>
      </div>
      <p className="footer-tagline">
        "We are not building a news app — we are building an AI that thinks for you."
      </p>
      <ul className="footer-links">
        <li><a href="#feed">Feed</a></li>
        <li><a href="#story-arc">Story Arc</a></li>
        <li><a href="#features">Features</a></li>
        <li><a href="https://github.com/Shrey-Panwala/netflix-of-news" target="_blank" rel="noopener noreferrer">GitHub</a></li>
      </ul>
      <p className="footer-copy">
        © 2026 Netflix of News · Built for ET Hackathon · Powered by Groq, FAISS, and ❤️
      </p>
    </footer>
  )
}
