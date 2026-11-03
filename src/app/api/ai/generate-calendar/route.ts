import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/authorize";
import { generateCalendarInputSchema } from "@/lib/ai/schemas";
import { generateCalendar } from "@/lib/ai/generate-calendar";
import { createCalendarFromGeneration } from "@/lib/data/calendar";
import { generateFlyerOptions } from "@/lib/ai/generate-flyer-options";
import { getPublicationById, replacePublicationFlyerImages } from "@/lib/data/publications";
import { ProviderQuotaExceededError } from "@/lib/ai/quota-error";

export async function POST(request: Request) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const body = await request.json();
  const parsed = generateCalendarInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const generation = await generateCalendar(parsed.data, authResult.session.user.id);
    const calendarWeek = await createCalendarFromGeneration(
      parsed.data,
      generation,
      authResult.session.user.id,
    );

    // Flyer source is chosen ONCE for the whole week (either the same
    // existing photo reused across every post, or a freshly sourced photo
    // per post) instead of asking again for each publication afterward.
    // Best-effort per post: the text content is already saved regardless.
    // Capped at 2 concurrent posts — each one calls an external photo API
    // (Pexels/Pollinations) plus does CPU-heavy image compositing, and
    // firing all 7 at once risks tripping those APIs' rate limits.
    const flyerPhotoMode = parsed.data.flyerPhotoMode ?? "generated";
    const slotsWithPublication = calendarWeek.slots.filter((slot) => slot.publication);
    const FLYER_CONCURRENCY = 2;
    for (let i = 0; i < slotsWithPublication.length; i += FLYER_CONCURRENCY) {
      const batch = slotsWithPublication.slice(i, i + FLYER_CONCURRENCY);
      await Promise.all(
        batch.map(async (slot) => {
          try {
            const publication = await getPublicationById(slot.publication!.id);
            if (!publication) return;
            const { sourceImageId, optionImageIds, staleImageIds } = await generateFlyerOptions({
              photoMode: flyerPhotoMode,
              realImageId: parsed.data.flyerImageId,
              category: publication.category,
              visualConcept: publication.visualConcept,
              headline: publication.title,
              badge: publication.badge ?? undefined,
              highlights: publication.highlights,
              cta: publication.cta,
              hashtags: publication.hashtags,
              uploadedById: authResult.session.user.id,
              groupTag: `flyer-set:${publication.id}`,
            });
            if (optionImageIds[0]) {
              await replacePublicationFlyerImages(publication.id, {
                imageId: optionImageIds[0],
                sourceImageId,
                staleImageIds,
              });
            }
          } catch (error) {
            console.error(`Flyer generation failed for publication ${slot.publication!.id}, continuing`, error);
          }
        }),
      );
    }

    return NextResponse.json(calendarWeek, { status: 201 });
  } catch (error) {
    if (error instanceof ProviderQuotaExceededError) {
      return NextResponse.json(
        { error: error.message, code: "QUOTA_EXCEEDED", retryAfterSeconds: error.retryAfterSeconds },
        { status: 429 },
      );
    }
    console.error("Calendar generation failed", error);
    const message = error instanceof Error ? error.message : "Échec de la génération. Veuillez réessayer.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
