// One-off connectivity check for the AI layer, bypassing the database
// entirely (uses a hardcoded brand profile instead of fetching one) and
// bypassing the "server-only" guarded provider module (which intentionally
// refuses to load outside Next's server bundler) by calling Gemini directly.
// Run with: npx tsx scripts/test-gemini.ts
import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { buildPublicationPrompt } from "../src/lib/ai/prompts/publication";
import { publicationGenerationSchema, type GeneratePublicationInput } from "../src/lib/ai/schemas";
import { toJsonSchema } from "../src/lib/ai/to-json-schema";
import type { BrandProfile } from "@prisma/client";

const mockBrand: BrandProfile = {
  id: "mock",
  name: "ALTA Services",
  slogan: "notre expertise la relation client",
  logoUrl: null,
  colorPrimary: "#0B2545",
  colorAccent: "#F2A93B",
  colorBackground: "#EAF1FB",
  toneGuidelines: "Human, dynamic, engaging, professional, modern.",
  communicationGuidelines:
    "Focus on Recruitment, Human Resources, and Employee Well-being.",
  createdAt: new Date(),
  updatedAt: new Date(),
};

const input: GeneratePublicationInput = {
  topic: "We're hiring bilingual customer advisors for our Tunis office",
  publicationType: "Job opening",
  category: "RECRUITMENT",
  photoMode: "generated",
  platforms: ["LINKEDIN", "FACEBOOK"],
};

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set in .env");

  const { system, user } = buildPublicationPrompt(input, mockBrand);
  const client = new GoogleGenAI({ apiKey });

  console.log("Calling Gemini...\n");
  const response = await client.models.generateContent({
    model: "gemini-2.5-flash",
    contents: user,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      responseJsonSchema: toJsonSchema(publicationGenerationSchema),
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned an empty response.");

  const parsed = publicationGenerationSchema.parse(JSON.parse(text));
  console.log(JSON.stringify(parsed, null, 2));
}

main().catch((error) => {
  console.error("FAILED:", error);
  process.exit(1);
});
