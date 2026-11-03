-- AlterTable
ALTER TABLE "Publication" ADD COLUMN     "sourceImageId" TEXT;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_sourceImageId_fkey" FOREIGN KEY ("sourceImageId") REFERENCES "Image"("id") ON DELETE SET NULL ON UPDATE CASCADE;
