import "server-only";
import { env } from "@/lib/env";
import { getSocialAppConfig } from "@/lib/data/social-app-config";

// TikTok's Content Posting API has changed shape more than once historically
// — the requests below follow their documented v2 pattern as of this
// writing, but verify against developers.tiktok.com/doc once you have
// sandbox access, before relying on this for a real demo.
const AUTH_BASE = "https://www.tiktok.com/v2/auth/authorize/";
const API_BASE = "https://open.tiktokapis.com/v2";

export type TikTokAppCredentials = { clientKey: string; clientSecret: string };

// Credentials entered in the app (Brand page) take priority, falling back
// to env vars only if nothing's been saved there yet (e.g. local dev).
export async function getTikTokAppCredentials(): Promise<TikTokAppCredentials | null> {
  const config = await getSocialAppConfig();
  const clientKey = config.tiktokClientKey || env.TIKTOK_CLIENT_KEY;
  const clientSecret = config.tiktokClientSecret || env.TIKTOK_CLIENT_SECRET;
  if (!clientKey || !clientSecret) return null;
  return { clientKey, clientSecret };
}

const SCOPES = ["user.info.basic", "video.publish"].join(",");

export function buildTikTokAuthUrl(credentials: TikTokAppCredentials, redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_key: credentials.clientKey,
    scope: SCOPES,
    response_type: "code",
    redirect_uri: redirectUri,
    state,
  });
  return `${AUTH_BASE}?${params}`;
}

export async function exchangeTikTokCode(
  credentials: TikTokAppCredentials,
  code: string,
  redirectUri: string,
) {
  const response = await fetch(`${API_BASE}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: credentials.clientKey,
      client_secret: credentials.clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });
  const body = await response.json();
  if (!response.ok || body.error) {
    throw new Error(body?.error_description ?? body?.error ?? `TikTok token exchange failed (${response.status})`);
  }
  return {
    accessToken: body.access_token as string,
    refreshToken: body.refresh_token as string | undefined,
    expiresInSeconds: body.expires_in as number,
    openId: body.open_id as string,
  };
}

export async function getTikTokUserInfo(accessToken: string) {
  const response = await fetch(`${API_BASE}/user/info/?fields=open_id,display_name`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await response.json();
  if (!response.ok || body.error?.code !== "ok") {
    throw new Error(body?.error?.message ?? `TikTok user info failed (${response.status})`);
  }
  return body.data.user as { open_id: string; display_name: string };
}

export type TikTokPublishResult = { externalPostId: string };

// Direct-post a single image via PULL_FROM_URL (TikTok fetches it from
// `imageUrl` itself — see /api/images/[id]/raw). Until the connected app
// passes TikTok's audit, posts are restricted to SELF_ONLY visibility —
// that's a TikTok platform rule, not something this code controls.
export async function publishToTikTok(input: {
  accessToken: string;
  imageUrl: string;
  caption: string;
}): Promise<TikTokPublishResult> {
  const response = await fetch(`${API_BASE}/post/publish/content/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      post_info: {
        title: input.caption,
        privacy_level: "SELF_ONLY",
        disable_comment: false,
      },
      source_info: {
        source: "PULL_FROM_URL",
        photo_cover_index: 0,
        photo_images: [input.imageUrl],
      },
      post_mode: "DIRECT_POST",
      media_type: "PHOTO",
    }),
  });
  const body = await response.json();
  if (!response.ok || body.error?.code !== "ok") {
    throw new Error(body?.error?.message ?? `TikTok publish failed (${response.status})`);
  }
  return { externalPostId: body.data.publish_id as string };
}
