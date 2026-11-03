import { z } from "zod";

export const updateImageSchema = z.object({
  altText: z.string().max(200).nullable().optional(),
  tags: z.array(z.string().min(1).max(40)).max(20).optional(),
});
export type UpdateImageInput = z.infer<typeof updateImageSchema>;
