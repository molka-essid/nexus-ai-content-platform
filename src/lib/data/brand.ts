import { prisma } from "@/lib/db/prisma";
import type { BrandProfileInput } from "@/lib/validation/brand";

// BrandProfile is a singleton at the application layer: there is always
// exactly one row, created on first read if it doesn't exist yet.
export async function getBrandProfile() {
  const existing = await prisma.brandProfile.findFirst();
  if (existing) return existing;

  return prisma.brandProfile.create({ data: {} });
}

export async function updateBrandProfile(input: BrandProfileInput) {
  const current = await getBrandProfile();
  return prisma.brandProfile.update({
    where: { id: current.id },
    data: input,
  });
}

export async function updateBrandLogo(logoUrl: string) {
  const current = await getBrandProfile();
  return prisma.brandProfile.update({
    where: { id: current.id },
    data: { logoUrl },
  });
}
