"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function DeletePublicationButton({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!confirm(`Supprimer "${title}" ? Cette action est irréversible.`)) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/publications/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      toast.success("Publication supprimée.");
      router.refresh();
    } catch {
      toast.error("Échec de la suppression de la publication.");
      setIsDeleting(false);
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={handleDelete}
      disabled={isDeleting}
      aria-label="Supprimer la publication"
      className="text-muted-foreground hover:text-destructive"
    >
      <Trash2 className="size-3.5" />
    </Button>
  );
}
