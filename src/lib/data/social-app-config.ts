import { prisma } from "@/lib/db/prisma";

// Singleton at the application layer, same pattern as BrandProfile.
export async function getSocialAppConfig() {
  const existing = await prisma.socialAppConfig.findFirst();
  if (existing) return existing;

  return prisma.socialAppConfig.create({ data: {} });
}

export async function updateSocialAppConfig(input: {
  metaAppId?: string | null;
  metaAppSecret?: string | null;
  instagramAppId?: string | null;
  instagramAppSecret?: string | null;
  tiktokClientKey?: string | null;
  tiktokClientSecret?: string | null;
  linkedinClientId?: string | null;
  linkedinClientSecret?: string | null;
}) {
  const current = await getSocialAppConfig();
  return prisma.socialAppConfig.update({
    where: { id: current.id },
    data: input,
  });
}
