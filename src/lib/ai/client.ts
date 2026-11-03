import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { env } from "@/lib/env";

// Balance of writing quality and cost for marketing copy generation.
export const CLAUDE_MODEL = "claude-sonnet-5";

let anthropicClient: Anthropic | null = null;

// Lazy: constructing this eagerly at module load would throw whenever
// ANTHROPIC_API_KEY is unset, even for deployments running purely on Gemini.
export function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    if (!env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured, but AI_PROVIDER=anthropic.");
    }
    anthropicClient = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}
