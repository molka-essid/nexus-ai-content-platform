import "server-only";
import { env } from "@/lib/env";
import { getSocialAppConfig } from "@/lib/data/social-app-config";

const API_BASE = "https://api.linkedin.com";

export type LinkedInAppCredentials = { clientId: string; clientSecret: string };

export async function getLinkedInAppCredentials(): Promise<LinkedInAppCredentials | null> {
  const config = await getSocialAppConfig();
  const clientId = config.linkedinClientId || env.LINKEDIN_CLIENT_ID;
  const clientSecret = config.linkedinClientSecret || env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

// w_member_social posts to the connected person's own profile — self-serve,
// no LinkedIn review needed. Posting to a Company Page instead needs the
// Community Management API (w_organization_social), which requires LinkedIn
// to approve your app for that product first; not attempted here.
const SCOPES = ["openid", "profile", "w_member_social"].join(" ");

export function buildLinkedInAuthUrl(credentials: LinkedInAppCredentials, redirectUri: string, state: string) {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: credentials.clientId,
    redirect_uri: redirectUri,
    state,
    scope: SCOPES,
  });
  return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
}

export async function exchangeLinkedInCode(
  credentials: LinkedInAppCredentials,
  code: string,
  redirectUri: string,
) {
  const response = await fetch(`${API_BASE}/oauth/v2/accessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: credentials.clientId,
      client_secret: credentials.clientSecret,
    }),
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error_description ?? body?.error ?? `LinkedIn token exchange failed (${response.status})`);
  }
  return { accessToken: body.access_token as string, expiresInSeconds: body.expires_in as number };
}

export async function getLinkedInUserInfo(accessToken: string) {
  const response = await fetch(`${API_BASE}/v2/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.message ?? `LinkedIn user info failed (${response.status})`);
  }
  return { personUrn: `urn:li:person:${body.sub}` as string, name: body.name as string };
}

export type LinkedInPublishResult = { externalPostId: string };

// LinkedIn doesn't support pulling an image from a URL directly (unlike
// Instagram/Facebook/TikTok) — it requires uploading the bytes to their own
// asset system first: register the upload, PUT the bytes, then reference
// the returned asset in the post.
export async function publishToLinkedIn(input: {
  personUrn: string;
  accessToken: string;
  imageUrl: string;
  caption: string;
}): Promise<LinkedInPublishResult> {
  const headers = {
    Authorization: `Bearer ${input.accessToken}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    // LinkedIn only keeps a rolling ~2-year window of versions active and
    // returns a hard error for anything older — this needs bumping forward
    // periodically, it's not a one-time constant.
    "LinkedIn-Version": "202606",
  };

  const initRes = await fetch(`${API_BASE}/rest/images?action=initializeUpload`, {
    method: "POST",
    headers,
    body: JSON.stringify({ initializeUploadRequest: { owner: input.personUrn } }),
  });
  const initBody = await initRes.json();
  if (!initRes.ok) {
    throw new Error(initBody?.message ?? `LinkedIn image upload init failed (${initRes.status})`);
  }
  const uploadUrl = initBody.value.uploadUrl as string;
  const imageUrn = initBody.value.image as string;

  const imageBytes = await fetch(input.imageUrl).then((r) => r.arrayBuffer());
  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${input.accessToken}` },
    body: imageBytes,
  });
  if (!uploadRes.ok) {
    throw new Error(`Échec du téléversement de l'image LinkedIn (${uploadRes.status})`);
  }

  const postRes = await fetch(`${API_BASE}/rest/posts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      author: input.personUrn,
      commentary: input.caption,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      content: { media: { id: imageUrn } },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  if (!postRes.ok) {
    const errBody = await postRes.json().catch(() => null);
    throw new Error(errBody?.message ?? `LinkedIn post failed (${postRes.status})`);
  }
  const postId = postRes.headers.get("x-restli-id") ?? postRes.headers.get("x-linkedin-id") ?? "unknown";
  return { externalPostId: postId };
}
