export default function PublicNav() {
  const Ig = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" />
    </svg>
  );
  return (
    <nav className="nav">
      <a href="/" className="brand">
        <span className="brand__mark">
          perch<span className="brand__mark-rank">Rank</span><span className="brand__mark-dot">.</span>
        </span>
      </a>
      <div className="nav__links">
        <a className="nav__login" href="/pricing">Pricing</a>
        <div className="followdrop">
          <button className="nav__login followdrop__btn" type="button">Follow us ▾</button>
          <div className="followdrop__panel">
            <a href="https://instagram.com/perchrank" target="_blank" rel="noopener noreferrer" className="followdrop__item">
              <Ig /> @perchrank
            </a>
          </div>
        </div>
        <a className="nav__login" href="/login?mode=login">Log in</a>
        <a className="nav__cta" href="/login">Sign up free</a>
      </div>
    </nav>
  );
}