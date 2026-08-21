"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Tracked = { id: string; keyword: string; listing: string };
type HistPoint = { date: string; position: number | null };

export default function Dashboard() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Tracked[]>([]);
  const [keyword, setKeyword] = useState("");
  const [listing, setListing] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, HistPoint[]>>({});
  const [histLoading, setHistLoading] = useState(false);

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
    if (openId === id) setOpenId(null);
  }

  async function toggleChart(id: string) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    if (!history[id]) {
      setHistLoading(true);
      try {
        const snap = await getDocs(
          query(collection(db, "tracked", id, "history"), orderBy("date", "asc"))
        );
        const points: HistPoint[] = snap.docs.map((d) => ({
          date: d.data().date,
          position: d.data().position ?? null,
        }));
        setHistory((h) => ({ ...h, [id]: points }));
      } catch {
        setHistory((h) => ({ ...h, [id]: [] }));
      } finally {
        setHistLoading(false);
      }
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
              const isOpen = openId === t.id;
              const points = history[t.id] ?? [];
              // Turn history into chart data. Rank is "inverted" (lower = better),
              // so we plot the raw position but flip the Y axis so up = better.
              const chartData = points.map((p) => ({
                date: p.date.slice(5), // MM-DD
                rank: p.position, // null if not in top 100
              }));
              const ranked = points.filter((p) => p.position != null);
              const latest = ranked.length ? ranked[ranked.length - 1].position : null;
              const first = ranked.length ? ranked[0].position : null;
              const trend =
                latest != null && first != null
                  ? first - latest // positive = improved (moved toward #1)
                  : null;

              return (
                <div key={t.id} className="track track--col">
                  <div className="track__row">
                    <div className="track__main">
                      <div className="track__kw">{t.keyword}</div>
                      <div className="track__listing">{t.listing}</div>
                    </div>
                    <div className="track__actions">
                      <button className="track__check" onClick={() => toggleChart(t.id)}>
                        {isOpen ? "Hide chart" : "Show chart"}
                      </button>
                      <button className="track__del" onClick={() => remove(t.id)}>
                        Remove
                      </button>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="chartbox">
                      {histLoading && !history[t.id] ? (
                        <p className="chartbox__msg">Loading history…</p>
                      ) : chartData.length === 0 ? (
                        <p className="chartbox__msg">
                          No history yet. Ranks are recorded once a day — check back
                          tomorrow to see the line start.
                        </p>
                      ) : (
                        <>
                          <div className="chartbox__head">
                            <div>
                              <span className="chartbox__label">Current rank</span>
                              <span className="chartbox__big">
                                {latest != null ? `#${latest}` : "—"}
                              </span>
                            </div>
                            {trend != null && trend !== 0 && (
                              <span
                                className={`chartbox__trend ${
                                  trend > 0 ? "up" : "down"
                                }`}
                              >
                                {trend > 0
                                  ? `▲ up ${trend} since ${chartData[0].date}`
                                  : `▼ down ${Math.abs(trend)} since ${chartData[0].date}`}
                              </span>
                            )}
                          </div>
                          <ResponsiveContainer width="100%" height={180}>
                            <LineChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -10 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e3e6df" />
                              <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#5e6b64" }} />
                              <YAxis
                                reversed
                                allowDecimals={false}
                                tick={{ fontSize: 11, fill: "#5e6b64" }}
                                width={40}
                              />
                              <Tooltip
                                formatter={(v) =>
                                  v == null ? ["Not in top 100", "Rank"] : [`#${v}`, "Rank"]
                                }
                              />
                              <Line
                                type="monotone"
                                dataKey="rank"
                                stroke="#2f6b4f"
                                strokeWidth={2.5}
                                dot={{ r: 3, fill: "#2f6b4f" }}
                                connectNulls
                              />
                            </LineChart>
                          </ResponsiveContainer>
                          <p className="chartbox__note">
                            Higher on the chart = better rank (closer to #1).
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}