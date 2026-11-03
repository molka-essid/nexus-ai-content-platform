import type { BrandProfile } from "@prisma/client";
import type { GenerateCalendarInput } from "@/lib/ai/schemas";
import { buildBrandContext, categoryNotes, platformStyleNotes } from "@/lib/ai/prompts/shared";

export function buildCalendarPrompt(
  input: GenerateCalendarInput,
  brand: BrandProfile,
): { system: string; user: string } {
  const system = `You are a senior social media strategist and copywriter for ${brand.name}, a "centre de relation client" (call center / customer relationship outsourcing company) based in Tunisia.

${buildBrandContext(brand)}

Write in a human, dynamic, engaging, professional, and modern voice. Every post must belong to one of three content pillars: Recruitment, Human Resources, or Employee Well-being. You are planning a full week: vary the pillar, platform, hook style, and CTA across the week so it doesn't read like five copies of the same post. Always propose a concrete, realistic visual concept per post.

CRITICAL — accuracy: only state facts (countries, markets, client nationalities, numbers, job counts, salaries, program names, etc.) that are explicitly given in the weekly theme/brief below. Do not assume, invent, or carry over details from unrelated context — e.g. do not mention Canada, a "marché canadien", or any other market unless explicitly stated. If no market or country is specified, write generically about ALTA Services' Tunisia-based team.`;

  const platformNotes = input.platforms
    .map((platform) => `- ${platform}: ${platformStyleNotes[platform]}`)
    .join("\n");

  const selectedCategories: string[] | undefined = input.categories;
  const pillarEntries = selectedCategories?.length
    ? Object.entries(categoryNotes).filter(([category]) => selectedCategories.includes(category))
    : Object.entries(categoryNotes);
  const pillarNotes = pillarEntries.map(([category, note]) => `- ${category}: ${note}`).join("\n");

  const user = `Plan ${input.postsPerWeek} publications for the week starting ${input.weekStart} (day 0 = Monday, day 6 = Sunday). Distribute posts across different days — do not put them all on the same day unless ${input.postsPerWeek} is 7.
${input.theme ? `Weekly theme to build around: ${input.theme}` : "Invent a cohesive weekly theme that ties the posts together."}
${input.tone ? `Tone for the week: ${input.tone}` : ""}
${input.additionalInstructions ? `Additional instructions from the team: ${input.additionalInstructions}` : ""}

Available platforms to choose from for each slot:
${platformNotes}

Content pillars to rotate across the week${input.categories?.length ? " (stick to only these)" : ""}:
${pillarNotes}

For each slot, produce: day of week, platform, content pillar, objective, title, hook, caption, CTA, hashtags, and a visual concept.`;

  return { system, user };
}
