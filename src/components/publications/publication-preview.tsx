"use client";

import { motion } from "framer-motion";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { CalendarDays, Pencil, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, statusConfig } from "@/components/publications/status-badge";
import { PLATFORM_CONFIG } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import type { PublicationWithRelations } from "@/lib/data/publications";

// Shown immediately after generation (from both the calendar's "add a
// publication" dialog and the standalone /publications/new page) instead of
// redirecting away — the user reviews the actual result right here and
// decides what happens to it next, rather than hunting for it afterward.
export function PublicationPreview({
  publication,
  scheduledDate,
  isBusy,
  busyAction,
  onPublish,
  onSaveDraft,
  onEdit,
  onRegenerate,
  onCancel,
}: {
  publication: PublicationWithRelations;
  scheduledDate?: string;
  isBusy: boolean;
  busyAction?: "publish" | "draft" | "regenerate" | "cancel";
  onPublish: () => void;
  onSaveDraft: () => void;
  onEdit: () => void;
  onRegenerate: () => void;
  onCancel: () => void;
}) {
  const config = statusConfig[publication.status];
  const platforms = publication.variants.map((variant) => variant.platform);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="overflow-hidden rounded-xl border bg-card shadow-sm"
    >
      <div className={cn("h-1.5 w-full", config.dotClassName)} />

      <div className="grid gap-0 sm:grid-cols-2">
        <div className="flex items-center justify-center bg-muted p-3 sm:border-r">
          {publication.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={publication.image.url}
              alt={publication.title}
              className="max-h-80 w-auto rounded-lg object-contain shadow-sm"
            />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
              Aucune image
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={publication.status} />
            {platforms.map((platform) => {
              const platformConfig = PLATFORM_CONFIG[platform];
              return (
                <Badge key={platform} variant="outline" className="gap-1.5">
                  <platformConfig.Icon className="size-3" style={{ color: platformConfig.color }} />
                  {platformConfig.label}
                </Badge>
              );
            })}
          </div>

          {scheduledDate ? (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5" />
              Programmé pour le {format(new Date(scheduledDate), "EEEE d MMMM", { locale: fr })}
            </div>
          ) : null}

          <div className="space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-heading text-base font-semibold leading-snug">{publication.title}</h3>
              <Button variant="ghost" size="icon-sm" onClick={onEdit} aria-label="Modifier avant d'enregistrer" className="shrink-0">
                <Pencil className="size-3.5" />
              </Button>
            </div>
            <p className="line-clamp-4 text-sm text-muted-foreground">{publication.caption}</p>
          </div>

          {publication.hashtags.length > 0 ? (
            <p className="text-sm text-brand-primary">
              {publication.hashtags.map((tag) => (tag.startsWith("#") ? tag : `#${tag}`)).join(" ")}
            </p>
          ) : null}

          <p className="text-sm font-medium">{publication.cta}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/30 p-3">
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={isBusy}>
            <X className="size-3.5" />
            {busyAction === "cancel" ? "Suppression…" : "Annuler"}
          </Button>
          <Button variant="outline" size="sm" onClick={onRegenerate} disabled={isBusy}>
            <RotateCcw className="size-3.5" />
            {busyAction === "regenerate" ? "Régénération…" : "Régénérer"}
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onSaveDraft} disabled={isBusy}>
            {busyAction === "draft" ? "Enregistrement…" : "Enregistrer comme brouillon"}
          </Button>
          <Button size="sm" onClick={onPublish} disabled={isBusy}>
            {busyAction === "publish" ? "Publication…" : "Publier"}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
