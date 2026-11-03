import { ImageIcon } from "lucide-react";
import { ImageUploader } from "@/components/images/image-uploader";
import { ImageGrid } from "@/components/images/image-grid";
import { listImages } from "@/lib/data/images";

export default async function ImagesPage() {
  const images = await listImages();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Images</h1>
          <p className="text-muted-foreground">
            Téléversez et organisez les photos de l&apos;entreprise, puis attachez-les aux publications.
          </p>
        </div>
        <ImageUploader />
      </div>

      {images.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <ImageIcon className="size-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Aucune image pour l&apos;instant</p>
            <p className="text-sm text-muted-foreground">Téléversez votre première photo pour commencer.</p>
          </div>
        </div>
      ) : (
        <ImageGrid images={images} />
      )}
    </div>
  );
}
