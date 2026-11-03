import { NextResponse } from "next/server";
import { z } from "zod";
import { authorize } from "@/lib/auth/authorize";
import { getPublicationById, replacePublicationFlyerImages } from "@/lib/data/publications";
import { getImageById } from "@/lib/data/images";
import { generateFlyerOptions } from "@/lib/ai/generate-flyer-options";
import { photoModeSchema } from "@/lib/ai/schemas";

const bodySchema = z
  .object({
    photoMode: photoModeSchema.optional(),
    imageId: z.string().min(1).optional(),
  })
  .optional();

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await authorize();
  if (!authResult.ok) return authResult.response;

  const { id } = await params;
  const publication = await getPublicationById(id);
  if (!publication) {
    return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  }

  const rawBody = await request.json().catch(() => undefined);
  const parsedBody = bodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.flatten() }, { status: 400 });
  }

  // Explicit choice from the "Create flyer" dialog takes priority. With no
  // choice given (e.g. an older client), fall back to whichever photo is
  // already associated with this publication — regenerating styles should
  // never silently fetch a brand-new random photo without being asked to.
  const requestedMode = parsedBody.data?.photoMode;
  const photoMode = requestedMode ?? "real";
  let realImageId: string | undefined;

  if (photoMode === "real") {
    realImageId = requestedMode ? parsedBody.data?.imageId : (publication.sourceImageId ?? publication.imageId ?? undefined);
    if (!realImageId) {
      return NextResponse.json(
        { error: "Choisissez une photo (ou optez pour en générer une) avant de créer le flyer." },
        { status: 400 },
      );
    }
    const image = await getImageById(realImageId);
    if (!image) {
      return NextResponse.json({ error: "Cette photo n'existe plus. Veuillez en choisir une autre." }, { status: 404 });
    }
  }

  try {
    const { sourceImageId, optionImageIds, staleImageIds } = await generateFlyerOptions({
      photoMode,
      realImageId,
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

    const updated = await replacePublicationFlyerImages(id, {
      imageId: optionImageIds[0],
      sourceImageId,
      staleImageIds,
    });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("Flyer generation failed", error);
    return NextResponse.json({ error: "Échec de la génération du flyer." }, { status: 502 });
  }
}
