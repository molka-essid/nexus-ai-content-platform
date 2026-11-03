import "server-only";
import { env } from "@/lib/env";
import { getSocialAppConfig } from "@/lib/data/social-app-config";

// Facebook Page posting uses the classic Facebook Login flow — separate
// from Instagram's newer direct-login flow (see instagram.ts), even though
// both share the same underlying Meta App ID/Secret.
const GRAPH_VERSION = "v21.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export type FacebookAppCredentials = { appId: string; appSecret: string };

export async function getFacebookAppCredentials(): Promise<FacebookAppCredentials | null> {
  const config = await getSocialAppConfig();
  const appId = config.metaAppId || env.META_APP_ID;
  const appSecret = config.metaAppSecret || env.META_APP_SECRET;
  if (!appId || !appSecret) return null;
  return { appId, appSecret };
}

const SCOPES = ["pages_show_list", "pages_read_engagement", "pages_manage_posts", "business_management"].join(",");

export function buildFacebookAuthUrl(credentials: FacebookAppCredentials, redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: credentials.appId,
    redirect_uri: redirectUri,
    scope: SCOPES,
    response_type: "code",
    state,
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params}`;
}

async function graphGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = `${GRAPH_BASE}${path}?${new URLSearchParams(params)}`;
  const response = await fetch(url);
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message ?? `Facebook API error (${response.status})`);
  }
  return body as T;
}

async function graphPost<T>(path: string, params: Record<string, string>): Promise<T> {
  const response = await fetch(`${GRAPH_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error?.message ?? `Facebook API error (${response.status})`);
  }
  return body as T;
}

export async function exchangeFacebookCode(
  credentials: FacebookAppCredentials,
  code: string,
  redirectUri: string,
) {
  const short = await graphGet<{ access_token: string }>("/oauth/access_token", {
    client_id: credentials.appId,
    client_secret: credentials.appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const long = await graphGet<{ access_token: string; expires_in: number }>("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: credentials.appId,
    client_secret: credentials.appSecret,
    fb_exchange_token: short.access_token,
  });

  return { accessToken: long.access_token, expiresInSeconds: long.expires_in };
}

// Returns the first Page found (this tool connects one account at a time),
// or null if the user has no Pages / didn't grant Page access.
export async function findFacebookPage(userAccessToken: string) {
  const pages = await graphGet<{ data: { id: string; name: string; access_token: string }[] }>("/me/accounts", {
    access_token: userAccessToken,
  });
  const page = pages.data[0];
  return page ? { pageId: page.id, pageName: page.name, pageAccessToken: page.access_token } : null;
}

export type FacebookPublishResult = { externalPostId: string; externalPostUrl?: string };

// Posts a photo directly to a Facebook Page's feed. `imageUrl` MUST be a
// real https:// URL Facebook's servers can fetch — see
// /api/images/[id]/raw. Simpler than Instagram's two-step container flow:
// Facebook Page photo posts are a single call.
export async function publishToFacebook(input: {
  pageId: string;
  accessToken: string;
  imageUrl: string;
  caption: string;
}): Promise<FacebookPublishResult> {
  const posted = await graphPost<{ id: string; post_id?: string }>(`/${input.pageId}/photos`, {
    url: input.imageUrl,
    caption: input.caption,
    access_token: input.accessToken,
  });

  const postId = posted.post_id ?? posted.id;
  let permalink: string | undefined;
  try {
    const details = await graphGet<{ permalink_url: string }>(`/${postId}`, {
      fields: "permalink_url",
      access_token: input.accessToken,
    });
    permalink = details.permalink_url;
  } catch {
    // Non-fatal — the post succeeded even if we couldn't fetch its link.
  }

  return { externalPostId: postId, externalPostUrl: permalink };
}
