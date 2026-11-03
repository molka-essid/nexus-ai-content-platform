import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { authorize } from "@/lib/auth/authorize";
import { buildInstagramAuthUrl, getInstagramAppCredentials } from "@/lib/social/instagram";

export async function GET(request: Request) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const credentials = await getInstagramAppCredentials();
  if (!credentials) {
    return NextResponse.json(
      { error: "Instagram n'est pas encore configuré — ajoutez votre ID et Secret d'application Meta sur la page Marque." },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;
  const redirectUri = `${origin}/api/social/instagram/callback`;
  const state = randomBytes(16).toString("hex");
  console.log("[ig-connect] redirectUri sent to Meta:", redirectUri);

  const response = NextResponse.redirect(buildInstagramAuthUrl(credentials, redirectUri, state));
  response.cookies.set("ig_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return response;
}
