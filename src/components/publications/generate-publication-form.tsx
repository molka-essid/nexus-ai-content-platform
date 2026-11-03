"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Image as ImageIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { generatePublicationInputSchema, type PhotoMode } from "@/lib/ai/schemas";
import { ImagePicker, type PickedImage } from "@/components/images/image-picker";
import { PLATFORM_LIST, PLATFORM_CONFIG } from "@/lib/platforms";
import { PublicationPreview } from "@/components/publications/publication-preview";
import type { PublicationWithRelations } from "@/lib/data/publications";
import type { Platform } from "@prisma/client";

const categoryOptions = [
  { value: "RECRUITMENT", label: "Recrutement" },
  { value: "HUMAN_RESOURCES", label: "Ressources humaines" },
  { value: "EMPLOYEE_WELLBEING", label: "Bien-être des employés" },
] as const;

type FormState = {
  topic: string;
  publicationType: string;
  category: (typeof categoryOptions)[number]["value"];
  platforms: Platform[];
  tone: string;
  audience: string;
  objective: string;
};

const initialState: FormState = {
  topic: "",
  publicationType: "",
  category: "RECRUITMENT",
  platforms: ["LINKEDIN", "FACEBOOK"],
  tone: "",
  audience: "",
  objective: "",
};

type BusyAction = "publish" | "draft" | "regenerate" | "cancel" | undefined;

