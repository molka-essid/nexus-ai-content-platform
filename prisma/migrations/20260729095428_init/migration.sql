-- CreateEnum
CREATE TYPE "Role" AS ENUM ('EDITOR', 'VALIDATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('FACEBOOK', 'LINKEDIN', 'INSTAGRAM', 'TIKTOK');

-- CreateEnum
CREATE TYPE "PublicationStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ContentCategory" AS ENUM ('RECRUITMENT', 'HUMAN_RESOURCES', 'EMPLOYEE_WELLBEING');

-- CreateEnum
CREATE TYPE "AIRequestType" AS ENUM ('PUBLICATION', 'CALENDAR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'EDITOR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT 'ALTA Services',
    "slogan" TEXT,
    "logoUrl" TEXT,
    "colorPrimary" TEXT NOT NULL DEFAULT '#0B2545',
    "colorAccent" TEXT NOT NULL DEFAULT '#F2A93B',
    "colorBackground" TEXT NOT NULL DEFAULT '#EAF1FB',
    "toneGuidelines" TEXT,
    "communicationGuidelines" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Image" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "altText" TEXT,
    "tags" TEXT[],
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Image_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publication" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "hook" TEXT NOT NULL,
    "caption" TEXT NOT NULL,
    "cta" TEXT NOT NULL,
    "hashtags" TEXT[],
    "category" "ContentCategory" NOT NULL,
    "objective" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "visualConcept" TEXT NOT NULL,
    "status" "PublicationStatus" NOT NULL DEFAULT 'DRAFT',
    "imageId" TEXT,
    "createdById" TEXT NOT NULL,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformVariant" (
    "id" TEXT NOT NULL,
    "publicationId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "caption" TEXT NOT NULL,
    "hashtags" TEXT[],
    "cta" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarWeek" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "theme" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarWeek_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CalendarSlot" (
    "id" TEXT NOT NULL,
    "calendarWeekId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "platform" "Platform" NOT NULL,
    "category" "ContentCategory" NOT NULL,
    "objective" TEXT NOT NULL,
    "publicationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CalendarSlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIGenerationLog" (
    "id" TEXT NOT NULL,
    "requestType" "AIRequestType" NOT NULL,
    "inputParams" JSONB NOT NULL,
    "rawResponse" JSONB NOT NULL,
    "publicationId" TEXT,
    "requestedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIGenerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Image_uploadedById_idx" ON "Image"("uploadedById");

-- CreateIndex
CREATE INDEX "Publication_status_idx" ON "Publication"("status");

-- CreateIndex
CREATE INDEX "Publication_category_idx" ON "Publication"("category");

-- CreateIndex
CREATE INDEX "Publication_createdById_idx" ON "Publication"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "PlatformVariant_publicationId_platform_key" ON "PlatformVariant"("publicationId", "platform");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarWeek_weekStart_key" ON "CalendarWeek"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "CalendarSlot_publicationId_key" ON "CalendarSlot"("publicationId");

-- CreateIndex
CREATE INDEX "CalendarSlot_calendarWeekId_idx" ON "CalendarSlot"("calendarWeekId");

-- CreateIndex
CREATE INDEX "AIGenerationLog_publicationId_idx" ON "AIGenerationLog"("publicationId");

-- AddForeignKey
ALTER TABLE "Image" ADD CONSTRAINT "Image_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformVariant" ADD CONSTRAINT "PlatformVariant_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSlot" ADD CONSTRAINT "CalendarSlot_calendarWeekId_fkey" FOREIGN KEY ("calendarWeekId") REFERENCES "CalendarWeek"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CalendarSlot" ADD CONSTRAINT "CalendarSlot_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIGenerationLog" ADD CONSTRAINT "AIGenerationLog_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "Publication"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIGenerationLog" ADD CONSTRAINT "AIGenerationLog_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
