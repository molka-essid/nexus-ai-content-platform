"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, ImageIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Image as ImageRecord } from "@prisma/client";

export type PickedImage = { id: string; url: string };

export function ImagePicker({
  value,
  onChange,
  disabled,
}: {
  value: PickedImage | null;
  onChange: (image: PickedImage | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetching is triggered from the click handler (a user event) rather than
  // an effect keyed on `open`, so the dialog's data loads exactly once per
  // open instead of a render->effect->setState cascade.
  async function handleOpen() {
    setOpen(true);
    setIsLoading(true);
    try {
      // Composited flyers have text baked in for a specific publication and
      // were never meant to be reusable as a "real photo" source elsewhere —
      // excluded server-side so their (large, base64-inline) payloads are
      // never even fetched for this picker.
      const response = await fetch("/api/images?excludeTag=branded-flyer");
      const data: ImageRecord[] = await response.json();
      setImages(data);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative inline-block">
          <div className="relative size-24 overflow-hidden rounded-lg border">
            <Image src={value.url} alt="Selected" fill className="object-cover" />
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onChange(null)}
            className="absolute -right-2 -top-2 rounded-full border bg-background p-1 shadow disabled:opacity-50"
            aria-label="Retirer l'image"
          >
            <X className="size-3" />
          </button>
        </div>
      ) : null}

      <Button type="button" variant="outline" size="sm" onClick={handleOpen} disabled={disabled}>
        <ImageIcon className="size-4" />
        {value ? "Changer l'image" : "Attacher une image"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sélectionner une image</DialogTitle>
          </DialogHeader>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : images.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Aucune image téléversée pour l&apos;instant. Téléversez-en depuis la page Images.
            </p>
          ) : (
            <div className="grid max-h-[28rem] grid-cols-3 gap-4 overflow-y-auto p-1 sm:grid-cols-4">
              {images.map((image) => {
                const isSelected = value?.id === image.id;
                return (
                  <button
                    key={image.id}
                    type="button"
                    onClick={() => {
                      onChange({ id: image.id, url: image.url });
                      setOpen(false);
                    }}
                    className={`group relative aspect-square overflow-hidden rounded-xl border-2 shadow-sm transition-all duration-150 ${
                      isSelected
                        ? "border-brand-primary ring-2 ring-brand-primary/30"
                        : "border-transparent hover:scale-[1.03] hover:border-brand-primary/40"
                    }`}
                  >
                    <Image
                      src={image.url}
                      alt={image.altText ?? image.filename}
                      fill
                      className="object-cover"
                    />
                    {isSelected ? (
                      <span className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-brand-primary text-white shadow">
                        <Check className="size-3.5" />
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
