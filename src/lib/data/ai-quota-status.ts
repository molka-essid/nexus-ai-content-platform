import { prisma } from "@/lib/db/prisma";

const SINGLETON_ID = "singleton";

export async function getAiQuotaStatus(): Promise<{ blockedUntil: Date | null }> {
  const row = await prisma.aiQuotaStatus.findUnique({ where: { id: SINGLETON_ID } });
  return { blockedUntil: row?.blockedUntil ?? null };
}

export async function setAiQuotaBlockedUntil(blockedUntil: Date): Promise<void> {
  await prisma.aiQuotaStatus.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, blockedUntil },
    update: { blockedUntil },
  });
}

export async function clearAiQuotaBlocked(): Promise<void> {
  await prisma.aiQuotaStatus.upsert({
    where: { id: SINGLETON_ID },
    create: { id: SINGLETON_ID, blockedUntil: null },
    update: { blockedUntil: null },
  });
}
