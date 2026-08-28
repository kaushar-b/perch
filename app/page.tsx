"use client";

import { useState } from "react";
import PublicNav from "./PublicNav";
import Footer from "./Footer";

type Rung = { pos: number; label: string; promoted: boolean; isYou: boolean };
type RankResult = {
  found: boolean;
  position: number | null;
  total: number;
  keyword: string;
  delta: number | null;
  ladder: Rung[];
  sample: boolean;
};

export default function Home() {
  const [keyword, setKeyword] = useState("");
  const [item, setItem] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<RankResult | null>(null);

  const placeholderLadder: Rung[] = [
    { pos: 1, label: "", promoted: true, isYou: false },
    { pos: 2, label: "", promoted: false, isYou: false },
    { pos: 3, label: "", promoted: false, isYou: false },
    { pos: 4, label: "", promoted: false, isYou: false },
    { pos: 5, label: "", promoted: false, isYou: false },
    { pos: 6, label: "Your listing", promoted: false, isYou: true },
    { pos: 7, label: "", promoted: false, isYou: false },
    { pos: 8, label: "", promoted: false, isYou: false },
  ];

  async function checkRank(e: React.FormEvent) {
    e.preventDefault();
    if (!keyword.trim() || !item.trim()) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, item }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || "Could not check that ranking. Try again.");
      else setResult(data);
    } catch {
      setError("Could not reach the ranking service. Try again.");
    } finally {
      setLoading(false);
    }
  }

  const ladder = result?.ladder ?? placeholderLadder;
  const question = result
    ? `“${result.keyword}”`
    : keyword.trim()
    ? `“${keyword}”`
    : "your keyword";

  return (
    <div className="wrap">
      <PublicNav />

      <section className="hero" id="check">
        <div className="hero__left">
          <p className="eyebrow">eBay Best Match tracker</p>
          <h1>
            See exactly where your listing <em>lands</em> in eBay search.
          </h1>
          <p className="hero__sub">
            Type a keyword and your listing. perchRank finds your spot in eBay&apos;s
            Best Match results, the ranking real shoppers see, and watches it every day.
          </p>

          <form className="form" onSubmit={checkRank}>
            <div className="field">
              <label htmlFor="kw">Search keyword</label>
              <input id="kw" placeholder="e.g. vintage denim jacket" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="it">Your listing title or seller name</label>
              <input id="it" placeholder="e.g. Levi's 501 Vintage Trucker Jacket" value={item} onChange={(e) => setItem(e.target.value)} />
            </div>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Checking…" : "Check my rank"}
            </button>
            <p className="form__hint">Free check. No account needed.</p>
            {error && <p className="error">{error}</p>}
          </form>
        </div>

        <div className="hero__right">
          <div className="panel">
            <div className="panel__head">
              <span className="panel__title">BEST MATCH</span>
              <span className="panel__q">{question}</span>
            </div>
            <div className="ladder">
              {ladder.map((r) => (
                <div key={r.pos} className={`rung ${r.isYou ? "rung--you" : ""}`}>
                  <span className="rung__pos">#{r.pos}</span>
                  {r.isYou ? (
                    <span className="rung__label">{r.label || "Your listing"}</span>
                  ) : (
                    <span className="rung__bar" />
                  )}
                  {r.promoted ? <span className="rung__tag">Promoted</span> : <span />}
                </div>
              ))}
            </div>
            {result && result.found && (
              <p className="result__line">
                You rank <b>#{result.position}</b> of <b>{result.total.toLocaleString()}</b> for {question}.
              </p>
            )}
            {result && !result.found && (
              <p className="result__line">
                Your listing isn&apos;t in the top {result.total} for {question} yet. That&apos;s the gap to close.
              </p>
            )}
            {result?.sample && (
              <p className="sample-flag">sample data — connect your listing to see live rankings</p>
            )}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="how">
        <h2 className="section__title">How perchRank works</h2>
        <div className="how__steps">
          <div className="how__step">
            <span className="how__num">1</span>
            <h3>Add your keywords</h3>
            <p>Tell perchRank the searches your buyers actually type, and which listing is yours.</p>
          </div>
          <div className="how__step">
            <span className="how__num">2</span>
            <h3>We check daily</h3>
            <p>Every day, perchRank finds your exact position in eBay&apos;s Best Match results.</p>
          </div>
          <div className="how__step">
            <span className="how__num">3</span>
            <h3>Watch the trend</h3>
            <p>See your rank rise or fall over time on a clean chart, and get alerted on drops.</p>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features">
        <h2 className="section__title">Everything a serious seller needs</h2>
        <div className="feature-grid">
          <div className="feature">
            <div className="feature__viz">
              <svg viewBox="0 0 120 60" className="feature__chart">
                <polyline points="5,50 30,40 55,44 80,22 115,8" fill="none" stroke="#2f6b4f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="115" cy="8" r="4" fill="#e0a02e" />
              </svg>
            </div>
            <h3>Daily rank tracking</h3>
            <p>Watch your position move over time, know if that title change actually helped.</p>
          </div>
          <div className="feature">
            <div className="feature__viz">
              <svg viewBox="0 0 120 60" className="feature__bell">
                <path d="M60 14 C48 14 44 24 44 34 L40 44 L80 44 L76 34 C76 24 72 14 60 14 Z" fill="none" stroke="#2f6b4f" strokeWidth="3" strokeLinejoin="round"/>
                <path d="M54 48 C55 53 65 53 66 48" fill="none" stroke="#2f6b4f" strokeWidth="3" strokeLinecap="round"/>
                <circle cx="80" cy="20" r="9" fill="#d6503c" />
              </svg>
            </div>
            <h3>Drop alerts</h3>
            <p>Get flagged the moment a listing slips down the rankings, so you can act fast.</p>
          </div>
          <div className="feature">
            <div className="feature__viz">
              <svg viewBox="0 0 120 60" className="feature__rows">
                <rect x="20" y="8" width="80" height="11" rx="3" fill="#e0a02e" />
                <rect x="20" y="25" width="80" height="11" rx="3" fill="#cdd3ca" />
                <rect x="20" y="42" width="80" height="11" rx="3" fill="#cdd3ca" />
              </svg>
            </div>
            <h3>Promoted vs organic</h3>
            <p>See which competitors paid to sit above you and which you can outrank for free.</p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="signup-cta">
        <p className="signup-cta__text">
          Stop guessing where you rank. Start tracking it — free.
        </p>
        <a className="btn" href="/login">Create a free account</a>
      </section>

      <Footer />
    </div>
  );
}