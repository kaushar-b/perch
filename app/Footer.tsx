export default function Footer() {
  const Ig = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" />
    </svg>
  );
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <span className="brand__mark">
            perch<span className="brand__mark-rank">Rank</span><span className="brand__mark-dot">.</span>
          </span>
          <p className="footer__tag">Your spot in eBay search.</p>
        </div>
        <div className="footer__col">
          <span className="footer__head">Follow us</span>
          <a className="footer__link" href="https://instagram.com/perchrank" target="_blank" rel="noopener noreferrer">
            <Ig /> @perchrank
          </a>
        </div>
        <div className="footer__col">
          <span className="footer__head">Support</span>
          <a className="footer__link" href="https://instagram.com/perchrank" target="_blank" rel="noopener noreferrer">
            <Ig /> Message us on Instagram
          </a>
        </div>
      </div>
      <p className="footer__legal">
        © {new Date().getFullYear()} perchRank · Not affiliated with eBay Inc.
      </p>
    </footer>
  );
}