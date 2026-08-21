import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getEbayToken } from "@/lib/ebay";

export const maxDuration = 60;

type EbayItem = { title?: string; seller?: { username?: string } };

// Same smart matcher as the live checker, server-side.
function findPosition(items: EbayItem[], listing: string): { position: number | null; found: boolean } {
  const stop = new Set(["the","a","an","for","and","or","of","with","in","on","to","mens","womens","size","new","used","vintage","genuine","original","authentic","brand"]);
  const terms = listing.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((w) => w.length >= 3 && !stop.has(w));
  const threshold = Math.max(2, Math.ceil(terms.length * 0.4));
  let idx = -1, best = 0;
  items.forEach((it, i) => {
    const t = (it.title ?? "").toLowerCase();
    let s = 0;
    for (const term of terms) if (t.includes(term)) s += /\d/.test(term) ? 2 : 1;
    if (s > best) { best = s; idx = i; }
  });
  if (best < threshold) idx = -1;
  return { position: idx === -1 ? null : idx + 1, found: idx !== -1 };
}

export async function GET(req: NextRequest) {
  // Security: only allow calls that carry the secret.
  const secret = req.nextUrl.searchParams.get("secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const token = await getEbayToken();
    const snap = await adminDb.collection("tracked").get();
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    let checked = 0;

    for (const docSnap of snap.docs) {
      const { keyword, listing } = docSnap.data() as { keyword: string; listing: string };
      if (!keyword || !listing) continue;

      try {
        const url =
          "https://api.ebay.com/buy/browse/v1/item_summary/search" +
          `?q=${encodeURIComponent(keyword)}&limit=100`;
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${token}`,
            "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
          },
        });
        if (!res.ok) continue;
        const data = (await res.json()) as { total?: number; itemSummaries?: EbayItem[] };
        const items = data.itemSummaries ?? [];
        const { position } = findPosition(items, listing);

        // Save today's rank into a history sub-collection under this tracked item.
        await docSnap.ref.collection("history").doc(today).set({
          date: today,
          position: position, // null if not in top 100
          total: data.total ?? items.length,
          checkedAt: new Date().toISOString(),
        });
        // Also store the latest snapshot on the main doc for quick display.
        await docSnap.ref.set(
          { lastPosition: position, lastTotal: data.total ?? items.length, lastChecked: today },
          { merge: true }
        );
        checked++;
      } catch {
        continue; // one bad keyword shouldn't stop the whole run
      }
    }

    return NextResponse.json({ ok: true, checked, date: today });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}