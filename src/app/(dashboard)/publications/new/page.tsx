import { GeneratePublicationForm } from "@/components/publications/generate-publication-form";

export default function NewPublicationPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Nouvelle publication</h1>
        <p className="text-muted-foreground">
          Décrivez ce que vous voulez, choisissez une photo, et obtenez une publication de marque
          finalisée — légende, hashtags et versions adaptées à chaque plateforme — prête à valider.
        </p>
      </div>
      <GeneratePublicationForm />
    </div>
  );
}
