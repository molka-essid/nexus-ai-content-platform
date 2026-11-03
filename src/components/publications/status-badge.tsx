import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { PublicationStatus } from "@prisma/client";

// Matches the calendar's color system: Draft (blue) -> Needs review (red) ->
// Scheduled (amber) -> Published (green). Used both on this badge and as the
// calendar tile accent color, so a publication's status reads identically
// everywhere in the app.
export const statusConfig: Record<PublicationStatus, { label: string; className: string; dotClassName: string }> = {
  DRAFT: {
    label: "Brouillon",
    className: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300",
    dotClassName: "bg-blue-500",
  },
  NEEDS_REVIEW: {
    label: "À valider",
    className: "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
    dotClassName: "bg-red-500",
  },
  SCHEDULED: {
    label: "Programmé",
    className:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
    dotClassName: "bg-amber-500",
  },
  PUBLISHED: {
    label: "Publié",
    className:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
    dotClassName: "bg-emerald-500",
  },
};

export function StatusBadge({ status }: { status: PublicationStatus }) {
  const config = statusConfig[status];
  return (
    <Badge variant="outline" className={cn("gap-1.5", config.className)}>
      <span className={cn("size-1.5 rounded-full", config.dotClassName)} />
      {config.label}
    </Badge>
  );
}
