import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/authorize";
import { exchangeTikTokCode, getTikTokAppCredentials, getTikTokUserInfo } from "@/lib/social/tiktok";
import { upsertSocialAccount } from "@/lib/data/social-accounts";

export async function GET(request: Request) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.headers
    .get("cookie")
    ?.match(/tt_oauth_state=([^;]+)/)?.[1];

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(
      new URL(`/brand?social_error=${encodeURIComponent("Échec ou expiration de la connexion TikTok. Veuillez réessayer.")}`, url.origin),
    );
  }

  try {
    const credentials = await getTikTokAppCredentials();
    if (!credentials) {
      return NextResponse.redirect(new URL(`/brand?social_error=${encodeURIComponent("TikTok n'est pas configuré.")}`, url.origin));
    }
    const redirectUri = `${url.origin}/api/social/tiktok/callback`;
    const { accessToken, refreshToken, expiresInSeconds, openId } = await exchangeTikTokCode(
      credentials,
      code,
      redirectUri,
    );
    const userInfo = await getTikTokUserInfo(accessToken);

    await upsertSocialAccount({
      platform: "TIKTOK",
      externalAccountId: openId,
      displayName: userInfo.display_name,
      accessToken,
      refreshToken,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
      connectedById: authResult.session.user.id,
    });

    const response = NextResponse.redirect(new URL("/brand?social_connected=tiktok", url.origin));
    response.cookies.delete("tt_oauth_state");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de la connexion à TikTok.";
    return NextResponse.redirect(new URL(`/brand?social_error=${encodeURIComponent(message)}`, url.origin));
  }
}
