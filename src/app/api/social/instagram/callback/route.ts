import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/authorize";
import { exchangeInstagramCode, getInstagramAccountInfo, getInstagramAppCredentials } from "@/lib/social/instagram";
import { upsertSocialAccount } from "@/lib/data/social-accounts";

export async function GET(request: Request) {
  console.log("[ig-callback] hit", { url: request.url });

  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieHeader = request.headers.get("cookie");
  const cookieState = cookieHeader?.match(/ig_oauth_state=([^;]+)/)?.[1];
  console.log("[ig-callback] params", {
    hasCode: Boolean(code),
    hasState: Boolean(state),
    hasCookieHeader: Boolean(cookieHeader),
    cookieState,
    state,
    match: state === cookieState,
  });

  if (!code || !state || !cookieState || state !== cookieState) {
    console.log("[ig-callback] state mismatch, redirecting to error");
    return NextResponse.redirect(
      new URL(`/brand?social_error=${encodeURIComponent("Échec ou expiration de la connexion Instagram. Veuillez réessayer.")}`, url.origin),
    );
  }

  try {
    const credentials = await getInstagramAppCredentials();
    console.log("[ig-callback] credentials", { hasCredentials: Boolean(credentials) });
    if (!credentials) {
      return NextResponse.redirect(new URL(`/brand?social_error=${encodeURIComponent("Instagram n'est pas configuré.")}`, url.origin));
    }
    const redirectUri = `${url.origin}/api/social/instagram/callback`;
    const { accessToken, expiresInSeconds } = await exchangeInstagramCode(credentials, code, redirectUri);
    console.log("[ig-callback] token exchanged", { hasToken: Boolean(accessToken), expiresInSeconds });

    const account = await getInstagramAccountInfo(accessToken);
    console.log("[ig-callback] account info", account);

    await upsertSocialAccount({
      platform: "INSTAGRAM",
      externalAccountId: account.instagramUserId,
      displayName: account.username,
      accessToken,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
      connectedById: authResult.session.user.id,
    });
    console.log("[ig-callback] SocialAccount saved successfully");

    const response = NextResponse.redirect(new URL("/brand?social_connected=instagram", url.origin));
    response.cookies.delete("ig_oauth_state");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de la connexion à Instagram.";
    console.error("[ig-callback] error", error);
    return NextResponse.redirect(new URL(`/brand?social_error=${encodeURIComponent(message)}`, url.origin));
  }
}
