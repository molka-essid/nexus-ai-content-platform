import { prisma } from "@/lib/db/prisma";
import { PublicationStatus, type ContentCategory } from "@prisma/client";
import type { GeneratePublicationInput, PublicationGeneration } from "@/lib/ai/schemas";
import type { UpdatePublicationInput } from "@/lib/validation/publication";

const publicationInclude = {
  variants: true,
  image: true,
  createdBy: { select: { id: true, name: true, email: true } },
  // Lets callers (e.g. the post-generation preview) know which calendar slot,
  // if any, to clean up when discarding a not-yet-confirmed publication —
  // deleting a Publication only SETS NULL on the slot's FK, it doesn't
  // remove the now-empty slot itself. calendarWeekId lets the detail page
  // know whether to show Weekly Plan navigation at all.
  calendarSlot: { select: { id: true, scheduledDate: true, calendarWeekId: true } },
  // Tags reveal whether the current photo came from AI/stock sourcing
  // (`stock-photo`/`ai-generated`) or a real upload, so the editor can show
  // "Flyer source: X" without re-asking the user.
  sourceImage: { select: { tags: true } },
} as const;

export type PublicationFilters = {
  status?: PublicationStatus;
  category?: ContentCategory;
};

// Publications opted into autoPublish, still SCHEDULED, whose calendar date
// has arrived — picked up by the /api/cron/auto-publish cron job, which
// actually posts each variant to its connected social account (not just a
// status flip) before marking the publication PUBLISHED.
export async function listDueAutoPublishPublications() {
  return prisma.publication.findMany({
    where: {
      status: PublicationStatus.SCHEDULED,
      autoPublish: true,
      calendarSlot: { scheduledDate: { lte: new Date() } },
    },
    include: publicationInclude,
  });
}

// Surfaced as a persistent badge in the topbar — without this, a failed
// publish attempt (manual or from the auto-publish cron) is only visible by
// opening that exact publication's platform tab, easy to miss for weeks.
export async function countPublicationsWithPublishErrors(): Promise<number> {
  return prisma.publication.count({
    where: { variants: { some: { publishError: { not: null } } } },
  });
}

export async function listPublications(filters: PublicationFilters = {}) {
  return prisma.publication.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.category ? { category: filters.category } : {}),
    },
    include: publicationInclude,
    orderBy: { createdAt: "desc" },
  });
}

export async function getPublicationById(id: string) {
  return prisma.publication.findUnique({ where: { id }, include: publicationInclude });
}

export type PublicationWithRelations = NonNullable<
  Awaited<ReturnType<typeof getPublicationById>>
>;

export async function createPublicationFromGeneration(
  input: GeneratePublicationInput,
  generation: PublicationGeneration,
  createdById: string,
) {
  return prisma.publication.create({
    data: {
      title: generation.title,
      hook: generation.hook,
      caption: generation.caption,
      cta: generation.cta,
      hashtags: generation.hashtags,
      visualConcept: generation.visualConcept,
      highlights: generation.highlights,
      badge: generation.badge,
      category: input.category,
      objective: input.objective ?? input.publicationType,
      audience: input.audience ?? "General audience",
      tone: input.tone ?? "Brand default",
      createdById,
      variants: {
        create: generation.variants.map((variant) => ({
          platform: variant.platform,
          caption: variant.caption,
          hashtags: variant.hashtags,
          cta: variant.cta,
        })),
      },
    },
    include: publicationInclude,
  });
}

export async function updatePublication(id: string, input: UpdatePublicationInput) {
  return prisma.$transaction(async (tx) => {
    await tx.platformVariant.deleteMany({ where: { publicationId: id } });
    return tx.publication.update({
      where: { id },
      data: {
        title: input.title,
        hook: input.hook,
        caption: input.caption,
        cta: input.cta,
        hashtags: input.hashtags,
        visualConcept: input.visualConcept,
        category: input.category,
        objective: input.objective,
        audience: input.audience,
        tone: input.tone,
        variants: {
          create: input.variants.map((variant) => ({
            platform: variant.platform,
            caption: variant.caption,
            hashtags: variant.hashtags,
            cta: variant.cta,
          })),
        },
      },
      include: publicationInclude,
    });
  });
}

export async function setPublicationImage(
  id: string,
  imageId: string,
  sourceImageId?: string,
) {
  return prisma.publication.update({
    where: { id },
    data: { imageId, ...(sourceImageId ? { sourceImageId } : {}) },
    include: publicationInclude,
  });
}

// Used exclusively by the "attach/change photo" flow (the ImagePicker on the
// publication detail page). Distinct from setPublicationImage/
// replacePublicationFlyerImages below: this is the ONLY path that should ever
// change sourceImageId, because it's the only place the user is expressing
// "this is a genuinely new underlying photo" rather than "pick among the
// flyer styles already rendered from the current photo." Whatever flyer
// options existed for the old photo are now meaningless, so they're deleted
// in the same transaction that repoints the FKs (avoids a window where the
// row could reference an image that's about to be removed).
export async function setPublicationSourcePhoto(id: string, imageId: string | null) {
  return prisma.$transaction(async (tx) => {
    const stalePublication = await tx.publication.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!stalePublication) throw new Error("Publication introuvable");

    const staleImages = await tx.image.findMany({
      where: { tags: { has: `flyer-set:${id}` } },
      select: { id: true },
    });

    const updated = await tx.publication.update({
      where: { id },
      data: { imageId, sourceImageId: imageId },
      include: publicationInclude,
    });

    if (staleImages.length > 0) {
      await tx.image.deleteMany({ where: { id: { in: staleImages.map((image) => image.id) } } });
    }

    return updated;
  });
}

// Used exclusively after generating a fresh batch of flyer style options for
// the CURRENT photo. Points the publication at the new batch and removes the
// previous batch in the same transaction, so regenerating never accumulates
// old styles alongside new ones.
export async function replacePublicationFlyerImages(
  id: string,
  input: { imageId: string; sourceImageId: string; staleImageIds: string[] },
) {
  return prisma.$transaction(async (tx) => {
    const updated = await tx.publication.update({
      where: { id },
      data: { imageId: input.imageId, sourceImageId: input.sourceImageId },
      include: publicationInclude,
    });

    if (input.staleImageIds.length > 0) {
      await tx.image.deleteMany({ where: { id: { in: input.staleImageIds } } });
    }

    return updated;
  });
}

export async function deletePublication(id: string) {
  await prisma.publication.delete({ where: { id } });
}

export async function setPublicationStatus(id: string, status: PublicationStatus) {
  return prisma.publication.update({
    where: { id },
    data: { status },
    include: publicationInclude,
  });
}

export async function setPublicationAutoPublish(id: string, autoPublish: boolean) {
  return prisma.publication.update({
    where: { id },
    data: { autoPublish },
    include: publicationInclude,
  });
}

// Records the outcome of an actual publish attempt to a connected social
// account against that platform's variant — separate from the publish
// attempt failing to reach the platform at all (see the route, which
// catches that case and calls this with just publishError set).
export async function setPlatformVariantPublishResult(
  publicationId: string,
  platform: import("@prisma/client").Platform,
  result:
    | { externalPostId: string; externalPostUrl?: string }
    | { publishError: string },
) {
  await prisma.platformVariant.updateMany({
    where: { publicationId, platform },
    data:
      "externalPostId" in result
        ? {
            externalPostId: result.externalPostId,
            externalPostUrl: result.externalPostUrl,
            publishedAt: new Date(),
            publishError: null,
          }
        : { publishError: result.publishError },
  });
}
