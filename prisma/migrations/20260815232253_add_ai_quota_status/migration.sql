-- CreateTable
CREATE TABLE "AiQuotaStatus" (
    "id" TEXT NOT NULL,
    "blockedUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiQuotaStatus_pkey" PRIMARY KEY ("id")
);
