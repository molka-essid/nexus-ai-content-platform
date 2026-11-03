import { z } from "zod";
import { platformSchema, contentCategorySchema } from "@/lib/ai/schemas";

export const platformVariantInputSchema = z.object({
  platform: platformSchema,
  caption: z.string().min(1),
  hashtags: z.array(z.string().min(1)).min(1).max(10),
  cta: z.string().min(1).max(200),
});

export const updatePublicationSchema = z.object({
  title: z.string().min(1).max(120),
  hook: z.string().min(1).max(300),
  caption: z.string().min(1),
  cta: z.string().min(1).max(200),
  hashtags: z.array(z.string().min(1)).min(1).max(10),
  visualConcept: z.string().min(1).max(600),
  category: contentCategorySchema,
  objective: z.string().min(1).max(300),
  audience: z.string().min(1).max(200),
  tone: z.string().min(1).max(100),
  variants: z.array(platformVariantInputSchema).min(1),
});
export type UpdatePublicationInput = z.infer<typeof updatePublicationSchema>;
