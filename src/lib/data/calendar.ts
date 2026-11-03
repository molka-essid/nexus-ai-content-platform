import { prisma } from "@/lib/db/prisma";
import { PublicationStatus, type Platform, type ContentCategory } from "@prisma/client";
import type { GenerateCalendarInput, CalendarGeneration } from "@/lib/ai/schemas";

const slotInclude = {
  publication: { select: { id: true, title: true, status: true, imageId: true } },
} as const;

// Powers the month-grid calendar view: every slot scheduled in a date range,
// regardless of whether it came from an AI week-batch generation or was
// added ad-hoc by clicking a date on the board.
export async function listCalendarSlotsInRange(start: Date, end: Date) {
  return prisma.calendarSlot.findMany({
    where: { scheduledDate: { gte: start, lte: end } },
    include: slotInclude,
    orderBy: { scheduledDate: "asc" },
  });
}

export type CalendarSlotWithPublication = Awaited<ReturnType<typeof listCalendarSlotsInRange>>[number];

export async function createCalendarSlot(input: {
  scheduledDate: Date;
  platform: Platform;
  category: ContentCategory;
  objective: string;
  publicationId?: string;
  calendarWeekId?: string;
}) {
  return prisma.$transaction(async (tx) => {
    const slot = await tx.calendarSlot.create({
      data: {
        scheduledDate: input.scheduledDate,
        platform: input.platform,
        category: input.category,
        objective: input.objective,
        publicationId: input.publicationId,
        calendarWeekId: input.calendarWeekId,
      },
      include: slotInclude,
    });

    if (input.publicationId) {
      await tx.publication.updateMany({
        where: { id: input.publicationId, status: PublicationStatus.DRAFT },
        data: { status: PublicationStatus.SCHEDULED },
      });
    }

    return slot;
  });
}

// Reschedules a slot to a new date and/or reassigns which publication it
// holds — the operation a calendar drag-and-drop move calls. Never touches
// the underlying Publication rows beyond the auto DRAFT->SCHEDULED bump.
export async function updateCalendarSlot(
  id: string,
  input: { scheduledDate?: Date; publicationId?: string | null },
) {
  return prisma.$transaction(async (tx) => {
    const slot = await tx.calendarSlot.update({
      where: { id },
      data: {
        ...(input.scheduledDate ? { scheduledDate: input.scheduledDate } : {}),
        ...(input.publicationId !== undefined ? { publicationId: input.publicationId } : {}),
      },
      include: slotInclude,
    });

    if (input.publicationId) {
      await tx.publication.updateMany({
        where: { id: input.publicationId, status: PublicationStatus.DRAFT },
        data: { status: PublicationStatus.SCHEDULED },
      });
    }

    return slot;
  });
}

// Detaches a slot from the calendar. Never cascades into deleting the
// underlying Publication — that has its own delete flow.
export async function deleteCalendarSlot(id: string) {
  await prisma.calendarSlot.delete({ where: { id } });
}

const calendarWeekInclude = {
  slots: { include: slotInclude, orderBy: { scheduledDate: "asc" } },
} as const;

// Powers the persistent Weekly Plan Overview page (`/calendar/weeks/[id]`) —
// the durable destination a generated week's "Review" links to, so it
// survives refresh/back/bookmark instead of living only in wizard memory.
export async function getCalendarWeekById(id: string) {
  return prisma.calendarWeek.findUnique({ where: { id }, include: calendarWeekInclude });
}

export type CalendarWeekWithSlots = NonNullable<Awaited<ReturnType<typeof getCalendarWeekById>>>;

// Powers the "Weekly Plans" list page — every batch-generated week, newest first.
export async function listCalendarWeeks() {
  return prisma.calendarWeek.findMany({
    include: calendarWeekInclude,
    orderBy: { weekStart: "desc" },
  });
}

// Given a publication that may or may not belong to a batch-generated week,
// returns its sibling publications (for Previous/Next navigation) and its
// position among them, or null if it isn't part of a week at all.
export async function getPublicationWeekContext(publicationId: string) {
  const slot = await prisma.calendarSlot.findUnique({
    where: { publicationId },
    select: { calendarWeekId: true },
  });
  if (!slot?.calendarWeekId) return null;

  const week = await getCalendarWeekById(slot.calendarWeekId);
  if (!week) return null;

  const siblings = week.slots
    .filter((s) => s.publication)
    .map((s) => ({
      id: s.publication!.id,
      title: s.publication!.title,
      status: s.publication!.status,
      scheduledDate: s.scheduledDate,
    }));

  const currentIndex = siblings.findIndex((s) => s.id === publicationId);
  if (currentIndex === -1) return null;

  return { weekId: week.id, weekStart: week.weekStart, siblings, currentIndex };
}

export type PublicationWeekContext = NonNullable<
  Awaited<ReturnType<typeof getPublicationWeekContext>>
>;

export async function createCalendarFromGeneration(
  input: GenerateCalendarInput,
  generation: CalendarGeneration,
  createdById: string,
) {
  const weekStart = new Date(input.weekStart);

  return prisma.$transaction(async (tx) => {
    // Find-or-create: generating a second batch for a week that already has
    // one (e.g. adding more posts, or retrying after a partial failure)
    // must add to it, not crash with a unique-constraint error on weekStart.
    const calendarWeek = await tx.calendarWeek.upsert({
      where: { weekStart },
      create: { weekStart, theme: generation.theme },
      update: {},
    });

    for (const slot of generation.slots) {
      const scheduledDate = new Date(weekStart);
      scheduledDate.setDate(scheduledDate.getDate() + slot.dayOfWeek);

      await tx.calendarSlot.create({
        data: {
          scheduledDate,
          platform: slot.platform,
          category: slot.category,
          objective: slot.objective,
          calendarWeek: { connect: { id: calendarWeek.id } },
          publication: {
            create: {
              title: slot.title,
              hook: slot.hook,
              caption: slot.caption,
              cta: slot.cta,
              hashtags: slot.hashtags,
              visualConcept: slot.visualConcept,
              category: slot.category,
              objective: slot.objective,
              audience: "General audience",
              tone: "Brand default",
              status: PublicationStatus.SCHEDULED,
              autoPublish: input.autoPublish ?? false,
              createdById,
              variants: {
                create: [
                  {
                    platform: slot.platform,
                    caption: slot.caption,
                    hashtags: slot.hashtags,
                    cta: slot.cta,
                  },
                ],
              },
            },
          },
        },
      });
    }

    return tx.calendarWeek.findUniqueOrThrow({
      where: { id: calendarWeek.id },
      include: { slots: { include: slotInclude, orderBy: { scheduledDate: "asc" } } },
    });
  });
}
