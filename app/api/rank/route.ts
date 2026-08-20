import { NextRequest, NextResponse } from "next/server";
import { getEbayToken } from "@/lib/ebay";

type Rung = { pos: number; label: string; promoted: boolean; isYou: boolean };

type EbayItem = {
  title?: string;
  seller?: { username?: string };
  listingMarketplaceId?: string;
};

export async function POST(req: NextRequest) {
  const { keyword, item } = await req.json();
  if (!keyword?.trim() || !item?.trim()) {
    return NextResponse.json(
      { error: "Enter both a keyword and your listing." },
      { status: 400 }
    );
  }

  try {
    const token = await getEbayToken();

    // Search eBay Best Match for this keyword, up to 100 results.
    const url =
      "https://api.ebay.com/buy/browse/v1/item_summary/search" +
      `?q=${encodeURIComponent(keyword)}&limit=100`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        // Marketplace: change EBAY_US to your target (e.g. EBAY_GB) later if needed.
        "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `eBay search failed (${res.status}).`, detail: text.slice(0, 200) },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      total?: number;
      itemSummaries?: EbayItem[];
    };
    const items = data.itemSummaries ?? [];
    const total = data.total ?? items.length;

    // Find the seller's listing: match on title OR seller username (case-insensitive).
    const needle = item.trim().toLowerCase();
    const idx = items.findIndex((it) => {
      const title = (it.title ?? "").toLowerCase();
      const seller = (it.seller?.username ?? "").toLowerCase();
      return title.includes(needle) || seller.includes(needle);
    });

    const found = idx !== -1;
    const position = found ? idx + 1 : null;

    // Build a ladder of ~9 rows around the found position (or the top 9 if not found).
    const ladder: Rung[] = [];
    const start = found ? Math.max(0, idx - 4) : 0;
    const end = Math.min(items.length, start + 9);
    for (let i = start; i < end; i++) {
      const it = items[i];
      ladder.push({
        pos: i + 1,
        label: i === idx ? item : (it.title ?? "").slice(0, 60),
        // Browse API flags promoted listings via listingMarketplaceId in some cases;
        // we approximate here and refine once we see live data shapes.
        promoted: false,
        isYou: i === idx,
      });
    }

    return NextResponse.json({
      found,
      position,
      total,
      keyword,
      delta: null, // no history yet — comes when we add daily tracking
      ladder,
      sample: false,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: "Could not reach eBay. Check your API keys.", detail: message },
      { status: 500 }
    );
  }
}