import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { authorize } from "@/lib/auth/authorize";
import { buildTikTokAuthUrl, getTikTokAppCredentials } from "@/lib/social/tiktok";

export async function GET(request: Request) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const credentials = await getTikTokAppCredentials();
  if (!credentials) {
    return NextResponse.json(
      { error: "TikTok n'est pas encore configuré — ajoutez votre clé client et Secret sur la page Marque." },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/social/tiktok/callback`;
  const state = randomBytes(16).toString("hex");

  const response = NextResponse.redirect(buildTikTokAuthUrl(credentials, redirectUri, state));
  response.cookies.set("tt_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
