import "server-only";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_STORAGE_BUCKET: z.string().min(1),
  AUTH_SECRET: z.string().min(1),
  // Preferred LLM for content generation. Any of ANTHROPIC_API_KEY/
  // GEMINI_API_KEY/GROQ_API_KEY that are actually set form a fallback chain
  // (see src/lib/ai/generate-json.ts) — AI_PROVIDER just picks which one is
  // tried first when more than one is configured.
  AI_PROVIDER: z.enum(["anthropic", "gemini", "groq"]).default("anthropic"),
  ANTHROPIC_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  // The app's own public URL (e.g. https://your-app.vercel.app) — required
  // for social OAuth redirect URIs and for building image links that
  // Instagram/TikTok's servers can fetch. Not needed for the rest of the
  // app, only for social account connection/publishing.
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  INSTAGRAM_APP_ID: z.string().optional(),
  INSTAGRAM_APP_SECRET: z.string().optional(),
  TIKTOK_CLIENT_KEY: z.string().optional(),
  TIKTOK_CLIENT_SECRET: z.string().optional(),
  LINKEDIN_CLIENT_ID: z.string().optional(),
  LINKEDIN_CLIENT_SECRET: z.string().optional(),
  // Set on Vercel; Vercel then auto-sends it as a Bearer token when
  // triggering /api/cron/auto-publish, which the route checks against.
  CRON_SECRET: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");
  throw new Error(
    `Invalid environment configuration. Check .env against .env.example:\n${issues}`,
  );
}

export const env = parsed.data;
