import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/auth/authorize";
import { updateSocialAppConfig } from "@/lib/data/social-app-config";

const bodySchema = z.object({
  metaAppId: z.string().optional(),
  metaAppSecret: z.string().optional(),
  instagramAppId: z.string().optional(),
  instagramAppSecret: z.string().optional(),
  tiktokClientKey: z.string().optional(),
  tiktokClientSecret: z.string().optional(),
  linkedinClientId: z.string().optional(),
  linkedinClientSecret: z.string().optional(),
});

// App-level platform credentials (Meta App ID/Secret, TikTok Client Key/
// Secret) — distinct from /api/social/[platform] which manages a specific
// CONNECTED end-user account. Secret fields are omitted from the request
// entirely when the user leaves them blank in the form, meaning "keep the
// current value" rather than "clear it" — see the client component.
export async function POST(request: Request) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await updateSocialAppConfig(parsed.data);
  return NextResponse.json({ ok: true });
}
