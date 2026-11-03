import "server-only";
import { GoogleGenAI, ApiError } from "@google/genai";
import type { z } from "zod";
import { env } from "@/lib/env";
import { toJsonSchema } from "@/lib/ai/to-json-schema";
import { ProviderQuotaExceededError } from "@/lib/ai/quota-error";

// Google's ApiError.message is the raw error body stringified — it doesn't
// give us a typed field, but a RESOURCE_EXHAUSTED error's `details` array
// usually includes a RetryInfo entry like {"retryDelay":"36s"}, so this is
// a best-effort extraction, not a guaranteed value.
function extractRetryDelaySeconds(message: string): number | undefined {
  const match = message.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  return match ? Number(match[1]) : undefined;
}

// Fast, free-tier-eligible model. Note: this project's API key only has
// nonzero free-tier quota on this specific model (confirmed by testing
// gemini-2.5-flash-lite, gemini-2.0-flash, and gemini-2.5-pro, which all
// return a 0-quota or "not available to new users" error on this key) — so
// switching models is not a workaround for exhausting this one's daily cap.
const GEMINI_MODEL = "gemini-2.5-flash";

let geminiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!geminiClient) {
    if (!env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured, but AI_PROVIDER=gemini.");
    }
    geminiClient = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
  }
  return geminiClient;
}

export async function generateJSONWithGemini(input: {
  system: string;
  user: string;
  schema: z.ZodType;
}): Promise<unknown> {
  let response;
  try {
    response = await getGeminiClient().models.generateContent({
      model: GEMINI_MODEL,
      contents: input.user,
      config: {
        systemInstruction: input.system,
        responseMimeType: "application/json",
        responseJsonSchema: toJsonSchema(input.schema),
      },
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 429) {
      throw new ProviderQuotaExceededError(
        "Gemini quota exceeded",
        extractRetryDelaySeconds(error.message),
      );
    }
    throw error;
  }

  const text = response.text;
  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Gemini did not return valid JSON.");
  }
}