export function GeneratePublicationForm({
  defaultDate,
  onSuccess,
}: {
  /** ISO date (yyyy-MM-dd) to pin the new publication onto the calendar, e.g. when opened from a date click. */
  defaultDate?: string;
  /** Called once the user confirms (Publish or Save as draft) instead of the default navigate-to-detail-page behavior, e.g. to close a dialog and refresh a calendar view. */
  onSuccess?: (publicationId: string) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [photoMode, setPhotoMode] = useState<PhotoMode>("real");
  const [image, setImage] = useState<PickedImage | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [publication, setPublication] = useState<PublicationWithRelations | null>(null);
  const [busyAction, setBusyAction] = useState<BusyAction>();

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function togglePlatform(platform: Platform) {
    setForm((prev) => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter((p) => p !== platform)
        : [...prev.platforms, platform],
    }));
  }

  const missingPhoto = photoMode === "real" && !image;

  async function generate() {
    const parsed = generatePublicationInputSchema.safeParse({
      ...form,
      tone: form.tone || undefined,
      audience: form.audience || undefined,
      objective: form.objective || undefined,
      photoMode,
      imageId: photoMode === "real" ? image?.id : undefined,
      scheduledDate: defaultDate,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Veuillez vérifier le formulaire.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-publication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ?? "Échec de la génération.");
      }

      const created: PublicationWithRelations = await response.json();
      setPublication(created);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de la génération de la publication. Veuillez réessayer.");
    } finally {
      setIsGenerating(false);
    }
  }

  // Discards a not-yet-confirmed publication (used by both Cancel and
  // Regenerate) — also removes its calendar slot, since deleting a
  // Publication only nulls the slot's foreign key rather than removing the
  // now-empty slot itself.
  async function discardTentativePublication(target: PublicationWithRelations) {
    if (target.calendarSlot) {
      await fetch(`/api/calendar/slots/${target.calendarSlot.id}`, { method: "DELETE" }).catch(() => {});
    }
    await fetch(`/api/publications/${target.id}`, { method: "DELETE" }).catch(() => {});
  }

  async function handleCancel() {
    if (!publication) return;
    setBusyAction("cancel");
    try {
      await discardTentativePublication(publication);
      setPublication(null);
    } finally {
      setBusyAction(undefined);
    }
  }

  async function handleRegenerate() {
    if (!publication) return;
    setBusyAction("regenerate");
    try {
      await discardTentativePublication(publication);
      setPublication(null);
      await generate();
    } finally {
      setBusyAction(undefined);
    }
  }

  function finish(id: string) {
    if (onSuccess) {
      onSuccess(id);
    } else {
      router.push(`/publications/${id}`);
    }
  }

  async function handleSaveDraft() {
    if (!publication) return;
    finish(publication.id);
  }

  async function handlePublish() {
    if (!publication) return;
    setBusyAction("publish");
    try {
      const response = await fetch(`/api/publications/${publication.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PUBLISHED" }),
      });
      if (!response.ok) throw new Error();
      finish(publication.id);
    } catch {
      toast.error("Échec de la publication.");
      setBusyAction(undefined);
    }
  }

  function handleEdit() {
    if (!publication) return;
    router.push(`/publications/${publication.id}`);
  }

  if (publication) {
    return (
      <PublicationPreview
        publication={publication}
        scheduledDate={defaultDate}
        isBusy={busyAction !== undefined}
        busyAction={busyAction}
        onPublish={handlePublish}
        onSaveDraft={handleSaveDraft}
        onEdit={handleEdit}
        onRegenerate={handleRegenerate}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Générer une publication</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="topic">De quoi parle cette publication ?</Label>
          <Textarea
            id="topic"
            rows={3}
            placeholder="ex. Nous recrutons des conseillers clientèle bilingues pour notre bureau de Tunis"
            value={form.topic}
            onChange={(e) => update("topic", e.target.value)}
            disabled={isGenerating}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="publication-type">Type de publication</Label>
            <Input
              id="publication-type"
              placeholder="ex. Offre d'emploi, Portrait d'équipe, Conseil bien-être"
              value={form.publicationType}
              onChange={(e) => update("publicationType", e.target.value)}
              disabled={isGenerating}
            />
          </div>
          <div className="space-y-2">
            <Label>Pilier de contenu</Label>
            <Select
              value={form.category}
              onValueChange={(value) => update("category", value as FormState["category"])}
              disabled={isGenerating}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categoryOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Plateformes</Label>
          <div className="flex flex-wrap gap-2">
            {PLATFORM_LIST.map((platform) => {
              const config = PLATFORM_CONFIG[platform];
              const isSelected = form.platforms.includes(platform);
              return (
                <button
                  key={platform}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => togglePlatform(platform)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                    isSelected
                      ? "border-brand-primary bg-brand-primary text-white"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  <config.Icon className="size-3.5" style={!isSelected ? { color: config.color } : undefined} />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 rounded-lg border p-4">
          <Label>Photo</Label>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => setPhotoMode("real")}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                photoMode === "real"
                  ? "border-brand-primary bg-brand-primary/5"
                  : "border-border hover:bg-muted",
              )}
            >
              <ImageIcon className="size-5 text-brand-primary" />
              <span className="text-sm font-medium">Utiliser une vraie photo</span>
              <span className="text-xs text-muted-foreground">
                Choisir parmi vos photos d&apos;entreprise téléversées
              </span>
            </button>
            <button
              type="button"
              disabled={isGenerating}
              onClick={() => setPhotoMode("generated")}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                photoMode === "generated"
                  ? "border-brand-primary bg-brand-primary/5"
                  : "border-border hover:bg-muted",
              )}
            >
              <Sparkles className="size-5 text-brand-primary" />
              <span className="text-sm font-medium">Générer une photo</span>
              <span className="text-xs text-muted-foreground">
                Une vraie photo est sourcée automatiquement pour correspondre
              </span>
            </button>
          </div>

          {photoMode === "real" ? (
            <div className="pt-1">
              <ImagePicker value={image} onChange={setImage} />
              {missingPhoto ? (
                <p className="mt-2 text-sm text-destructive">Choisissez une photo pour continuer.</p>
              ) : null}
            </div>
          ) : (
            <p className="pt-1 text-sm text-muted-foreground">
              Une photo sera sourcée automatiquement et transformée en flyer de marque.
            </p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="tone">Ton (optionnel)</Label>
            <Input
              id="tone"
              placeholder="Par défaut, le ton de la marque"
              value={form.tone}
              onChange={(e) => update("tone", e.target.value)}
              disabled={isGenerating}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="audience">Public cible (optionnel)</Label>
            <Input
              id="audience"
              placeholder="ex. Candidats bilingues en Tunisie"
              value={form.audience}
              onChange={(e) => update("audience", e.target.value)}
              disabled={isGenerating}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="objective">Objectif (optionnel)</Label>
          <Input
            id="objective"
            placeholder="ex. Générer des candidatures avant la date limite"
            value={form.objective}
            onChange={(e) => update("objective", e.target.value)}
            disabled={isGenerating}
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={generate}
            disabled={
              isGenerating ||
              !form.topic ||
              !form.publicationType ||
              form.platforms.length === 0 ||
              missingPhoto
            }
          >
            {isGenerating ? "Génération…" : "Générer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
