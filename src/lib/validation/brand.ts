import { z } from "zod";

const hexColor = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, "Doit être une couleur hexadécimale comme #0B2545");

export const brandProfileSchema = z.object({
  name: z.string().min(1).max(120),
  slogan: z.string().max(200).optional().nullable(),
  colorPrimary: hexColor,
  colorAccent: hexColor,
  colorBackground: hexColor,
  toneGuidelines: z.string().max(2000).optional().nullable(),
  communicationGuidelines: z.string().max(4000).optional().nullable(),
});

export type BrandProfileInput = z.infer<typeof brandProfileSchema>;
