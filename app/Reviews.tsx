"use client";

import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Review = { name: string; text: string; rating: number; ts: number };

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const [perPage, setPerPage] = useState(3);

  // responsive: 3 per slide on desktop, 1 on mobile
  useEffect(() => {
    const set = () => setPerPage(window.innerWidth <= 760 ? 1 : 3);
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

  // load approved reviews (no orderBy -> no composite index needed; we sort in code)
  useEffect(() => {
    getDocs(query(collection(db, "reviews"), where("approved", "==", true)))
      .then((snap) => {
        const list = snap.docs.map((d) => ({
          name: d.data().name,
          text: d.data().text,
          rating: d.data().rating ?? 5,
          ts: d.data().createdAt?.seconds ?? 0,
        }));
        list.sort((a, b) => b.ts - a.ts);
        setReviews(list);
      })
      .catch(() => setReviews([]));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !text.trim()) return;
    setBusy(true);
    try {
      await addDoc(collection(db, "reviews"), {
        name: name.trim(), text: text.trim(), rating,
        approved: false,
        createdAt: serverTimestamp(),
      });
      setSent(true); setName(""); setText(""); setRating(5);
    } catch { /* ignore */ } finally { setBusy(false); }
  }

  const Stars = ({ n }: { n: number }) => (
    <span className="stars">{"★".repeat(n)}{"☆".repeat(5 - n)}</span>
  );

  const totalPages = Math.max(1, Math.ceil(reviews.length / perPage));
  const safePage = Math.min(page, totalPages - 1);
  const visible = reviews.slice(safePage * perPage, safePage * perPage + perPage);

  return (
    <section className="reviews">
      <h2 className="section__title">What sellers say</h2>

      {reviews.length > 0 && (
        <div className="rvslider">
          {reviews.length > perPage && (
            <button className="rvslider__arrow prev" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={safePage === 0} aria-label="Previous">‹</button>
          )}
          <div className="rvslider__row">
            {visible.map((r, i) => (
              <div key={i} className="review">
                <Stars n={r.rating} />
                <p className="review__text">“{r.text}”</p>
                <p className="review__name">— {r.name}</p>
              </div>
            ))}
          </div>
          {reviews.length > perPage && (
            <button className="rvslider__arrow next" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={safePage >= totalPages - 1} aria-label="Next">›</button>
          )}
        </div>
      )}

      {reviews.length > perPage && (
        <div className="rvslider__dots">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button key={i} className={`rvdot ${i === safePage ? "on" : ""}`} onClick={() => setPage(i)} aria-label={`Slide ${i + 1}`} />
          ))}
        </div>
      )}

      <div className="review-form-wrap">
        <h3 className="review-form__title">Tried perchRank? Leave a review</h3>
        {sent ? (
          <p className="review__thanks">Thanks — your review will appear once approved.</p>
        ) : (
          <form className="review-form" onSubmit={submit}>
            <input placeholder="Your name (or eBay store)" value={name} onChange={(e) => setName(e.target.value)} />
            <div className="rating-pick">
              {[1, 2, 3, 4, 5].map((n) => (
                <button type="button" key={n} className={`star-btn ${n <= rating ? "on" : ""}`} onClick={() => setRating(n)}>★</button>
              ))}
            </div>
            <textarea placeholder="How has perchRank helped your eBay sales?" value={text} onChange={(e) => setText(e.target.value)} rows={3} />
            <button className="btn" type="submit" disabled={busy}>{busy ? "Sending…" : "Submit review"}</button>
          </form>
        )}
      </div>
    </section>
  );
}