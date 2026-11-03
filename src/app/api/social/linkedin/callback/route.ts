import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/authorize";
import { exchangeLinkedInCode, getLinkedInAppCredentials, getLinkedInUserInfo } from "@/lib/social/linkedin";
import { upsertSocialAccount } from "@/lib/data/social-accounts";

export async function GET(request: Request) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieState = request.headers.get("cookie")?.match(/li_oauth_state=([^;]+)/)?.[1];

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(
      new URL(`/brand?social_error=${encodeURIComponent("Échec ou expiration de la connexion LinkedIn. Veuillez réessayer.")}`, url.origin),
    );
  }

  try {
    const credentials = await getLinkedInAppCredentials();
    if (!credentials) {
      return NextResponse.redirect(new URL(`/brand?social_error=${encodeURIComponent("LinkedIn n'est pas configuré.")}`, url.origin));
    }
    const redirectUri = `${url.origin}/api/social/linkedin/callback`;
    const { accessToken, expiresInSeconds } = await exchangeLinkedInCode(credentials, code, redirectUri);
    const userInfo = await getLinkedInUserInfo(accessToken);

    await upsertSocialAccount({
      platform: "LINKEDIN",
      externalAccountId: userInfo.personUrn,
      displayName: userInfo.name,
      accessToken,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
      connectedById: authResult.session.user.id,
    });

    const response = NextResponse.redirect(new URL("/brand?social_connected=linkedin", url.origin));
    response.cookies.delete("li_oauth_state");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de la connexion à LinkedIn.";
    return NextResponse.redirect(new URL(`/brand?social_error=${encodeURIComponent(message)}`, url.origin));
  }
}
