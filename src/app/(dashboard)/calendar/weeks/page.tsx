import Link from "next/link";
import { addDays, format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarRange, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { listCalendarWeeks } from "@/lib/data/calendar";
import { PublicationStatus } from "@prisma/client";

export default async function CalendarWeeksPage() {
  const weeks = await listCalendarWeeks();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Plans hebdomadaires</h1>
          <p className="text-muted-foreground">
            Lorsque vous générez une semaine thématique de publications, elle atterrit ici en tant
            que groupe — vous pouvez ainsi valider, modifier et suivre chaque publication de ce lot
            ensemble, au lieu de les chercher séparément dans Publications ou le calendrier.
          </p>
        </div>
        <Button asChild>
          <Link href="/calendar/new">
            <Plus className="size-4" />
            Générer une semaine
          </Link>
        </Button>
      </div>

      {weeks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <CalendarRange className="size-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium">Aucun plan hebdomadaire pour l&apos;instant</p>
              <p className="text-sm text-muted-foreground">
                Générez une semaine thématique pour la voir apparaître ici.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {weeks.map((week) => {
            const weekEnd = addDays(new Date(week.weekStart), 6);
            const rangeLabel = `${format(new Date(week.weekStart), "d MMM", { locale: fr })} – ${format(weekEnd, "d MMM yyyy", { locale: fr })}`;
            const publishedCount = week.slots.filter(
              (slot) => slot.publication?.status === PublicationStatus.PUBLISHED,
            ).length;

            return (
              <Link key={week.id} href={`/calendar/weeks/${week.id}`}>
                <Card className="h-full transition-colors hover:border-brand-primary/40">
                  <CardContent className="space-y-2 pt-6">
                    <span className="text-xs font-medium text-muted-foreground">{rangeLabel}</span>
                    <h2 className="font-heading text-lg font-semibold">
                      {week.theme || "Semaine sans titre"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {week.slots.length} publication{week.slots.length === 1 ? "" : "s"}
                      {publishedCount > 0 ? ` · ${publishedCount} publiée${publishedCount === 1 ? "" : "s"}` : ""}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
