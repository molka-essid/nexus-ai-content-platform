import { NextResponse } from "next/server";
import { listDueAutoPublishPublications, setPublicationStatus } from "@/lib/data/publications";
import { publishPublicationVariant } from "@/lib/social/publish-variant";
import { PublicationStatus } from "@prisma/client";

// Triggered daily by Vercel Cron (see vercel.json). Vercel automatically
// sends "Authorization: Bearer $CRON_SECRET" on cron-triggered requests when
// CRON_SECRET is set on the project — this rejects anyone else calling the
// route directly.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const origin = new URL(request.url).origin;
  const duePublications = await listDueAutoPublishPublications();

  const results: Array<{ publicationId: string; platform: string; ok: boolean; error?: string }> = [];

  for (const publication of duePublications) {
    for (const variant of publication.variants) {
      // Platforms with no connected account are silently skipped — the
      // publication still gets marked PUBLISHED below, and the platform tab
      // will show "Not yet posted" until an account is connected and it's
      // published manually.
      const outcome = await publishPublicationVariant(publication, variant.platform, origin);
      results.push({
        publicationId: publication.id,
        platform: variant.platform,
        ok: outcome.ok,
        error: outcome.ok ? undefined : outcome.error,
      });
    }
    await setPublicationStatus(publication.id, PublicationStatus.PUBLISHED);
  }

  return NextResponse.json({ processed: duePublications.length, results });
}
