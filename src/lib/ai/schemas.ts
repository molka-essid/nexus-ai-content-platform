import { z } from "zod";

export const platformSchema = z.enum(["FACEBOOK", "LINKEDIN", "INSTAGRAM", "TIKTOK"]);
export const contentCategorySchema = z.enum([
  "RECRUITMENT",
  "HUMAN_RESOURCES",
  "EMPLOYEE_WELLBEING",
]);

// --- Inputs: the "AI Configuration" params a user picks before generating ---

export const photoModeSchema = z.enum(["real", "generated"]);
export type PhotoMode = z.infer<typeof photoModeSchema>;

export const generatePublicationInputSchema = z
  .object({
    topic: z.string().min(3).max(500),
    publicationType: z.string().min(1).max(100),
    category: contentCategorySchema,
    platforms: z.array(platformSchema).min(1),
    tone: z.string().max(100).optional(),
    audience: z.string().max(200).optional(),
    objective: z.string().max(300).optional(),
    photoMode: photoModeSchema,
    imageId: z.string().min(1).optional(),
    // Set when generated from the calendar (clicking a date to create a
    // publication) — pins the new publication onto that date once created.
    scheduledDate: z.string().date().optional(),
    // Set when regenerating a post from within a Weekly Plan Overview page —
    // keeps the fresh slot grouped under the same CalendarWeek instead of
    // becoming an ungrouped one-off pinned only by date.
    calendarWeekId: z.string().min(1).optional(),
  })
  .refine((data) => data.photoMode !== "real" || Boolean(data.imageId), {
    message: "Choisissez une photo dans la galerie, ou passez sur « Générer une photo ».",
    path: ["imageId"],
  });
export type GeneratePublicationInput = z.infer<typeof generatePublicationInputSchema>;

export const generateCalendarInputSchema = z
  .object({
    weekStart: z.string().date(),
    theme: z.string().max(200).optional(),
    platforms: z.array(platformSchema).min(1),
    postsPerWeek: z.number().int().min(1).max(7).default(5),
    categories: z.array(contentCategorySchema).min(1).optional(),
    tone: z.string().max(100).optional(),
    additionalInstructions: z.string().max(500).optional(),
    // The flyer-source choice is made ONCE for the whole week here, instead
    // of asking again on every one of the week's publications afterward.
    flyerPhotoMode: photoModeSchema.optional(),
    flyerImageId: z.string().min(1).optional(),
    // Applied to every publication created in this batch.
    autoPublish: z.boolean().optional(),
  })
  .refine((data) => data.flyerPhotoMode !== "real" || Boolean(data.flyerImageId), {
    message: "Choisissez une photo dans la galerie, ou passez sur « Générer une photo ».",
    path: ["flyerImageId"],
  });
export type GenerateCalendarInput = z.infer<typeof generateCalendarInputSchema>;

// --- Outputs: what Claude must return, via tool-use structured output ---

export const platformVariantGenerationSchema = z.object({
  platform: platformSchema,
  caption: z.string().min(1),
  hashtags: z.array(z.string().min(1)).min(3).max(10),
  cta: z.string().min(1),
});
export type PlatformVariantGeneration = z.infer<typeof platformVariantGenerationSchema>;

export const publicationGenerationSchema = z.object({
  title: z.string().min(1).max(120),
  hook: z.string().min(1).max(300),
  caption: z.string().min(1),
  cta: z.string().min(1).max(200),
  hashtags: z.array(z.string().min(1)).min(3).max(10),
  visualConcept: z.string().min(1).max(800),
  // Short, punchy bullet points for the flyer's content section — e.g. what
  // the reader gets, key details, or highlights. Written like ad copy, not
  // full sentences (max ~50 chars each so they fit a flyer layout).
  highlights: z.array(z.string().min(1).max(60)).min(3).max(5),
  // A very short (2-5 word) standout detail for a small badge near the
  // headline — e.g. a number, a deadline, a location. Optional because not
  // every post has one obvious standout detail.
  badge: z.string().min(1).max(40).optional(),
  variants: z.array(platformVariantGenerationSchema).min(1),
});
export type PublicationGeneration = z.infer<typeof publicationGenerationSchema>;

export const calendarSlotGenerationSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  platform: platformSchema,
  category: contentCategorySchema,
  objective: z.string().min(1).max(300),
  title: z.string().min(1).max(120),
  hook: z.string().min(1).max(300),
  caption: z.string().min(1),
  cta: z.string().min(1).max(200),
  hashtags: z.array(z.string().min(1)).min(3).max(10),
  visualConcept: z.string().min(1).max(800),
});
export type CalendarSlotGeneration = z.infer<typeof calendarSlotGenerationSchema>;

export const calendarGenerationSchema = z.object({
  theme: z.string().min(1).max(200),
  slots: z.array(calendarSlotGenerationSchema).min(1).max(7),
});
export type CalendarGeneration = z.infer<typeof calendarGenerationSchema>;
