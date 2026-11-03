import "server-only";
import { generateImage } from "@/lib/ai/generate-image";
import { searchStockPhoto } from "@/lib/ai/stock-photo";
import { renderFlyer, pickStyles } from "@/lib/ai/render-flyer";
import { analyzePhoto } from "@/lib/ai/photo-analysis";
import { getBrandProfile } from "@/lib/data/brand";
import { createInlineImage, getImageById, listImages } from "@/lib/data/images";
import type { ContentCategory } from "@prisma/client";

async function imageUrlToBuffer(url: string): Promise<Buffer> {
  if (url.startsWith("data:")) {
    return Buffer.from(url.split(",")[1] ?? "", "base64");
  }
  const response = await fetch(url);
  return Buffer.from(await response.arrayBuffer());
}

// Per-category base search terms so a Pexels search has a reasonable chance
// of returning something on-topic even when visualConcept is very specific
// (e.g. a particular candidate profile) rather than a literal scene
// description.
const CATEGORY_SEARCH_TERMS: Record<ContentCategory, string> = {
  RECRUITMENT: "call center office team professional",
  HUMAN_RESOURCES: "human resources office meeting team",
  EMPLOYEE_WELLBEING: "happy office team wellbeing workplace",
};

function buildStockSearchQuery(category: ContentCategory, visualConcept: string): string {
  const base = CATEGORY_SEARCH_TERMS[category];
  const concept = visualConcept.split(/[.,;\n]/)[0]?.trim().slice(0, 60);
  return concept ? `${base} ${concept}` : base;
}

// Free AI image models still reliably distort faces/hands, and no amount of
// prompt tuning fixes that — so rather than chasing "better" people, this
// fallback (used only when Pexels has no key or no match) excludes people
// entirely. That guarantees the distortion problem can't happen, by
// construction, instead of just making it less likely.
function buildFallbackPrompt(visualConcept: string): string {
  return `${visualConcept} Bright, modern, professional office setting — empty of people. Focus on the physical space: desks, workstations, meeting rooms, plants, natural light, branding elements, laptops, or architectural details. No people, no human figures, no hands, no faces anywhere in the image. Professional corporate photography style, sharp focus, realistic, high quality.`;
}

export type GenerateFlyerOptionsInput = {
  photoMode: "real" | "generated";
  realImageId?: string;
  category: ContentCategory;
  visualConcept: string;
  headline: string;
  badge?: string;
  highlights: string[];
  cta: string;
  hashtags: string[];
  uploadedById: string;
  groupTag: string;
};

export type GenerateFlyerOptionsResult = {
  sourceImageId: string;
  optionImageIds: string[];
  staleImageIds: string[];
};

// Produces OPTIONS_PER_GENERATION differently-styled flyer composites from
// the same underlying photo, so a user can pick their favorite look rather
// than being stuck with whatever the AI/template happened to produce. Shared
// by both the initial generation flow and the "regenerate flyer" action on an
// existing publication.
export async function generateFlyerOptions(
  input: GenerateFlyerOptionsInput,
): Promise<GenerateFlyerOptionsResult> {
  const brand = await getBrandProfile();

  // Capture the previous batch (if any) BEFORE creating the new one, both so
  // callers can delete it afterward (no accumulation across regenerations)
  // and so we know which styles were just shown (to avoid re-picking the
  // exact same combination this time).
  const staleImages = await listImages({ tag: input.groupTag });
  const staleImageIds = staleImages.map((image) => image.id);
  const previousStyles = staleImages
    .flatMap((image) => image.tags)
    .map((tag) => tag.match(/^flyer-style-(\d+)$/)?.[1])
    .filter((n): n is string => n !== undefined)
    .map(Number);

  let sourceImageId: string;
  let photoBuffer: Buffer;

  if (input.photoMode === "real" && input.realImageId) {
    sourceImageId = input.realImageId;
    const sourceImage = await getImageById(input.realImageId);
    photoBuffer = await imageUrlToBuffer(sourceImage?.url ?? "");
  } else {
    const stockQuery = buildStockSearchQuery(input.category, input.visualConcept);
    const stockPhoto = await searchStockPhoto(stockQuery);

    if (stockPhoto) {
      const savedSource = await createInlineImage({
        url: `data:${stockPhoto.mimeType};base64,${stockPhoto.buffer.toString("base64")}`,
        filename: "stock-source-photo.jpg",
        uploadedById: input.uploadedById,
        tags: ["stock-photo", "source-photo"],
      });
      sourceImageId = savedSource.id;
      photoBuffer = stockPhoto.buffer;
    } else {
      const generated = await generateImage(buildFallbackPrompt(input.visualConcept));
      const savedSource = await createInlineImage({
        url: `data:${generated.mimeType};base64,${generated.buffer.toString("base64")}`,
        filename: "generated-source-photo.jpg",
        uploadedById: input.uploadedById,
        tags: ["ai-generated", "source-photo"],
      });
      sourceImageId = savedSource.id;
      photoBuffer = generated.buffer;
    }
  }

  // Deterministic, offline per-photo personalization: an accent color pulled
  // from the actual photo (falling back to the brand gold for neutral/gray
  // shots) and whichever half of the photo is visually calmest, so text
  // lands away from the busiest part of the image instead of always
  // assuming the top. No AI call, so no added quota risk or latency.
  const photoAnalysis = await analyzePhoto(photoBuffer);

  const styles = pickStyles(previousStyles);
  const optionImageIds: string[] = [];
  for (const style of styles) {
    const flyerBuffer = await renderFlyer({
      photoBuffer,
      headline: input.headline,
      badge: input.badge,
      highlights: input.highlights,
      cta: input.cta,
      hashtags: input.hashtags,
      colorPrimary: brand.colorPrimary,
      colorAccent: photoAnalysis.accentColor,
      textZone: photoAnalysis.textZone,
      style,
    });
    const image = await createInlineImage({
      url: `data:image/jpeg;base64,${flyerBuffer.toString("base64")}`,
      filename: `flyer-style-${style}.jpeg`,
      uploadedById: input.uploadedById,
      tags: ["branded-flyer", `flyer-style-${style}`, input.groupTag],
    });
    optionImageIds.push(image.id);
  }

  return { sourceImageId, optionImageIds, staleImageIds };
}
