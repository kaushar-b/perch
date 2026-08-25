import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb } from "@/lib/firebaseAdmin";

// Maps your Lemon Squeezy product/variant names to Perch plans.
// We match on the product name containing "pro" or "seller".
function planFromName(name: string): "seller" | "pro" | null {
  const n = (name || "").toLowerCase();
  if (n.includes("pro")) return "pro";
  if (n.includes("seller")) return "seller";
  return null;
}

export async function POST(req: NextRequest) {
  const raw = await req.text();

  // 1. Verify the request really came from Lemon Squeezy (signature check).
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || "";
  const signature = req.headers.get("x-signature") || "";
  const hmac = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  if (
    !signature ||
    !crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature))
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(raw);
  const eventName = event?.meta?.event_name as string;
  const attrs = event?.data?.attributes ?? {};
  const email = (attrs.user_email || "").toLowerCase();
  const productName = attrs.product_name || attrs.first_order_item?.product_name || "";
  const status = attrs.status; // "active", "cancelled", "expired", etc.

  if (!email) {
    return NextResponse.json({ ok: true, note: "no email" });
  }

  // 2. Find the Perch user with this email.
  const usersSnap = await adminDb
    .collection("users")
    .where("email", "==", email)
    .limit(1)
    .get();

  if (usersSnap.empty) {
    // Paid but no matching account yet — store it so we can reconcile.
    await adminDb.collection("pending_upgrades").doc(email).set({
      email,
      productName,
      eventName,
      at: new Date().toISOString(),
    });
    return NextResponse.json({ ok: true, note: "queued, no account" });
  }

  const userRef = usersSnap.docs[0].ref;

  // 3. Decide the plan based on the event.
  if (
    eventName === "subscription_created" ||
    eventName === "subscription_updated" ||
    eventName === "order_created"
  ) {
    if (status === "active" || eventName === "order_created") {
      const plan = planFromName(productName);
      if (plan) await userRef.set({ plan }, { merge: true });
    }
    if (status === "cancelled" || status === "expired") {
      await userRef.set({ plan: "free" }, { merge: true });
    }
  }

  if (eventName === "subscription_cancelled" || eventName === "subscription_expired") {
    await userRef.set({ plan: "free" }, { merge: true });
  }

  return NextResponse.json({ ok: true });
}