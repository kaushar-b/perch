"use client";

import { useEffect, useState } from "react";
import { collection, addDoc, getDocs, query, where, orderBy, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

type Review = { name: string; text: string; rating: number };

export default function Reviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [name, setName] = useState("");
  const [text, setText] = useState("");
  const [rating, setRating] = useState(5);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getDocs(query(collection(db, "reviews"), where("approved", "==", true), orderBy("createdAt", "desc")))
      .then((snap) => setReviews(snap.docs.map((d) => ({
        name: d.data().name, text: d.data().text, rating: d.data().rating ?? 5,
      }))))
      .catch(() => setReviews([]));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !text.trim()) return;
    setBusy(true);
    try {
      await addDoc(collection(db, "reviews"), {
        name: name.trim(), text: text.trim(), rating,
        approved: false, // you flip this to true in Firebase to publish it
        createdAt: serverTimestamp(),
      });
      setSent(true); setName(""); setText(""); setRating(5);
    } catch { /* ignore */ } finally { setBusy(false); }
  }

  const Stars = ({ n }: { n: number }) => (
    <span className="stars">{"★".repeat(n)}{"☆".repeat(5 - n)}</span>
  );

  return (
    <section className="reviews">
      <h2 className="section__title">What sellers say</h2>

      {reviews.length > 0 && (
        <div className="review-grid">
          {reviews.map((r, i) => (
            <div key={i} className="review">
              <Stars n={r.rating} />
              <p className="review__text">“{r.text}”</p>
              <p className="review__name">— {r.name}</p>
            </div>
          ))}
        </div>
      )}

      <div className="review-form-wrap">
        <h3 className="review-form__title">Tried perchRank? Leave a review</h3>
        {sent ? (
          <p className="review__thanks">Thanks! Your review will appear once approved. 🙏</p>
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