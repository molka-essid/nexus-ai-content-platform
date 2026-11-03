"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  isWeekend,
  format,
} from "date-fns";
import { fr } from "date-fns/locale";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, Loader2, Maximize2, Minimize2, Plus, Rows3 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { GeneratePublicationForm } from "@/components/publications/generate-publication-form";
import { statusConfig } from "@/components/publications/status-badge";
import { PLATFORM_CONFIG } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import type { CalendarSlotWithPublication } from "@/lib/data/calendar";
import type { PublicationStatus } from "@prisma/client";

type Slot = Omit<CalendarSlotWithPublication, "scheduledDate" | "createdAt" | "updatedAt"> & {
  scheduledDate: Date;
};

function normalize(raw: Omit<CalendarSlotWithPublication, "scheduledDate"> & { scheduledDate: string | Date }): Slot {
  return { ...raw, scheduledDate: new Date(raw.scheduledDate) };
}

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DATE_KEY_FORMAT = "yyyy-MM-dd";
const MAX_VISIBLE_CHIPS = 3;

// A Radix Dialog centers its content with a transform, which makes freeform
// drag-resize fight the anchor point — a 3-state size toggle gives "make it
// bigger/smaller" without that jank, closer to how Linear/Notion-style
// dialogs handle this.
type DialogSize = "compact" | "large" | "fullscreen";
const DIALOG_SIZE_CLASSES: Record<DialogSize, string> = {
  compact: "sm:max-w-2xl max-h-[85vh]",
  large: "sm:max-w-4xl max-h-[90vh]",
  fullscreen: "sm:max-w-[96vw] w-[96vw] h-[92vh] max-h-[92vh]",
};
const DIALOG_SIZE_OPTIONS: { value: DialogSize; label: string; Icon: typeof Minimize2 }[] = [
  { value: "compact", label: "Compact", Icon: Minimize2 },
  { value: "large", label: "Grand", Icon: Rows3 },
  { value: "fullscreen", label: "Plein écran", Icon: Maximize2 },
];

