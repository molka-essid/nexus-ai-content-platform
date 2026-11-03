import { prisma } from "@/lib/db/prisma";
import { deleteImage as deleteFromStorage } from "@/lib/storage/supabase";
import type { UpdateImageInput } from "@/lib/validation/image";

export async function listImages(filters: { tag?: string; excludeTag?: string } = {}) {
  return prisma.image.findMany({
    where: {
      ...(filters.tag ? { tags: { has: filters.tag } } : {}),
      ...(filters.excludeTag ? { NOT: { tags: { has: filters.excludeTag } } } : {}),
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getImageById(id: string) {
  return prisma.image.findUnique({ where: { id } });
}

export async function createImage(input: {
  url: string;
  storagePath: string;
  filename: string;
  uploadedById: string;
}) {
  return prisma.image.create({ data: input });
}

// Marks an image as stored inline (e.g. an AI-generated image kept as a data
// URL) rather than in Supabase Storage, so deleteImage knows not to attempt
// a storage-bucket deletion for it.
const INLINE_STORAGE_PATH = "inline:generated";

export async function createInlineImage(input: {
  url: string;
  filename: string;
  uploadedById: string;
  tags?: string[];
}) {
  return prisma.image.create({
    data: {
      url: input.url,
      filename: input.filename,
      storagePath: INLINE_STORAGE_PATH,
      uploadedById: input.uploadedById,
      tags: input.tags ?? [],
    },
  });
}

export async function updateImage(id: string, input: UpdateImageInput) {
  return prisma.image.update({ where: { id }, data: input });
}

export async function deleteImage(id: string) {
  const image = await prisma.image.findUnique({ where: { id } });
  if (!image) return;

  await prisma.image.delete({ where: { id } });
  if (image.storagePath !== INLINE_STORAGE_PATH) {
    await deleteFromStorage(image.storagePath);
  }
}
