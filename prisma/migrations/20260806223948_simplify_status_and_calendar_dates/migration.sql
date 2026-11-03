-- Simplify PublicationStatus for a single-user workflow (no more
-- multi-person review/approval), and give CalendarSlot a real date instead
-- of deriving it from a parent week + day offset.

-- 1. Remap PublicationStatus: IN_REVIEW -> NEEDS_REVIEW (self-flag, no
-- longer "sent to someone else"), APPROVED -> SCHEDULED, REJECTED -> DRAFT
-- (back to the drawing board), DRAFT/PUBLISHED unchanged.
BEGIN;
CREATE TYPE "PublicationStatus_new" AS ENUM ('DRAFT', 'NEEDS_REVIEW', 'SCHEDULED', 'PUBLISHED');
ALTER TABLE "Publication" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Publication" ALTER COLUMN "status" TYPE "PublicationStatus_new" USING (
  CASE "status"::text
    WHEN 'IN_REVIEW' THEN 'NEEDS_REVIEW'
    WHEN 'APPROVED' THEN 'SCHEDULED'
    WHEN 'REJECTED' THEN 'DRAFT'
    ELSE "status"::text
  END
)::"PublicationStatus_new";
ALTER TYPE "PublicationStatus" RENAME TO "PublicationStatus_old";
ALTER TYPE "PublicationStatus_new" RENAME TO "PublicationStatus";
DROP TYPE "PublicationStatus_old";
ALTER TABLE "Publication" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- 2. Drop the multi-person review fields on Publication.
ALTER TABLE "Publication" DROP CONSTRAINT IF EXISTS "Publication_reviewedById_fkey";
ALTER TABLE "Publication" DROP COLUMN IF EXISTS "reviewedById";
ALTER TABLE "Publication" DROP COLUMN IF EXISTS "reviewedAt";
ALTER TABLE "Publication" DROP COLUMN IF EXISTS "reviewNote";

-- 3. Give CalendarSlot a real scheduledDate, backfilled from its current
-- week + day-of-week for existing rows, then drop the now-redundant
-- dayOfWeek column and make calendarWeekId optional (ad-hoc slots created
-- directly on the calendar won't belong to an AI-generated week).
ALTER TABLE "CalendarSlot" ADD COLUMN "scheduledDate" TIMESTAMP(3);

UPDATE "CalendarSlot" cs
SET "scheduledDate" = cw."weekStart" + (cs."dayOfWeek" * INTERVAL '1 day')
FROM "CalendarWeek" cw
WHERE cw.id = cs."calendarWeekId";

ALTER TABLE "CalendarSlot" ALTER COLUMN "scheduledDate" SET NOT NULL;
ALTER TABLE "CalendarSlot" DROP COLUMN "dayOfWeek";
ALTER TABLE "CalendarSlot" ALTER COLUMN "calendarWeekId" DROP NOT NULL;

CREATE INDEX "CalendarSlot_scheduledDate_idx" ON "CalendarSlot"("scheduledDate");
