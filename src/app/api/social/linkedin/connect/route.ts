import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { authorize } from "@/lib/auth/authorize";
import { buildLinkedInAuthUrl, getLinkedInAppCredentials } from "@/lib/social/linkedin";

export async function GET(request: Request) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const credentials = await getLinkedInAppCredentials();
  if (!credentials) {
    return NextResponse.json(
      { error: "LinkedIn n'est pas encore configuré — ajoutez votre ID client et Secret sur la page Marque." },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/social/linkedin/callback`;
  const state = randomBytes(16).toString("hex");

  const response = NextResponse.redirect(buildLinkedInAuthUrl(credentials, redirectUri, state));
  response.cookies.set("li_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
