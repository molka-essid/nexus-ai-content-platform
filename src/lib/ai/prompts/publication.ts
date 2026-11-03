import type { BrandProfile } from "@prisma/client";
import type { GeneratePublicationInput } from "@/lib/ai/schemas";
import { buildBrandContext, categoryNotes, platformStyleNotes } from "@/lib/ai/prompts/shared";

export function buildPublicationPrompt(
  input: GeneratePublicationInput,
  brand: BrandProfile,
): { system: string; user: string } {
  const system = `You are a senior social media copywriter for ${brand.name}, a "centre de relation client" (call center / customer relationship outsourcing company) based in Tunisia.

${buildBrandContext(brand)}

Write in a human, dynamic, engaging, professional, and modern voice — never corporate-stiff, never generic AI filler. Content must fall into one of three pillars: Recruitment, Human Resources, or Employee Well-being. Always propose a concrete, realistic visual concept that could be photographed at a real office (not stock-photo generic) — keep it to 2-3 sentences, written as a plain scene description suitable as a prompt for an image generator (no camera jargon, no markdown).

CRITICAL — accuracy: only state facts (countries, markets, client nationalities, numbers, job counts, salaries, program names, etc.) that are explicitly given in the topic/brief below. Do not assume, invent, or carry over details from unrelated context — e.g. do not mention Canada, a "marché canadien", or any other market unless the brief below explicitly says so. If the brief doesn't specify a market or country, write generically about ALTA Services' Tunisia-based team without naming a client market.`;

  const platformNotes = input.platforms
    .map((platform) => `- ${platform}: ${platformStyleNotes[platform]}`)
    .join("\n");

  const user = `Generate one publication.

Topic / brief: ${input.topic}
Publication type: ${input.publicationType}
Content pillar: ${input.category} (${categoryNotes[input.category]})
${input.objective ? `Objective: ${input.objective}` : ""}
${input.audience ? `Target audience: ${input.audience}` : ""}
${input.tone ? `Tone for this post specifically: ${input.tone}` : "Use the brand's default tone."}

Produce a canonical title, hook, caption, CTA, hashtags, and visual concept, then adapt it into a platform variant for each of the following platforms:
${platformNotes}

Also produce, for use in a printed/graphic flyer version of this post:
- highlights: 3-5 short punchy bullet points (max ~50 characters each, no trailing punctuation) — concrete details a reader would scan quickly (what's on offer, what's involved, why it matters). Write them like ad copy, not full sentences.
- badge (optional): a very short 2-5 word standout detail worth calling out near the headline (a number, a deadline, a location, a format) — only include it if the brief actually gives you something concrete to highlight; omit it otherwise rather than inventing one.

Each platform variant's caption, hashtags, and CTA should feel native to that platform, not a copy-paste of the canonical caption.`;

  return { system, user };
}
