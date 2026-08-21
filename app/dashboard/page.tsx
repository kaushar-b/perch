"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "../AuthProvider";

type Tracked = { id: string; keyword: string; listing: string };
type CheckState = {
  loading: boolean;
  position: number | null;
  total: number | null;
  found: boolean | null;
  error: string;
};

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Tracked[]>([]);
  const [keyword, setKeyword] = useState("");
  const [listing, setListing] = useState("");
  const [checks, setChecks] = useState<Record<string, CheckState>>({});

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "tracked"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      setItems(
        snap.docs.map((d) => ({
          id: d.id,
          keyword: d.data().keyword,
          listing: d.data().listing,
        }))
      );
    });
    return () => unsub();
  }, [user]);

  async function addTracked(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !keyword.trim() || !listing.trim()) return;
    await addDoc(collection(db, "tracked"), {
      uid: user.uid,
      keyword: keyword.trim(),
      listing: listing.trim(),
      createdAt: serverTimestamp(),
    });
    setKeyword("");
    setListing("");
  }

  async function remove(id: string) {
    await deleteDoc(doc(db, "tracked", id));
    setChecks((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });
  }

  async function checkNow(t: Tracked) {
    setChecks((c) => ({
      ...c,
      [t.id]: { loading: true, position: null, total: null, found: null, error: "" },
    }));
    try {
      const res = await fetch("/api/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: t.keyword, item: t.listing }),
      });
      const data = await res.json();
      if (!res.ok) {
        setChecks((c) => ({
          ...c,
          [t.id]: { loading: false, position: null, total: null, found: null, error: data.error || "Check failed" },
        }));
      } else {
        setChecks((c) => ({
          ...c,
          [t.id]: {
            loading: false,
            position: data.position,
            total: data.total,
            found: data.found,
            error: "",
          },
        }));
      }
    } catch {
      setChecks((c) => ({
        ...c,
        [t.id]: { loading: false, position: null, total: null, found: null, error: "Could not check" },
      }));
    }
  }

  if (loading || !user) {
    return (
      <div className="wrap">
        <p style={{ padding: "60px 0", color: "var(--muted)" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="wrap">
      <nav className="nav">
        <a href="/" className="brand">
          <span className="brand__mark">Perch<span>.</span></span>
        </a>
        <button className="nav__cta" onClick={() => signOut(auth)}>
          Sign out
        </button>
      </nav>

      <div className="dash">
        <h1 className="dash__title">Your tracked keywords</h1>
        <p className="dash__sub">{user.email}</p>

        <form className="dash__form" onSubmit={addTracked}>
          <input
            placeholder="Keyword (e.g. vintage denim jacket)"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <input
            placeholder="Your listing title or seller name"
            value={listing}
            onChange={(e) => setListing(e.target.value)}
          />
          <button className="btn" type="submit">Track it</button>
        </form>

        {items.length === 0 ? (
          <p className="dash__empty">
            Nothing tracked yet. Add a keyword above to start watching your rank.
          </p>
        ) : (
          <div className="tracklist">
            {items.map((t) => {
              const c = checks[t.id];
              return (
                <div key={t.id} className="track">
                  <div className="track__main">
                    <div className="track__kw">{t.keyword}</div>
                    <div className="track__listing">{t.listing}</div>
                    {c && !c.loading && c.found && (
                      <div className="track__rank">
                        Ranks <b>#{c.position}</b> of {c.total?.toLocaleString()}
                      </div>
                    )}
                    {c && !c.loading && c.found === false && (
                      <div className="track__rank track__rank--miss">
                        Not in the top 100 of {c.total?.toLocaleString()}
                      </div>
                    )}
                    {c && c.error && (
                      <div className="track__rank track__rank--miss">{c.error}</div>
                    )}
                  </div>
                  <div className="track__actions">
                    <button
                      className="track__check"
                      onClick={() => checkNow(t)}
                      disabled={c?.loading}
                    >
                      {c?.loading ? "Checking…" : "Check now"}
                    </button>
                    <button className="track__del" onClick={() => remove(t.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}