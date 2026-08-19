import { NextRequest, NextResponse } from "next/server";

// ───────────────────────────────────────────────────────────────
// SAMPLE MODE. Returns realistic data shaped like eBay's Browse API
// so the whole UI works today. When your eBay key is approved, we
// replace the marked block with the real Browse API call — the shape
// the UI consumes stays identical, so nothing else changes.
// ───────────────────────────────────────────────────────────────

type Rung = { pos: number; label: string; promoted: boolean; isYou: boolean };

function seededPosition(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return (h % 22) + 3; // your position lands between #3 and #24
}

export async function POST(req: NextRequest) {
  const { keyword, item } = await req.json();
  if (!keyword?.trim() || !item?.trim()) {
    return NextResponse.json(
      { error: "Enter both a keyword and your listing." },
      { status: 400 }
    );
  }

  // ── SAMPLE BLOCK (replace with real eBay Browse API call later) ──
  //
  // Real version (roughly):
  //   const token = await getEbayAppToken(); // client-credentials grant
  //   const url = `https://api.ebay.com/buy/browse/v1/item_summary/search?q=${encodeURIComponent(keyword)}&limit=100`;
  //   const r = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  //   const data = await r.json();
  //   const idx = data.itemSummaries.findIndex(i =>
  //       i.title.toLowerCase().includes(item.toLowerCase()));
  //   position = idx === -1 ? null : idx + 1;
  //   total = data.total;
  //   ...build ladder from surrounding items, using i.listingMarketplaceId /
  //      i.priorityListing to flag Promoted...
  //
  const position = seededPosition(keyword + "|" + item);
  const total = 200 + (seededPosition(keyword) * 37);
  const delta = ((position * 7) % 5) - 2; // -2..+2, fake week-over-week move

  const ladder: Rung[] = [];
  const start = Math.max(1, position - 4);
  for (let p = start; p <= start + 8; p++) {
    ladder.push({
      pos: p,
      label: p === position ? item : "",
      promoted: p <= 2 || p % 6 === 0, // a couple of promoted slots
      isYou: p === position,
    });
  }
  // ── END SAMPLE BLOCK ──

  return NextResponse.json({
    found: true,
    position,
    total,
    keyword,
    delta,
    ladder,
    sample: true,
  });
}