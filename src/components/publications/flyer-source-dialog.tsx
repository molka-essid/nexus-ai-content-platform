"use client";

import { useState } from "react";
import { Image as ImageIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ImagePicker, type PickedImage } from "@/components/images/image-picker";
import { cn } from "@/lib/utils";
import type { PhotoMode } from "@/lib/ai/schemas";

// The explicit "how should this flyer's photo come from" choice — shown
// whenever creating or recreating a flyer, so the user is never silently
// forced into whichever mode the publication happened to start with.
export function FlyerSourceDialog({
  open,
  onOpenChange,
  isSubmitting,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSubmitting: boolean;
  onConfirm: (input: { photoMode: PhotoMode; imageId?: string }) => void;
}) {
  const [photoMode, setPhotoMode] = useState<PhotoMode>("generated");
  const [image, setImage] = useState<PickedImage | null>(null);

  const canConfirm = photoMode === "generated" || Boolean(image);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer le flyer</DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setPhotoMode("generated")}
            className={cn(
              "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
              photoMode === "generated" ? "border-brand-primary bg-brand-primary/5" : "border-border hover:bg-muted",
            )}
          >
            <Sparkles className="size-5 text-brand-primary" />
            <span className="text-sm font-medium">Générer un visuel avec l&apos;IA</span>
            <span className="text-xs text-muted-foreground">Une vraie photo est sourcée automatiquement</span>
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => setPhotoMode("real")}
            className={cn(
              "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
              photoMode === "real" ? "border-brand-primary bg-brand-primary/5" : "border-border hover:bg-muted",
            )}
          >
            <ImageIcon className="size-5 text-brand-primary" />
            <span className="text-sm font-medium">Utiliser une photo existante de l&apos;entreprise</span>
            <span className="text-xs text-muted-foreground">Choisir parmi vos images téléversées</span>
          </button>
        </div>

        {photoMode === "real" ? (
          <div className="pt-1">
            <ImagePicker value={image} onChange={setImage} disabled={isSubmitting} />
          </div>
        ) : null}

        <DialogFooter>
          <Button
            onClick={() => onConfirm({ photoMode, imageId: image?.id })}
            disabled={!canConfirm || isSubmitting}
          >
            {isSubmitting ? "Conception…" : "Créer le flyer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
