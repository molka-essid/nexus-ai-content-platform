import { prisma } from "@/lib/db/prisma";
import type { Platform } from "@prisma/client";

export async function listSocialAccounts() {
  return prisma.socialAccount.findMany({ orderBy: { platform: "asc" } });
}

export async function getSocialAccount(platform: Platform) {
  return prisma.socialAccount.findUnique({ where: { platform } });
}

export async function upsertSocialAccount(input: {
  platform: Platform;
  externalAccountId: string;
  displayName?: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  connectedById: string;
}) {
  return prisma.socialAccount.upsert({
    where: { platform: input.platform },
    create: input,
    update: {
      externalAccountId: input.externalAccountId,
      displayName: input.displayName,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: input.expiresAt,
      connectedById: input.connectedById,
    },
  });
}

export async function deleteSocialAccount(platform: Platform) {
  await prisma.socialAccount.deleteMany({ where: { platform } });
}
