import { NextResponse } from "next/server";
import { authorize } from "@/lib/auth/authorize";
import { generatePublicationInputSchema } from "@/lib/ai/schemas";
import { generatePublication } from "@/lib/ai/generate-publication";
import { generateFlyerOptions } from "@/lib/ai/generate-flyer-options";
import {
  createPublicationFromGeneration,
  getPublicationById,
  replacePublicationFlyerImages,
} from "@/lib/data/publications";
import { createCalendarSlot } from "@/lib/data/calendar";
import { ProviderQuotaExceededError } from "@/lib/ai/quota-error";

export async function POST(request: Request) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const body = await request.json();
  const parsed = generatePublicationInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const generation = await generatePublication(parsed.data, authResult.session.user.id);
    const publication = await createPublicationFromGeneration(
      parsed.data,
      generation,
      authResult.session.user.id,
    );

    // Flyer options are best-effort: if this fails, the text content is
    // still saved and valuable on its own.
    try {
      const { sourceImageId, optionImageIds, staleImageIds } = await generateFlyerOptions({
        photoMode: parsed.data.photoMode,
        realImageId: parsed.data.imageId,
        category: parsed.data.category,
        visualConcept: generation.visualConcept,
        headline: generation.title,
        badge: generation.badge,
        highlights: generation.highlights,
        cta: generation.cta,
        hashtags: generation.hashtags,
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
      console.error("Flyer options generation failed, continuing without an image", error);
    }

    // Generated from a calendar date click — pin it onto that date. Best
    // effort: the publication itself is already saved either way.
    if (parsed.data.scheduledDate) {
      try {
        await createCalendarSlot({
          scheduledDate: new Date(parsed.data.scheduledDate),
          platform: parsed.data.platforms[0],
          category: parsed.data.category,
          objective: parsed.data.objective ?? parsed.data.publicationType,
          publicationId: publication.id,
          calendarWeekId: parsed.data.calendarWeekId,
        });
      } catch (error) {
        console.error("Failed to schedule the new publication on the calendar", error);
      }
    }

    const finalPublication = await getPublicationById(publication.id);
    return NextResponse.json(finalPublication, { status: 201 });
  } catch (error) {
    if (error instanceof ProviderQuotaExceededError) {
      return NextResponse.json(
        { error: error.message, code: "QUOTA_EXCEEDED", retryAfterSeconds: error.retryAfterSeconds },
        { status: 429 },
      );
    }
    console.error("Publication generation failed", error);
    const message = error instanceof Error ? error.message : "Échec de la génération. Veuillez réessayer.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
