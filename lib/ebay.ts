// lib/ebay.ts
// Gets an eBay "application access token" using the client-credentials flow.
// This token lets us call the public Browse API (search). Tokens last ~2 hours,
// so we cache it in memory and only re-fetch when it's about to expire.

let cachedToken: { value: string; expiresAt: number } | null = null;

export async function getEbayToken(): Promise<string> {
  // Reuse the cached token if it's still valid (60s safety buffer).
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.value;
  }

  const appId = process.env.EBAY_APP_ID;
  const certId = process.env.EBAY_CERT_ID;
  if (!appId || !certId) {
    throw new Error("Missing EBAY_APP_ID or EBAY_CERT_ID environment variables.");
  }

  // eBay wants the credentials Base64-encoded as "appId:certId".
  const basic = Buffer.from(`${appId}:${certId}`).toString("base64");

  const res = await fetch("https://api.ebay.com/identity/v1/oauth2/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${basic}`,
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      scope: "https://api.ebay.com/oauth/api_scope",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay token request failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return cachedToken.value;
}