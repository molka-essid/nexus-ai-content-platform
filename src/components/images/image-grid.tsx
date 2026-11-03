"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { Image as ImageRecord } from "@prisma/client";

export function ImageGrid({ images }: { images: ImageRecord[] }) {
  const [editing, setEditing] = useState<ImageRecord | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {images.map((image) => (
          <div
            key={image.id}
            className="group relative aspect-square overflow-hidden rounded-xl border bg-muted shadow-sm transition-shadow hover:shadow-md"
          >
            <Image
              src={image.url}
              alt={image.altText ?? image.filename}
              fill
              sizes="200px"
              className="object-cover"
            />
            <div className="absolute inset-0 flex items-end justify-end gap-1 bg-black/0 p-2 opacity-0 transition-opacity group-hover:bg-black/30 group-hover:opacity-100">
              <Button size="icon" variant="secondary" onClick={() => setEditing(image)}>
                <Pencil className="size-4" />
              </Button>
            </div>
            {image.tags.length > 0 ? (
              <div className="absolute bottom-1 left-1 flex flex-wrap gap-1">
                {image.tags.slice(0, 2).map((tag) => (
                  <Badge key={tag} variant="secondary" className="bg-white/90">
                    {tag}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {editing ? (
        <EditImageDialog image={editing} onClose={() => setEditing(null)} />
      ) : null}
    </>
  );
}

function EditImageDialog({
  image,
  onClose,
}: {
  image: ImageRecord;
  onClose: () => void;
}) {
  const router = useRouter();
  const [altText, setAltText] = useState(image.altText ?? "");
  const [tags, setTags] = useState(image.tags.join(", "));
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/images/${image.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          altText: altText || null,
          tags: tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });
      if (!response.ok) throw new Error();
      toast.success("Image mise à jour.");
      router.refresh();
      onClose();
    } catch {
      toast.error("Échec de la mise à jour de l'image.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Supprimer cette image ? Cette action est irréversible.")) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/images/${image.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      toast.success("Image supprimée.");
      router.refresh();
      onClose();
    } catch {
      toast.error("Échec de la suppression de l'image.");
      setIsDeleting(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{image.filename}</DialogTitle>
        </DialogHeader>
        <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
          <Image src={image.url} alt={image.altText ?? image.filename} fill className="object-contain" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="alt-text">Description</Label>
          <Input id="alt-text" value={altText} onChange={(e) => setAltText(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tags">Étiquettes (séparées par des virgules)</Label>
          <Input id="tags" value={tags} onChange={(e) => setTags(e.target.value)} />
        </div>
        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={handleDelete} disabled={isDeleting} className="text-destructive">
            <Trash2 className="size-4" />
            Supprimer
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Enregistrement…" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
