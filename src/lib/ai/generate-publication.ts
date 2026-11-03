import "server-only";
import { generateJSON } from "@/lib/ai/generate-json";
import { buildPublicationPrompt } from "@/lib/ai/prompts/publication";
import {
  publicationGenerationSchema,
  type GeneratePublicationInput,
  type PublicationGeneration,
} from "@/lib/ai/schemas";
import { getBrandProfile } from "@/lib/data/brand";
import { prisma } from "@/lib/db/prisma";
import { AIRequestType } from "@prisma/client";

const TOOL_NAME = "return_publication";
const TOOL_DESCRIPTION = "Return the generated publication in the required structured format.";

export async function generatePublication(
  input: GeneratePublicationInput,
  requestedById?: string,
): Promise<PublicationGeneration> {
  const brand = await getBrandProfile();
  const { system, user } = buildPublicationPrompt(input, brand);

  const generation = await generateJSON({
    system,
    user,
    schema: publicationGenerationSchema,
    toolName: TOOL_NAME,
    toolDescription: TOOL_DESCRIPTION,
    maxTokens: 4096,
  });

  // The AI is asked for one variant per selected platform, but faster
  // fallback models don't always comply — rather than hope, guarantee it:
  // every platform the user picked ends up with a real variant no matter
  // what the model actually returned, and any platform it invented outside
  // the selection is dropped. Backfilled variants reuse the canonical
  // caption/hashtags/CTA (on-topic, just not platform-tailored) — always
  // safe, unlike inventing a whole missing post would be.
  const requestedPlatforms = new Set(input.platforms);
  const coveredPlatforms = new Set(generation.variants.map((v) => v.platform));
  const variants = generation.variants.filter((v) => requestedPlatforms.has(v.platform));
  for (const platform of input.platforms) {
    if (!coveredPlatforms.has(platform)) {
      variants.push({
        platform,
        caption: generation.caption,
        hashtags: generation.hashtags,
        cta: generation.cta,
      });
    }
  }
  const completeGeneration: PublicationGeneration = { ...generation, variants };

  await prisma.aIGenerationLog.create({
    data: {
      requestType: AIRequestType.PUBLICATION,
      inputParams: input,
      rawResponse: completeGeneration,
      requestedById,
    },
  });

  return completeGeneration;
}
