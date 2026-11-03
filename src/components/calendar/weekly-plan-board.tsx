"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { ImageOff, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/publications/status-badge";
import { PLATFORM_CONFIG } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import type { CalendarWeekWithSlots } from "@/lib/data/calendar";

// The day-by-day list for a Weekly Plan Overview page. This is the permanent
// home for the Open/Regenerate/Remove actions that used to live only in the
// generation wizard's ephemeral in-memory "Review" step.
export function WeeklyPlanBoard({ week }: { week: CalendarWeekWithSlots }) {
  const router = useRouter();
  const [slots, setSlots] = useState(week.slots);
  const [busySlotId, setBusySlotId] = useState<string | null>(null);

  async function handleRemoveSlot(slotId: string) {
    setBusySlotId(slotId);
    try {
      const response = await fetch(`/api/calendar/slots/${slotId}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
      toast.success("Retiré de la semaine.");
    } catch {
      toast.error("Échec du retrait.");
    } finally {
      setBusySlotId(null);
    }
  }

  // Discards this slot's post entirely and generates a fresh one for the
  // same date/platform/pillar, re-attached to this same week (calendarWeekId)
  // so it doesn't silently disappear from this overview.
  async function handleRegenerateSlot(slot: (typeof slots)[number]) {
    setBusySlotId(slot.id);
    try {
      await fetch(`/api/calendar/slots/${slot.id}`, { method: "DELETE" });
      if (slot.publication) {
        await fetch(`/api/publications/${slot.publication.id}`, { method: "DELETE" });
      }
      const response = await fetch("/api/ai/generate-publication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: week.theme || `${slot.objective} pour ${format(new Date(slot.scheduledDate), "EEEE", { locale: fr })}`,
          // publicationType is capped at 100 chars — the full text belongs in
          // `objective` below, which the generator already prefers when set.
          publicationType: slot.objective.slice(0, 100),
          category: slot.category,
          platforms: [slot.platform],
          photoMode: "generated",
          objective: slot.objective,
          scheduledDate: format(new Date(slot.scheduledDate), "yyyy-MM-dd"),
          calendarWeekId: week.id,
        }),
      });
      if (!response.ok) throw new Error();
      toast.success("Régénéré.");
      router.refresh();
    } catch {
      toast.error("Échec de la régénération de cette publication.");
    } finally {
      setBusySlotId(null);
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {slots.map((slot) => {
        const platformConfig = PLATFORM_CONFIG[slot.platform];
        const isBusy = busySlotId === slot.id;
        return (
          <Card key={slot.id} className={cn(isBusy && "opacity-60")}>
            <CardContent className="space-y-2.5 pt-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <platformConfig.Icon className="size-3.5" style={{ color: platformConfig.color }} />
                  {platformConfig.label} · {format(new Date(slot.scheduledDate), "EEEE d MMM", { locale: fr })}
                </span>
                {slot.publication ? <StatusBadge status={slot.publication.status} /> : null}
              </div>
              <p className="line-clamp-2 text-sm font-medium">
                {slot.publication?.title ?? slot.objective}
              </p>
              {slot.publication && !slot.publication.imageId ? (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ImageOff className="size-3.5" />
                  Pas encore de flyer
                </span>
              ) : null}
              <div className="flex items-center justify-between pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!slot.publication}
                  onClick={() => slot.publication && router.push(`/publications/${slot.publication.id}`)}
                >
                  Ouvrir
                </Button>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    disabled={isBusy}
                    onClick={() => handleRegenerateSlot(slot)}
                    aria-label="Régénérer cette publication"
                  >
                    <Sparkles className="size-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    disabled={isBusy}
                    onClick={() => handleRemoveSlot(slot.id)}
                    aria-label="Retirer de la semaine"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
