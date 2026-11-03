import Link from "next/link";
import { notFound } from "next/navigation";
import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft } from "lucide-react";
import { getCalendarWeekById } from "@/lib/data/calendar";
import { WeeklyPlanBoard } from "@/components/calendar/weekly-plan-board";

export default async function CalendarWeekPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const week = await getCalendarWeekById(id);

  if (!week) {
    notFound();
  }

  const weekEnd = addDays(new Date(week.weekStart), 6);
  const rangeLabel = `${format(new Date(week.weekStart), "d MMM", { locale: fr })} – ${format(weekEnd, "d MMM yyyy", { locale: fr })}`;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/calendar/weeks"
          className="mb-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Tous les plans hebdomadaires
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">
          {week.theme ? week.theme : "Plan de contenu hebdomadaire"}
        </h1>
        <p className="text-muted-foreground">
          {rangeLabel} · {week.slots.length} publication{week.slots.length === 1 ? "" : "s"}
        </p>
      </div>

      <WeeklyPlanBoard week={week} />
    </div>
  );
}
