"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ImageUploader() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFilesSelected(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    setIsUploading(true);
    let successCount = 0;

    for (const file of files) {
      try {
        const body = new FormData();
        body.append("file", file);
        const response = await fetch("/api/images", { method: "POST", body });
        if (!response.ok) throw new Error();
        successCount += 1;
      } catch {
        toast.error(`Échec du téléversement de ${file.name}.`);
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} image${successCount > 1 ? "s" : ""} téléversée${successCount > 1 ? "s" : ""}.`);
      router.refresh();
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={handleFilesSelected}
        className="hidden"
      />
      <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
        <Upload className="size-4" />
        {isUploading ? "Téléversement…" : "Téléverser des images"}
      </Button>
    </>
  );
}
