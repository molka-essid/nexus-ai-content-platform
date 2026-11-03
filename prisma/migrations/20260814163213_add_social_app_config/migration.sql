-- CreateTable
CREATE TABLE "SocialAppConfig" (
    "id" TEXT NOT NULL,
    "metaAppId" TEXT,
    "metaAppSecret" TEXT,
    "tiktokClientKey" TEXT,
    "tiktokClientSecret" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SocialAppConfig_pkey" PRIMARY KEY ("id")
);
