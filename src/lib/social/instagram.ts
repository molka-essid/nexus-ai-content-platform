import "server-only";
import { env } from "@/lib/env";
import { getSocialAppConfig } from "@/lib/data/social-app-config";

// Instagram now has its own direct-login flow ("Business Login for
// Instagram") — separate from Facebook Login entirely. Different domains
// per step, no Facebook Page involved. IMPORTANT: despite living in the
// same Meta app as Facebook Login, this flow needs its OWN "Instagram App
// ID/Secret" pair (found under Instagram > API setup with Instagram Login
// in the dashboard) — reusing the main Meta App ID here fails with "Invalid
// platform app".
const AUTHORIZE_BASE = "https://www.instagram.com/oauth/authorize";
const SHORT_TOKEN_BASE = "https://api.instagram.com/oauth/access_token";
const GRAPH_BASE = "https://graph.instagram.com/v25.0";

export type InstagramAppCredentials = { appId: string; appSecret: string };

export async function getInstagramAppCredentials(): Promise<InstagramAppCredentials | null> {
  const config = await getSocialAppConfig();
  const appId = config.instagramAppId || env.INSTAGRAM_APP_ID;
  const appSecret = config.instagramAppSecret || env.INSTAGRAM_APP_SECRET;
  if (!appId || !appSecret) return null;
  return { appId, appSecret };
}

const SCOPES = ["instagram_business_basic", "instagram_business_content_publish"].join(",");

export function buildInstagramAuthUrl(credentials: InstagramAppCredentials, redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: credentials.appId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    state,
  });
  return `${AUTHORIZE_BASE}?${params}`;
}

// Short-lived token (1 hour) immediately exchanged for a long-lived one (60
// days) — the short-lived one alone isn't practical for a tool used over
// multiple days.
export async function exchangeInstagramCode(
  credentials: InstagramAppCredentials,
  code: string,
  redirectUri: string,
) {
  const shortRes = await fetch(SHORT_TOKEN_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: credentials.appId,
      client_secret: credentials.appSecret,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
      code,
    }),
  });
  const shortBody = await shortRes.json();
  if (!shortRes.ok) {
    throw new Error(shortBody?.error_message ?? `Instagram token exchange failed (${shortRes.status})`);
  }

  const longParams = new URLSearchParams({
    grant_type: "ig_exchange_token",
    client_secret: credentials.appSecret,
    access_token: shortBody.access_token,
  });
  const longRes = await fetch(`${GRAPH_BASE.replace("/v25.0", "")}/access_token?${longParams}`);
  const longBody = await longRes.json();
  if (!longRes.ok) {
    throw new Error(longBody?.error?.message ?? `Instagram long-lived token exchange failed (${longRes.status})`);
  }

  return { accessToken: longBody.access_token as string, expiresInSeconds: longBody.expires_in as number };
}

export async function getInstagramAccountInfo(accessToken: string) {
  const response = await fetch(`${GRAPH_BASE}/me?fields=id,username&access_token=${accessToken}`);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message ?? `Instagram account lookup failed (${response.status})`);
  }
  return { instagramUserId: body.id as string, username: body.username as string };
}

export type InstagramPublishResult = { externalPostId: string; externalPostUrl?: string };

// Two-step publish: create a media container from the image, then publish
// it. `imageUrl` MUST be a real https:// URL Instagram's servers can fetch —
// see /api/images/[id]/raw, which is what this should be pointed at.
export async function publishToInstagram(input: {
  instagramUserId: string;
  accessToken: string;
  imageUrl: string;
  caption: string;
}): Promise<InstagramPublishResult> {
  const authHeader = { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json" };

  const containerRes = await fetch(`${GRAPH_BASE}/${input.instagramUserId}/media`, {
    method: "POST",
    headers: authHeader,
    body: JSON.stringify({ image_url: input.imageUrl, caption: input.caption }),
  });
  const container = await containerRes.json();
  if (!containerRes.ok) {
    throw new Error(container?.error?.message ?? `Instagram media container failed (${containerRes.status})`);
  }

  const publishRes = await fetch(`${GRAPH_BASE}/${input.instagramUserId}/media_publish`, {
    method: "POST",
    headers: authHeader,
    body: JSON.stringify({ creation_id: container.id }),
  });
  const published = await publishRes.json();
  if (!publishRes.ok) {
    throw new Error(published?.error?.message ?? `Instagram publish failed (${publishRes.status})`);
  }

  let permalink: string | undefined;
  try {
    const detailsRes = await fetch(
      `${GRAPH_BASE}/${published.id}?fields=permalink&access_token=${input.accessToken}`,
    );
    const details = await detailsRes.json();
    permalink = details.permalink;
  } catch {
    // Non-fatal — the post succeeded even if we couldn't fetch its link.
  }

  return { externalPostId: published.id, externalPostUrl: permalink };
}
