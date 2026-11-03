import "server-only";
import type { z } from "zod";
import { env } from "@/lib/env";
import { generateJSONWithAnthropic } from "@/lib/ai/providers/anthropic";
import { generateJSONWithGemini } from "@/lib/ai/providers/gemini";
import { generateJSONWithGroq } from "@/lib/ai/providers/groq";
import { ProviderQuotaExceededError } from "@/lib/ai/quota-error";
import { getAiQuotaStatus, setAiQuotaBlockedUntil, clearAiQuotaBlocked } from "@/lib/data/ai-quota-status";

type Provider = "gemini" | "groq" | "anthropic";

// The free providers try in this order before falling back to each other.
const FREE_PRIORITY: Provider[] = ["gemini", "groq"];

function configuredKey(provider: Provider): string | undefined {
  if (provider === "gemini") return env.GEMINI_API_KEY;
  if (provider === "groq") return env.GROQ_API_KEY;
  return env.ANTHROPIC_API_KEY;
}

// Anthropic (paid) is only ever attempted when it's explicitly chosen as
// AI_PROVIDER — otherwise, once the free providers are both quota-exhausted,
// generateJSON throws ProviderQuotaExceededError instead of silently
// spending on the paid key.
function buildProviderChain(): Provider[] {
  const preferred = env.AI_PROVIDER as Provider;
  const ordered: Provider[] = preferred === "anthropic" ? ["anthropic", ...FREE_PRIORITY] : [preferred, ...FREE_PRIORITY];
  const seen = new Set<Provider>();
  return ordered.filter((provider) => {
    if (seen.has(provider) || !configuredKey(provider)) return false;
    seen.add(provider);
    return true;
  });
}

async function callProvider(provider: Provider, input: GenerateJSONInput): Promise<unknown> {
  if (provider === "gemini") return generateJSONWithGemini(input);
  if (provider === "groq") return generateJSONWithGroq(input);
  return generateJSONWithAnthropic(input);
}

type GenerateJSONInput = {
  system: string;
  user: string;
  schema: z.ZodType;
  toolName: string;
  toolDescription: string;
  maxTokens: number;
  // Checked after the zod schema passes, for input-dependent business rules
  // a static schema can't express (e.g. "must have a variant for every
  // platform the user selected"). Return a string describing what's wrong
  // to fail this attempt (moving on to the next provider, same as a schema
  // mismatch); return true/undefined to accept it.
  validate?: (parsed: unknown) => string | true;
};

// Tries each configured provider in turn, validating the result against the
// real zod schema (and the optional business-rule `validate`) each time. A
// provider that's out of quota, down, returns malformed JSON, or doesn't
// respect the caller's constraints just gets skipped in favor of the next
// one — the caller only ever sees a failure if every configured provider
// failed every check.
export async function generateJSON<T>(
  input: GenerateJSONInput & { schema: z.ZodType<T> },
): Promise<T> {
  const chain = buildProviderChain();
  if (chain.length === 0) {
    throw new Error(
      "No AI provider is configured. Set GEMINI_API_KEY, GROQ_API_KEY, or ANTHROPIC_API_KEY in .env.",
    );
  }

  // Skip straight to "come back later" if a previous call already found
  // every free provider exhausted and that cooldown hasn't passed yet —
  // avoids burning an attempt (and confirming the same thing again) when we
  // already know the answer.
  const status = await getAiQuotaStatus();
  if (status.blockedUntil && status.blockedUntil.getTime() > Date.now()) {
    throw new ProviderQuotaExceededError(
      "Toutes les capacités IA gratuites sont épuisées pour le moment.",
      Math.ceil((status.blockedUntil.getTime() - Date.now()) / 1000),
    );
  }

  const failures: string[] = [];
  const quotaRetrySeconds: number[] = [];
  let quotaFailureCount = 0;

  for (const provider of chain) {
    try {
      const raw = await callProvider(provider, input);
      const parsed = input.schema.safeParse(raw);
      if (!parsed.success) {
        throw new Error(`response didn't match the expected format (${parsed.error.issues[0]?.message})`);
      }
      if (input.validate) {
        const result = input.validate(parsed.data);
        if (result !== true) {
          throw new Error(result);
        }
      }
      if (status.blockedUntil) await clearAiQuotaBlocked();
      return parsed.data;
    } catch (error) {
      if (error instanceof ProviderQuotaExceededError) {
        quotaFailureCount += 1;
        if (error.retryAfterSeconds !== undefined) quotaRetrySeconds.push(error.retryAfterSeconds);
        console.error(`AI provider "${provider}" is out of quota, trying next provider if any`);
        failures.push(`${provider}: quota exceeded`);
        continue;
      }
      const message = error instanceof Error ? error.message : String(error);
      console.error(`AI provider "${provider}" failed, trying next provider if any:`, message);
      failures.push(`${provider}: ${message}`);
    }
  }

  // Every configured provider ran out of free quota — this is a distinct
  // case from a genuine failure (bad key, network error), so callers can
  // show a clear "come back later" state instead of a generic error.
  if (quotaFailureCount === chain.length) {
    // No provider gave us a retry timer (Gemini often doesn't) — default to
    // a 1-hour cooldown so the badge doesn't stay red indefinitely with no
    // information.
    const retryAfterSeconds = quotaRetrySeconds.length > 0 ? Math.min(...quotaRetrySeconds) : 3600;
    await setAiQuotaBlockedUntil(new Date(Date.now() + retryAfterSeconds * 1000));
    throw new ProviderQuotaExceededError(
      "Toutes les capacités IA gratuites sont épuisées pour le moment.",
      retryAfterSeconds,
    );
  }

  throw new Error(`All configured AI providers failed:\n${failures.join("\n")}`);
}
