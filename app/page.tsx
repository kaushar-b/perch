"use client";

import { useState } from "react";

type Rung = {
  pos: number;
  label: string;
  promoted: boolean;
  isYou: boolean;
};
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
      if (!res.ok) {
        setError(data.error || "Could not check that ranking. Try again.");
      } else {
        setResult(data);
      }
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
      <nav className="nav">
        <div className="brand">
          <span className="brand__mark">
            Perch<span>.</span>
          </span>
          <span className="brand__tag">Your spot in eBay search</span>
        </div>
        <div className="nav__links">
          <a className="nav__login" href="/login">Log in</a>
          <a className="nav__cta" href="/login">Sign up free</a>
        </div>
      </nav>

      <section className="hero" id="check">
        <div className="hero__left">
          <p className="eyebrow">eBay Best Match tracker</p>
          <h1>
            See exactly where your listing <em>lands</em> in eBay search.
          </h1>
          <p className="hero__sub">
            Type a keyword and your listing. Perch finds your spot in eBay&apos;s
            Best Match results — the ranking real shoppers see — and can watch it
            every day.
          </p>

          <form className="form" onSubmit={checkRank}>
            <div className="field">
              <label htmlFor="kw">Search keyword</label>
              <input
                id="kw"
                placeholder="e.g. vintage denim jacket"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="it">Your listing title or seller name</label>
              <input
                id="it"
                placeholder="e.g. Levi's 501 Vintage Trucker Jacket"
                value={item}
                onChange={(e) => setItem(e.target.value)}
              />
            </div>
            <button className="btn" type="submit" disabled={loading}>
              {loading ? "Checking…" : "Check my rank"}
            </button>
            <p className="form__hint">
              Free check. No account needed.
            </p>
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
                <div
                  key={r.pos}
                  className={`rung ${r.isYou ? "rung--you" : ""}`}
                >
                  <span className="rung__pos">#{r.pos}</span>
                  {r.isYou ? (
                    <span className="rung__label">
                      {r.label || "Your listing"}
                    </span>
                  ) : (
                    <span className="rung__bar" />
                  )}
                  {r.promoted ? (
                    <span className="rung__tag">Promoted</span>
                  ) : r.isYou && result?.delta != null ? (
                    <span
                      className={`delta ${
                        result.delta > 0
                          ? "delta--up"
                          : result.delta < 0
                          ? "delta--down"
                          : "delta--flat"
                      }`}
                    >
                      {result.delta > 0
                        ? `▲ ${result.delta}`
                        : result.delta < 0
                        ? `▼ ${Math.abs(result.delta)}`
                        : "—"}
                    </span>
                  ) : (
                    <span />
                  )}
                </div>
              ))}
            </div>

            {result && result.found && (
              <p className="result__line">
                You rank <b>#{result.position}</b> of{" "}
                <b>{result.total.toLocaleString()}</b> listings for{" "}
                {question}.
              </p>
            )}
            {result && !result.found && (
              <p className="result__line">
                Your listing isn&apos;t in the top {result.total} for {question}{" "}
                yet. That&apos;s the gap to close.
              </p>
            )}
            {result?.sample && (
              <p className="sample-flag">
                sample data — live eBay rankings connect once your API key is active
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="signup-cta">
        <p className="signup-cta__text">
          Want Perch to track this automatically and show your rank trend over time?
        </p>
        <a className="btn" href="/login">Create a free account</a>
      </section>

      <section className="strip">
        <div className="strip__row">
          <p className="strip__item">
            <b>Daily tracking.</b> Watch your rank move over time.
          </p>
          <p className="strip__item">
            <b>Drop alerts.</b> Know the moment you slip off page one.
          </p>
          <p className="strip__item">
            <b>Promoted vs organic.</b> See who paid to sit above you.
          </p>
        </div>
      </section>
    </div>
  );
}