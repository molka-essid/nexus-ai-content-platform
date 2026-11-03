import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { authorize } from "@/lib/auth/authorize";
import { buildFacebookAuthUrl, getFacebookAppCredentials } from "@/lib/social/facebook";

export async function GET(request: Request) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const credentials = await getFacebookAppCredentials();
  if (!credentials) {
    return NextResponse.json(
      { error: "Meta n'est pas encore configuré — ajoutez votre ID et Secret d'application sur la page Marque." },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/social/facebook/callback`;
  const state = randomBytes(16).toString("hex");

  const response = NextResponse.redirect(buildFacebookAuthUrl(credentials, redirectUri, state));
  response.cookies.set("fb_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
