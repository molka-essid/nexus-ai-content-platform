import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/auth/authorize";
import { getPublicationById } from "@/lib/data/publications";
import { publishPublicationVariant } from "@/lib/social/publish-variant";
import { platformSchema } from "@/lib/ai/schemas";

const bodySchema = z.object({ platform: platformSchema });

// Publishes ONE platform's variant of a publication to that platform's
// connected social account.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const publication = await getPublicationById(id);
  if (!publication) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const origin = new URL(request.url).origin;
  const outcome = await publishPublicationVariant(publication, parsed.data.platform, origin);
  if (!outcome.ok) {
    return NextResponse.json({ error: outcome.error }, { status: outcome.status });
  }
  return NextResponse.json(outcome);
}