export function CalendarBoard({
  initialSlots,
  initialMonth,
}: {
  initialSlots: CalendarSlotWithPublication[];
  initialMonth: string;
}) {
  const router = useRouter();
  const [month, setMonth] = useState(() => new Date(initialMonth));
  const [slots, setSlots] = useState<Slot[]>(() => initialSlots.map(normalize));
  const [isLoading, setIsLoading] = useState(false);
  const [dialogDate, setDialogDate] = useState<string | null>(null);
  const [dialogSize, setDialogSize] = useState<DialogSize>("compact");
  const [activeId, setActiveId] = useState<string | null>(null);

  const gridStart = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
  const days = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart, gridEnd]);

  const fetchRange = useCallback(async (start: Date, end: Date) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ start: start.toISOString(), end: end.toISOString() });
      const response = await fetch(`/api/calendar?${params}`);
      if (!response.ok) throw new Error();
      const data: CalendarSlotWithPublication[] = await response.json();
      setSlots(data.map(normalize));
    } catch {
      toast.error("Échec du chargement du calendrier.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  function goToMonth(next: Date) {
    setMonth(next);
    fetchRange(startOfWeek(startOfMonth(next), { weekStartsOn: 1 }), endOfWeek(endOfMonth(next), { weekStartsOn: 1 }));
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const activeSlot = activeId ? slots.find((s) => s.id === activeId) : undefined;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const slotId = String(event.active.id);
    const targetDateKey = event.over ? String(event.over.id) : undefined;
    if (!targetDateKey) return;

    const slot = slots.find((s) => s.id === slotId);
    if (!slot || format(slot.scheduledDate, DATE_KEY_FORMAT) === targetDateKey) return;

    const previousSlots = slots;
    setSlots((prev) =>
      prev.map((s) => (s.id === slotId ? { ...s, scheduledDate: new Date(targetDateKey) } : s)),
    );
    try {
      const response = await fetch(`/api/calendar/slots/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledDate: targetDateKey }),
      });
      if (!response.ok) throw new Error();
    } catch {
      toast.error("Échec de la reprogrammation.");
      setSlots(previousSlots);
    }
  }

  function slotsForDay(day: Date) {
    return slots.filter((s) => isSameDay(s.scheduledDate, day));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="font-heading text-xl font-semibold tracking-tight">{format(month, "MMMM yyyy", { locale: fr })}</h2>
          {isLoading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => goToMonth(new Date())}>
            Aujourd&apos;hui
          </Button>
          <Button variant="ghost" size="icon" onClick={() => goToMonth(subMonths(month, 1))} aria-label="Mois précédent">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => goToMonth(addMonths(month, 1))} aria-label="Mois suivant">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      <DndContext id="calendar-dnd" sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <motion.div
          key={format(month, "yyyy-MM")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="overflow-hidden rounded-xl border bg-card shadow-sm"
        >
          <div className="grid grid-cols-7 border-b bg-gradient-to-b from-muted/60 to-muted/30 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {WEEKDAYS.map((day, i) => (
              <div key={day} className={cn("px-3 py-2.5", i >= 5 && "text-muted-foreground/60")}>
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => (
              <DayCell
                key={day.toISOString()}
                day={day}
                inMonth={isSameMonth(day, month)}
                slots={slotsForDay(day)}
                onAdd={() => setDialogDate(format(day, DATE_KEY_FORMAT))}
                onOpenPublication={(id) => router.push(`/publications/${id}`)}
              />
            ))}
          </div>
        </motion.div>

        <DragOverlay dropAnimation={{ duration: 150, easing: "ease" }}>
          {activeSlot ? <ChipContent slot={activeSlot} floating /> : null}
        </DragOverlay>
      </DndContext>

      <Dialog open={dialogDate !== null} onOpenChange={(open) => !open && setDialogDate(null)}>
        <DialogContent
          className={cn(
            "flex flex-col gap-0 overflow-hidden p-0 transition-[max-width,width,height] duration-200",
            DIALOG_SIZE_CLASSES[dialogSize],
          )}
        >
          {/* Header is pinned outside the scroll area — resizing/scrolling the
              form body must never carry the title/size-toggle out of view. */}
          <DialogHeader className="shrink-0 flex-row items-center justify-between gap-2 space-y-0 border-b p-4 pr-10">
            <DialogTitle>
              {dialogDate ? `Nouvelle publication — ${format(new Date(dialogDate), "d MMMM yyyy", { locale: fr })}` : "Nouvelle publication"}
            </DialogTitle>
            <div className="flex shrink-0 gap-0.5 rounded-lg border bg-muted/40 p-0.5">
              {DIALOG_SIZE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  title={option.label}
                  aria-label={option.label}
                  onClick={() => setDialogSize(option.value)}
                  className={cn(
                    "flex size-6 items-center justify-center rounded-md transition-colors",
                    dialogSize === option.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <option.Icon className="size-3.5" />
                </button>
              ))}
            </div>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {dialogDate ? (
              <GeneratePublicationForm
                defaultDate={dialogDate}
                onSuccess={() => {
                  setDialogDate(null);
                  fetchRange(gridStart, gridEnd);
                }}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DayCell({
  day,
  inMonth,
  slots,
  onAdd,
  onOpenPublication,
}: {
  day: Date;
  inMonth: boolean;
  slots: Slot[];
  onAdd: () => void;
  onOpenPublication: (id: string) => void;
}) {
  const dateKey = format(day, DATE_KEY_FORMAT);
  const { setNodeRef, isOver } = useDroppable({ id: dateKey });
  const today = isToday(day);
  const weekend = isWeekend(day);
  const visible = slots.slice(0, MAX_VISIBLE_CHIPS);
  const overflow = slots.length - visible.length;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "group relative flex min-h-28 flex-col gap-1 border-b border-r p-1.5 transition-colors last:border-r-0",
        !inMonth && "bg-muted/20",
        inMonth && weekend && "bg-muted/10",
        today && "bg-brand-accent/[0.07]",
        isOver && "bg-brand-primary/10 ring-2 ring-inset ring-brand-primary/40",
      )}
    >
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-xs font-semibold transition-colors",
            today
              ? "bg-brand-primary text-white shadow-sm"
              : inMonth
                ? "text-foreground"
                : "text-muted-foreground/50",
          )}
        >
          {format(day, "d")}
        </span>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-md p-0.5 text-muted-foreground opacity-0 transition-opacity hover:bg-muted hover:text-foreground group-hover:opacity-100"
          aria-label="Ajouter une publication"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {visible.map((slot) => (
          <SlotChip
            key={slot.id}
            slot={slot}
            onOpen={() => slot.publication && onOpenPublication(slot.publication.id)}
          />
        ))}
        {overflow > 0 ? (
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="rounded-md px-1.5 py-0.5 text-left text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                +{overflow} de plus
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <p className="mb-1 px-0.5 text-xs font-medium text-muted-foreground">
                {format(day, "EEEE d MMMM", { locale: fr })}
              </p>
              <div className="flex flex-col gap-1">
                {slots.map((slot) => (
                  <SlotChip
                    key={slot.id}
                    slot={slot}
                    onOpen={() => slot.publication && onOpenPublication(slot.publication.id)}
                  />
                ))}
              </div>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>
    </div>
  );
}

function ChipContent({ slot, floating }: { slot: Slot; floating?: boolean }) {
  const status: PublicationStatus = slot.publication?.status ?? "DRAFT";
  const config = statusConfig[status];
  const PlatformIcon = PLATFORM_CONFIG[slot.platform].Icon;

  return (
    <div
      className={cn(
        "relative flex items-center gap-1.5 overflow-hidden rounded-md border py-1 pr-1.5 pl-2.5 text-left text-[11px] font-medium",
        config.className,
        floating && "w-44 shadow-lg",
      )}
    >
      <span className={cn("absolute inset-y-0.5 left-0.5 w-1 rounded-full", config.dotClassName)} />
      <PlatformIcon className="size-3 shrink-0" style={{ color: PLATFORM_CONFIG[slot.platform].color }} />
      <span className="truncate">{slot.publication?.title ?? slot.objective}</span>
    </div>
  );
}

function SlotChip({ slot, onOpen }: { slot: Slot; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: slot.id });

  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      {...attributes}
      onClick={onOpen}
      className={cn(
        "transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md",
        isDragging && "opacity-30",
      )}
    >
      <ChipContent slot={slot} />
    </button>
  );
}
