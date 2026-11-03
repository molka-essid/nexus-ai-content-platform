import type { BrandProfile } from "@prisma/client";

export const platformStyleNotes: Record<string, string> = {
  FACEBOOK: "Warm and community-toned, a bit more conversational, fine to be slightly longer.",
  LINKEDIN: "More polished and professional, positions ALTA Services as an employer of choice.",
  INSTAGRAM: "Casual, visual-first, short punchy sentences, emoji used sparingly but naturally.",
  TIKTOK: "Very casual, fast hook in the first line, speaks to a younger audience.",
};

export const categoryNotes: Record<string, string> = {
  RECRUITMENT: "Attracting candidates: open roles, why join ALTA, application process.",
  HUMAN_RESOURCES: "HR culture and processes: onboarding, training, career growth, policies.",
  EMPLOYEE_WELLBEING: "Team culture and well-being: events, recognition, work-life balance.",
};

export function buildBrandContext(brand: BrandProfile): string {
  const lines = [
    `Brand: ${brand.name}${brand.slogan ? ` — "${brand.slogan}"` : ""}.`,
    brand.toneGuidelines ? `Tone guidelines: ${brand.toneGuidelines}` : null,
    brand.communicationGuidelines
      ? `Communication guidelines: ${brand.communicationGuidelines}`
      : null,
  ].filter((line): line is string => Boolean(line));

  return lines.join("\n");
}
