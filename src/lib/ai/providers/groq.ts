import "server-only";
import type { z } from "zod";
import { env } from "@/lib/env";
import { toJsonSchema } from "@/lib/ai/to-json-schema";
import { ProviderQuotaExceededError } from "@/lib/ai/quota-error";

// Groq returns reset windows as human-readable durations like "1m26.4s" or
// "205ms" (see x-ratelimit-reset-requests/x-ratelimit-reset-tokens headers,
// confirmed live against the real API) rather than a plain seconds count.
function parseGroqDuration(value: string): number | undefined {
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+(?:\.\d+)?)s)?(?:(\d+)ms)?$/);
  if (!match) return undefined;
  const [, h, m, s, ms] = match;
  const seconds = Number(h ?? 0) * 3600 + Number(m ?? 0) * 60 + Number(s ?? 0) + Number(ms ?? 0) / 1000;
  return seconds > 0 ? seconds : undefined;
}

// Groq: OpenAI-compatible chat API, generous free tier, no billing required
// (console.groq.com/keys). Kept as a fallback alongside Gemini so a single
// provider's daily free-tier quota running out doesn't block generation.
// If this model is ever retired, see console.groq.com/docs/models for the
// current free lineup.
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export async function generateJSONWithGroq(input: {
  system: string;
  user: string;
  schema: z.ZodType;
}): Promise<unknown> {
  if (!env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured.");
  }

  // Groq's JSON mode only guarantees syntactically valid JSON, not schema
  // conformance, so the schema is spelled out in the system prompt too. The
  // caller (generateJSON) re-validates against the real zod schema and
  // falls back to the next provider if this doesn't match.
  const schemaInstructions = `Respond with a single JSON object that strictly matches this JSON Schema, with no extra commentary or markdown fences:\n${JSON.stringify(toJsonSchema(input.schema))}`;

  const response = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: `${input.system}\n\n${schemaInstructions}` },
        { role: "user", content: input.user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      const retryAfterHeader = response.headers.get("retry-after");
      const retryAfterSeconds =
        (retryAfterHeader ? Number(retryAfterHeader) : undefined) ??
        parseGroqDuration(response.headers.get("x-ratelimit-reset-requests") ?? "") ??
        parseGroqDuration(response.headers.get("x-ratelimit-reset-tokens") ?? "");
      throw new ProviderQuotaExceededError("Groq quota exceeded", retryAfterSeconds);
    }
    const body = await response.text().catch(() => "");
    throw new Error(`Groq request failed with status ${response.status}: ${body}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Groq returned an empty response.");
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Groq did not return valid JSON.");
  }
}
