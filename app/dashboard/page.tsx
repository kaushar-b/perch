"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "../AuthProvider";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

type Tracked = { id: string; keyword: string; listing: string; lastPosition?: number | null };
type HistPoint = { date: string; position: number | null };
type Plan = "free" | "seller" | "pro";
type Alert = { keyword: string; from: number; to: number };

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Tracked[]>([]);
  const [keyword, setKeyword] = useState("");
  const [listing, setListing] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, HistPoint[]>>({});
  const [histLoading, setHistLoading] = useState(false);
  const [plan, setPlan] = useState<Plan>("free");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [checkState, setCheckState] = useState<{ loading: boolean; text: string }>({ loading: false, text: "" });
  const [showAlerts, setShowAlerts] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const LIMITS: Record<Plan, number> = { free: 3, seller: 25, pro: Infinity };
  const limit = LIMITS[plan];
  const atLimit = items.length >= limit;
  const alertsEnabled = plan !== "free"; // drop alerts only for Seller/Pro

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  // Load tracked items
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, "tracked"), where("uid", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({
        id: d.id,
        keyword: d.data().keyword,
        listing: d.data().listing,
        lastPosition: d.data().lastPosition ?? null,
      }));
      setItems(list);
      setSelectedId((cur) => cur ?? (list[0]?.id ?? null));
    });
    return () => unsub();
  }, [user]);

  // Load / listen plan
  useEffect(() => {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    getDoc(ref).then((snap) => {
      if (!snap.exists()) setDoc(ref, { email: (user.email || "").toLowerCase(), plan: "free" }, { merge: true });
      else if (!snap.data().email) setDoc(ref, { email: (user.email || "").toLowerCase() }, { merge: true });
    });
    const unsub = onSnapshot(ref, (snap) => {
      const p = snap.data()?.plan as Plan | undefined;
      if (p) setPlan(p);
    });
    return () => unsub();
  }, [user]);

  // Load history for the selected item
  useEffect(() => {
    if (!selectedId || history[selectedId]) return;
    setHistLoading(true);
    getDocs(query(collection(db, "tracked", selectedId, "history"), orderBy("date", "asc")))
      .then((snap) => {
        const points: HistPoint[] = snap.docs.map((d) => ({
          date: d.data().date,
          position: d.data().position ?? null,
        }));
        setHistory((h) => ({ ...h, [selectedId]: points }));
      })
      .catch(() => setHistory((h) => ({ ...h, [selectedId]: [] })))
      .finally(() => setHistLoading(false));
  }, [selectedId, history]);

  // Build rank-drop alerts from each item's last two history points (Seller/Pro only)
  useEffect(() => {
    if (!alertsEnabled || items.length === 0) { setAlerts([]); return; }
    (async () => {
      const found: Alert[] = [];
      for (const it of items) {
        try {
          const snap = await getDocs(query(collection(db, "tracked", it.id, "history"), orderBy("date", "desc")));
          const pts = snap.docs.map((d) => d.data().position as number | null).filter((p) => p != null) as number[];
          if (pts.length >= 2 && pts[0] > pts[1]) {
            found.push({ keyword: it.keyword, from: pts[1], to: pts[0] });
          }
        } catch { /* ignore */ }
      }
      setAlerts(found);
    })();
  }, [items, alertsEnabled]);

  async function addTracked(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !keyword.trim() || !listing.trim() || atLimit) return;
    await addDoc(collection(db, "tracked"), {
      uid: user.uid, keyword: keyword.trim(), listing: listing.trim(), createdAt: serverTimestamp(),
    });
    setKeyword(""); setListing("");
  }

  async function remove(id: string) {
    await deleteDoc(doc(db, "tracked", id));
    setConfirmId(null);
    if (selectedId === id) setSelectedId(items.find((i) => i.id !== id)?.id ?? null);
  }

  async function checkNow(t: Tracked) {
    setCheckState({ loading: true, text: "" });
    try {
      const res = await fetch("/api/rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: t.keyword, item: t.listing }),
      });
      const data = await res.json();
      if (!res.ok) setCheckState({ loading: false, text: data.error || "Check failed" });
      else if (data.found) setCheckState({ loading: false, text: `Currently #${data.position} of ${data.total.toLocaleString()}` });
      else setCheckState({ loading: false, text: `Not in the top 100 of ${data.total.toLocaleString()}` });
    } catch {
      setCheckState({ loading: false, text: "Could not check right now" });
    }
  }

  const selected = useMemo(() => items.find((i) => i.id === selectedId) || null, [items, selectedId]);
  const points = selectedId ? history[selectedId] ?? [] : [];
  const chartData = points.map((p) => ({ date: p.date.slice(5), rank: p.position }));
  const ranked = points.filter((p) => p.position != null);
  const latest = ranked.length ? ranked[ranked.length - 1].position : null;
  const first = ranked.length ? ranked[0].position : null;
  const trend = latest != null && first != null ? first - latest : null;

  if (loading || !user) {
    return <div className="wrap"><p style={{ padding: "60px 0", color: "var(--muted)" }}>Loading…</p></div>;
  }

  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <div className="wrap">
      <nav className="nav">
        <a href="/" className="brand">
          <span className="brand__mark">perch<span className="brand__mark-rank">Rank</span><span className="brand__mark-dot">.</span></span>
        </a>
        <div className="nav__links">
          {/* Notifications bell */}
          <div className="bell" tabIndex={0}>
            <button className="bell__btn" onClick={() => setShowAlerts((s) => !s)} aria-label="Rank alerts">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M12 3a6 6 0 0 0-6 6c0 4-1.5 5.5-2 6.2-.2.3 0 .8.4.8h15.2c.4 0 .6-.5.4-.8-.5-.7-2-2.2-2-6.2a6 6 0 0 0-6-6Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/>
                <path d="M9.5 19a2.5 2.5 0 0 0 5 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/>
              </svg>
              {alertsEnabled && alerts.length > 0 && <span className="bell__dot">{alerts.length}</span>}
            </button>
            {showAlerts && (
              <div className="bell__panel">
                <div className="bell__head">Rank alerts</div>
                {!alertsEnabled ? (
                  <div className="bell__empty">
                    Drop alerts are a Seller & Pro feature. <a href="/pricing">Upgrade →</a>
                  </div>
                ) : alerts.length === 0 ? (
                  <div className="bell__empty">No drops detected. You&apos;re holding your rankings. 🟢</div>
                ) : (
                  alerts.map((a, i) => (
                    <div key={i} className="bell__item">
                      <span className="bell__ic">▼</span>
                      <span><b>{a.keyword}</b> dropped from #{a.from} to #{a.to}</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <button className="nav__cta" onClick={() => signOut(auth)}>Sign out</button>
        </div>
      </nav>

      <div className="dashhead">
        <h1 className="dash__title">Dashboard</h1>
        <p className="dash__sub">{user.email} · <span className="planpill">{planLabel}</span></p>
      </div>

      {/* Add keyword */}
      <form className="dash__form" onSubmit={addTracked}>
        <input placeholder="Keyword (e.g. vintage denim jacket)" value={keyword} onChange={(e) => setKeyword(e.target.value)} />
        <input placeholder="Your listing title or seller name" value={listing} onChange={(e) => setListing(e.target.value)} />
        <button className="btn" type="submit" disabled={atLimit}>Track it</button>
      </form>
      <p className="dash__usage">
        {limit === Infinity ? `${items.length} keywords tracked · Pro (unlimited)` : `${items.length} of ${limit} keywords used · ${planLabel} plan`}
        {atLimit && limit !== Infinity && <> — <a href="/pricing" className="dash__upgrade">Upgrade for more</a></>}
      </p>

      {items.length === 0 ? (
        <p className="dash__empty">Nothing tracked yet. Add a keyword above to start watching your rank.</p>
      ) : (
        <div className="dashgrid">
          {/* LEFT: keyword list */}
          <aside className="kwlist">
            {items.map((t) => (
              <button
                key={t.id}
                className={`kwitem ${selectedId === t.id ? "kwitem--active" : ""}`}
                onClick={() => { setSelectedId(t.id); setCheckState({ loading: false, text: "" }); }}
              >
                <span className="kwitem__kw">{t.keyword}</span>
                <span className="kwitem__listing">{t.listing}</span>
                {t.lastPosition != null && <span className="kwitem__rank">#{t.lastPosition}</span>}
              </button>
            ))}
          </aside>

          {/* RIGHT: big rank panel */}
          <section className="rankpanel">
            {!selected ? (
              <p className="chartbox__msg">Select a keyword to see its rank.</p>
            ) : (
              <>
                <div className="rankpanel__top">
                  <div>
                    <div className="rankpanel__kw">{selected.keyword}</div>
                    <div className="rankpanel__listing">{selected.listing}</div>
                  </div>
                  <div className="rankpanel__actions">
                    <button className="track__check" onClick={() => checkNow(selected)} disabled={checkState.loading}>
                      {checkState.loading ? "Checking…" : "Check now"}
                    </button>
                    {confirmId === selected.id ? (
                      <span className="confirm">
                        <span className="confirm__text">Remove?</span>
                        <button className="confirm__yes" onClick={() => remove(selected.id)}>Yes</button>
                        <button className="confirm__no" onClick={() => setConfirmId(null)}>Cancel</button>
                      </span>
                    ) : (
                      <button className="track__del" onClick={() => setConfirmId(selected.id)}>Remove</button>
                    )}
                  </div>
                </div>

                {checkState.text && <p className="rankpanel__live">{checkState.text}</p>}

                <div className="rankpanel__statrow">
                  <div className="stat">
                    <span className="stat__label">Latest tracked rank</span>
                    <span className="stat__big">{latest != null ? `#${latest}` : "—"}</span>
                  </div>
                  {trend != null && trend !== 0 && (
                    <div className={`stat__trend ${trend > 0 ? "up" : "down"}`}>
                      {trend > 0 ? `▲ up ${trend}` : `▼ down ${Math.abs(trend)}`}
                      <span className="stat__trendsub"> since {chartData[0]?.date}</span>
                    </div>
                  )}
                </div>

                <div className="rankpanel__chart">
                  {histLoading ? (
                    <p className="chartbox__msg">Loading history…</p>
                  ) : chartData.length === 0 ? (
                    <p className="chartbox__msg">No history yet. Ranks are recorded daily — the line starts filling in tomorrow.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={240}>
                      <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e3e6df" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5e6b64" }} />
                        <YAxis reversed allowDecimals={false} tick={{ fontSize: 11, fill: "#5e6b64" }} width={40} />
                        <Tooltip formatter={(v) => (v == null ? ["Not in top 100", "Rank"] : [`#${v}`, "Rank"])} />
                        <Line type="monotone" dataKey="rank" stroke="#2f6b4f" strokeWidth={2.5} dot={{ r: 3, fill: "#2f6b4f" }} connectNulls />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                  <p className="chartbox__note">Higher on the chart = better rank (closer to #1).</p>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
}