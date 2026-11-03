import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/authorize";
import { exchangeFacebookCode, findFacebookPage, getFacebookAppCredentials } from "@/lib/social/facebook";
import { upsertSocialAccount } from "@/lib/data/social-accounts";

export async function GET(request: Request) {
  console.log("[fb-callback] hit", { url: request.url });

  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const cookieHeader = request.headers.get("cookie");
  const cookieState = cookieHeader?.match(/fb_oauth_state=([^;]+)/)?.[1];
  console.log("[fb-callback] params", {
    hasCode: Boolean(code),
    hasState: Boolean(state),
    hasCookieHeader: Boolean(cookieHeader),
    cookieState,
    state,
    match: state === cookieState,
  });

  if (!code || !state || !cookieState || state !== cookieState) {
    console.log("[fb-callback] state mismatch, redirecting to error");
    return NextResponse.redirect(
      new URL(`/brand?social_error=${encodeURIComponent("Échec ou expiration de la connexion Facebook. Veuillez réessayer.")}`, url.origin),
    );
  }

  try {
    const credentials = await getFacebookAppCredentials();
    console.log("[fb-callback] credentials", { hasCredentials: Boolean(credentials) });
    if (!credentials) {
      return NextResponse.redirect(new URL(`/brand?social_error=${encodeURIComponent("Meta n'est pas configuré.")}`, url.origin));
    }
    const redirectUri = `${url.origin}/api/social/facebook/callback`;
    const { accessToken, expiresInSeconds } = await exchangeFacebookCode(credentials, code, redirectUri);
    console.log("[fb-callback] token exchanged", { hasToken: Boolean(accessToken), expiresInSeconds });

    const page = await findFacebookPage(accessToken);
    console.log("[fb-callback] page lookup", { found: Boolean(page), pageId: page?.pageId, pageName: page?.pageName });

    if (!page) {
      return NextResponse.redirect(
        new URL(
          `/brand?social_error=${encodeURIComponent("Aucune Page Facebook trouvée. Créez-en une ou obtenez d'abord un accès administrateur à une Page.")}`,
          url.origin,
        ),
      );
    }

    await upsertSocialAccount({
      platform: "FACEBOOK",
      externalAccountId: page.pageId,
      displayName: page.pageName,
      accessToken: page.pageAccessToken,
      expiresAt: new Date(Date.now() + expiresInSeconds * 1000),
      connectedById: authResult.session.user.id,
    });
    console.log("[fb-callback] SocialAccount saved successfully");

    const response = NextResponse.redirect(new URL("/brand?social_connected=facebook", url.origin));
    response.cookies.delete("fb_oauth_state");
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de la connexion à Facebook.";
    console.error("[fb-callback] error", error);
    return NextResponse.redirect(new URL(`/brand?social_error=${encodeURIComponent(message)}`, url.origin));
  }
}
