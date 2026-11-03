"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { StatusBadge, statusConfig } from "@/components/publications/status-badge";
import { ImagePicker, type PickedImage } from "@/components/images/image-picker";
import { FlyerSourceDialog } from "@/components/publications/flyer-source-dialog";
import { PLATFORM_CONFIG } from "@/lib/platforms";
import { cn } from "@/lib/utils";
import { PublicationStatus, type Platform } from "@prisma/client";
import type { PublicationWithRelations } from "@/lib/data/publications";
import type { PublicationWeekContext } from "@/lib/data/calendar";
import { updatePublicationSchema } from "@/lib/validation/publication";
import type { PhotoMode } from "@/lib/ai/schemas";

const categoryOptions = [
  { value: "RECRUITMENT", label: "Recrutement" },
  { value: "HUMAN_RESOURCES", label: "Ressources humaines" },
  { value: "EMPLOYEE_WELLBEING", label: "Bien-être des employés" },
] as const;

const statusOptions = (Object.keys(statusConfig) as PublicationStatus[]).map((value) => ({
  value,
  label: statusConfig[value].label,
}));

type VariantState = {
  platform: Platform;
  caption: string;
  hashtags: string;
  cta: string;
};

type FormState = {
  title: string;
  hook: string;
  caption: string;
  cta: string;
  hashtags: string;
  visualConcept: string;
  category: (typeof categoryOptions)[number]["value"];
  objective: string;
  audience: string;
  tone: string;
  variants: VariantState[];
};

function toFormState(publication: PublicationWithRelations): FormState {
  return {
    title: publication.title,
    hook: publication.hook,
    caption: publication.caption,
    cta: publication.cta,
    hashtags: publication.hashtags.join(", "),
    visualConcept: publication.visualConcept,
    category: publication.category,
    objective: publication.objective,
    audience: publication.audience,
    tone: publication.tone,
    variants: publication.variants.map((variant) => ({
      platform: variant.platform,
      caption: variant.caption,
      hashtags: variant.hashtags.join(", "),
      cta: variant.cta,
    })),
  };
}

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

type FlyerOption = { id: string; url: string };

export function PublicationDetail({
  publication,
  flyerOptions,
  weekContext,
}: {
  publication: PublicationWithRelations;
  flyerOptions: FlyerOption[];
  weekContext: PublicationWeekContext | null;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(publication.status);
  const [form, setForm] = useState<FormState>(toFormState(publication));
  const [image, setImage] = useState<PickedImage | null>(
    publication.image ? { id: publication.image.id, url: publication.image.url } : null,
  );
  const [isSelectingStyle, setIsSelectingStyle] = useState(false);
  const [isChangingPhoto, setIsChangingPhoto] = useState(false);
  const [previewPlatform, setPreviewPlatform] = useState<Platform | undefined>(
    publication.variants[0]?.platform,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isMakingFlyer, setIsMakingFlyer] = useState(false);
  const [isFlyerDialogOpen, setIsFlyerDialogOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const [autoPublish, setAutoPublish] = useState(publication.autoPublish);
  const [isTogglingAutoPublish, setIsTogglingAutoPublish] = useState(false);
  const [publishingPlatform, setPublishingPlatform] = useState<Platform | null>(null);

  // Snapshot of the last-SAVED form, so internal navigation (Previous/Next/
  // Back to Weekly Plan) can warn before discarding an in-progress edit
  // instead of silently losing it.
  const savedSnapshotRef = useRef(JSON.stringify(toFormState(publication)));
  const isDirty = JSON.stringify(form) !== savedSnapshotRef.current;

  const isAiSourcedFlyer =
    publication.sourceImage?.tags?.some((tag) => tag === "stock-photo" || tag === "ai-generated") ?? false;

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  function navigateGuarded(href: string) {
    if (isDirty) {
      setPendingHref(href);
    } else {
      router.push(href);
    }
  }

  // Single-user workflow: everything is editable until it's actually
  // published, no reviewer role or approval gate involved.
  const canEditContent = status !== PublicationStatus.PUBLISHED;
  const canDelete = status !== PublicationStatus.PUBLISHED;

  const previewVariant =
    form.variants.find((variant) => variant.platform === previewPlatform) ?? form.variants[0];

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateVariant(index: number, patch: Partial<VariantState>) {
    setForm((prev) => ({
      ...prev,
      variants: prev.variants.map((variant, i) => (i === index ? { ...variant, ...patch } : variant)),
    }));
  }

  async function handleSave(): Promise<boolean> {
    const parsed = updatePublicationSchema.safeParse({
      ...form,
      hashtags: parseTags(form.hashtags),
      variants: form.variants.map((variant) => ({
        platform: variant.platform,
        caption: variant.caption,
        cta: variant.cta,
        hashtags: parseTags(variant.hashtags),
      })),
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Veuillez vérifier le formulaire.");
      return false;
    }

    setIsSaving(true);
    try {
      const response = await fetch(`/api/publications/${publication.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) throw new Error();
      savedSnapshotRef.current = JSON.stringify(form);
      toast.success("Modifications enregistrées.");
      router.refresh();
      return true;
    } catch {
      toast.error("Échec de l'enregistrement des modifications.");
      return false;
    } finally {
      setIsSaving(false);
    }
  }

  async function handleMakeFlyer(input: { photoMode: PhotoMode; imageId?: string }) {
    setIsMakingFlyer(true);
    try {
      const response = await fetch(`/api/publications/${publication.id}/flyer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? "Échec de la génération du flyer.");
      }
      const updated = await response.json();
      if (updated.image) {
        setImage({ id: updated.image.id, url: updated.image.url });
      }
      setIsFlyerDialogOpen(false);
      toast.success("Nouveaux styles de flyer générés.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de la génération du flyer.");
    } finally {
      setIsMakingFlyer(false);
    }
  }

  async function handleSelectStyle(option: FlyerOption) {
    if (option.id === image?.id) return;
    setIsSelectingStyle(true);
    setImage(option);
    try {
      const response = await fetch(`/api/publications/${publication.id}/select-image`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: option.id }),
      });
      if (!response.ok) throw new Error();
    } catch {
      toast.error("Échec du changement de style.");
    } finally {
      setIsSelectingStyle(false);
    }
  }

  // The only place that changes the underlying source photo (as opposed to
  // just switching between already-rendered flyer styles). Posts to a
  // dedicated endpoint that also invalidates any existing flyer-style batch
  // server-side, since those were composited from the old photo.
  async function handlePhotoChange(newImage: PickedImage | null) {
    const previousImage = image;
    setIsChangingPhoto(true);
    setImage(newImage);
    try {
      const response = await fetch(`/api/publications/${publication.id}/set-photo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageId: newImage?.id ?? null }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          response.status === 404
            ? "Cette photo n'existe plus — elle a peut-être été supprimée. Veuillez en choisir une autre."
            : (body?.error ?? "Échec de la mise à jour de la photo."),
        );
      }
      toast.success(newImage ? "Photo mise à jour." : "Photo retirée.");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de la mise à jour de la photo.");
      setImage(previousImage);
    } finally {
      setIsChangingPhoto(false);
    }
  }

  async function handleStatusChange(newStatus: PublicationStatus) {
    const previousStatus = status;
    setIsTransitioning(true);
    setStatus(newStatus);
    try {
      const response = await fetch(`/api/publications/${publication.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error();
      toast.success(`Marqué comme ${statusConfig[newStatus].label.toLowerCase()}.`);
    } catch {
      toast.error("Échec de la mise à jour du statut.");
      setStatus(previousStatus);
    } finally {
      setIsTransitioning(false);
    }
  }

  async function handleSocialPublish(platform: Platform) {
    setPublishingPlatform(platform);
    try {
      const response = await fetch(`/api/publications/${publication.id}/publish-social`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform }),
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.error ?? "Échec de la publication.");
      toast.success(`Publié sur ${PLATFORM_CONFIG[platform].label}.`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de la publication.");
    } finally {
      setPublishingPlatform(null);
    }
  }

  async function handleToggleAutoPublish(next: boolean) {
    const previous = autoPublish;
    setIsTogglingAutoPublish(true);
    setAutoPublish(next);
    try {
      const response = await fetch(`/api/publications/${publication.id}/auto-publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ autoPublish: next }),
      });
      if (!response.ok) throw new Error();
      toast.success(next ? "Sera publié automatiquement à sa date programmée." : "Publication automatique désactivée.");
    } catch {
      toast.error("Échec de la mise à jour de la publication automatique.");
      setAutoPublish(previous);
    } finally {
      setIsTogglingAutoPublish(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Supprimer cette publication ? Cette action est irréversible.")) return;
    setIsTransitioning(true);
    try {
      const response = await fetch(`/api/publications/${publication.id}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      toast.success("Publication supprimée.");
      router.push("/publications");
    } catch {
      toast.error("Échec de la suppression de la publication.");
      setIsTransitioning(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2">
        <button
          type="button"
          onClick={() =>
            navigateGuarded(weekContext ? `/calendar/weeks/${weekContext.weekId}` : "/publications")
          }
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          {weekContext ? "Retour au plan hebdomadaire" : "Retour aux publications"}
        </button>
        {weekContext && weekContext.siblings.length > 1 ? (
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={weekContext.currentIndex === 0}
                onClick={() =>
                  navigateGuarded(`/publications/${weekContext.siblings[weekContext.currentIndex - 1].id}`)
                }
                aria-label="Publication précédente de cette semaine"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <span className="text-xs font-medium text-muted-foreground">
                {weekContext.currentIndex + 1} sur {weekContext.siblings.length}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                disabled={weekContext.currentIndex === weekContext.siblings.length - 1}
                onClick={() =>
                  navigateGuarded(`/publications/${weekContext.siblings[weekContext.currentIndex + 1].id}`)
                }
                aria-label="Publication suivante de cette semaine"
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{form.title}</h1>
          <StatusBadge status={status} />
          {weekContext ? (
            <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-primary">
              Plan hebdomadaire
            </span>
          ) : null}
        </div>
        <Select
          value={status}
          onValueChange={(value) => handleStatusChange(value as PublicationStatus)}
          disabled={isTransitioning}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Post preview — the photo on top, caption/hashtags/CTA below, exactly
          as it would look when actually published, per platform. */}
      <Card className="overflow-hidden py-0">
        <div className={cn("h-1.5 w-full", statusConfig[status].dotClassName)} />
        <div className="flex items-center justify-between gap-3 border-b bg-muted/30 px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">Aperçu de la publication</span>
          <div className="flex items-center gap-2">
            {form.variants.length > 1 ? (
              <div className="flex gap-1">
                {form.variants.map((variant) => {
                  const platformConfig = PLATFORM_CONFIG[variant.platform];
                  const isSelected = previewVariant?.platform === variant.platform;
                  return (
                    <button
                      key={variant.platform}
                      type="button"
                      onClick={() => setPreviewPlatform(variant.platform)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
                        isSelected ? "bg-brand-primary text-white" : "text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <platformConfig.Icon
                        className="size-3"
                        style={!isSelected ? { color: platformConfig.color } : undefined}
                      />
                      {platformConfig.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
            {canEditContent && image ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  Source du flyer : {isAiSourcedFlyer ? "Généré par l'IA" : "Photo existante"}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsFlyerDialogOpen(true)}
                  disabled={isMakingFlyer}
                >
                  {isMakingFlyer ? "Conception…" : "Changer"}
                </Button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex justify-center bg-muted">
          {image ? (
            // data: URLs (AI-generated images) don't benefit from next/image optimization.
            // No forced aspect ratio / object-cover here: flyers and real
            // photos have different natural ratios, and cropping was
            // cutting off the headline on portrait flyer output.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={image.url}
              alt={form.title}
              className="max-h-[600px] w-auto max-w-full object-contain"
            />
          ) : (
            <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <p className="text-sm">Pas encore d&apos;image.</p>
              {canEditContent ? (
                <div className="flex flex-col items-center gap-2">
                  <Button size="sm" onClick={() => setIsFlyerDialogOpen(true)}>
                    Créer le flyer
                  </Button>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>ou</span>
                    <ImagePicker value={image} onChange={handlePhotoChange} disabled={isChangingPhoto} />
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {flyerOptions.length > 1 ? (
          <div className="space-y-3 border-t bg-muted/30 px-4 py-4">
            <span className="text-sm font-medium text-muted-foreground">Choisir un style</span>
            <div className="flex flex-wrap gap-4">
              {flyerOptions.map((option, index) => {
                const isSelected = image?.id === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    disabled={isSelectingStyle}
                    onClick={() => handleSelectStyle(option)}
                    className="group flex flex-col items-center gap-1.5"
                  >
                    <span
                      className={`relative block size-28 overflow-hidden rounded-xl border-2 shadow-sm transition-all duration-150 ${
                        isSelected
                          ? "border-brand-primary ring-2 ring-brand-primary/30"
                          : "border-transparent group-hover:scale-[1.03] group-hover:border-brand-primary/40"
                      } ${isSelectingStyle ? "opacity-60" : ""}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={option.url} alt={`Style de flyer ${index + 1}`} className="size-full object-cover" />
                      {isSelected ? (
                        <span className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-brand-primary text-white shadow">
                          <Check className="size-3.5" />
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={`text-xs font-medium ${isSelected ? "text-brand-primary" : "text-muted-foreground"}`}
                    >
                      Style {index + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <CardContent className="space-y-3 py-4">
          <p className="whitespace-pre-wrap text-sm leading-relaxed">
            {previewVariant?.caption || form.caption}
          </p>
          {previewVariant?.hashtags ? (
            <p className="text-sm text-brand-primary">
              {parseTags(previewVariant.hashtags)
                .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
                .join(" ")}
            </p>
          ) : null}
          {previewVariant?.cta ? (
            <p className="text-sm font-medium">{previewVariant.cta}</p>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Contenu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={form.title}
                disabled={!canEditContent}
                onChange={(e) => update("title", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hook">Accroche</Label>
              <Textarea
                id="hook"
                rows={2}
                value={form.hook}
                disabled={!canEditContent}
                onChange={(e) => update("hook", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="caption">Légende</Label>
              <Textarea
                id="caption"
                rows={5}
                value={form.caption}
                disabled={!canEditContent}
                onChange={(e) => update("caption", e.target.value)}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="cta">Appel à l&apos;action</Label>
                <Input
                  id="cta"
                  value={form.cta}
                  disabled={!canEditContent}
                  onChange={(e) => update("cta", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hashtags">Hashtags (séparés par des virgules)</Label>
                <Input
                  id="hashtags"
                  value={form.hashtags}
                  disabled={!canEditContent}
                  onChange={(e) => update("hashtags", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="visual-concept">Concept visuel</Label>
              <Textarea
                id="visual-concept"
                rows={3}
                value={form.visualConcept}
                disabled={!canEditContent}
                onChange={(e) => update("visualConcept", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Détails</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Pilier de contenu</Label>
              <Select
                value={form.category}
                disabled={!canEditContent}
                onValueChange={(value) => update("category", value as FormState["category"])}
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
            <div className="space-y-2">
              <Label htmlFor="objective">Objectif</Label>
              <Input
                id="objective"
                value={form.objective}
                disabled={!canEditContent}
                onChange={(e) => update("objective", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audience">Public</Label>
              <Input
                id="audience"
                value={form.audience}
                disabled={!canEditContent}
                onChange={(e) => update("audience", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tone">Ton</Label>
              <Input
                id="tone"
                value={form.tone}
                disabled={!canEditContent}
                onChange={(e) => update("tone", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Image</Label>
              {canEditContent ? (
                <ImagePicker value={image} onChange={handlePhotoChange} disabled={isChangingPhoto} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  {image ? "Image attachée." : "Aucune image attachée."}
                </p>
              )}
            </div>
            {publication.calendarSlot ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-publish">Publication automatique à la date programmée</Label>
                  <p className="text-xs text-muted-foreground">
                    Marque ceci comme Publié automatiquement une fois la date du calendrier
                    arrivée. Aucun compte social n&apos;est encore connecté — cela met seulement à
                    jour le statut dans ALTA Services.
                  </p>
                </div>
                <Switch
                  id="auto-publish"
                  checked={autoPublish}
                  onCheckedChange={handleToggleAutoPublish}
                  disabled={isTogglingAutoPublish || status === PublicationStatus.PUBLISHED}
                />
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Adaptations par plateforme</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs
            value={previewPlatform}
            onValueChange={(value) => setPreviewPlatform(value as Platform)}
          >
            <TabsList>
              {form.variants.map((variant) => {
                const platformConfig = PLATFORM_CONFIG[variant.platform];
                return (
                  <TabsTrigger key={variant.platform} value={variant.platform} className="gap-1.5">
                    <platformConfig.Icon className="size-3.5" />
                    {platformConfig.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>
            {form.variants.map((variant, index) => (
              <TabsContent key={variant.platform} value={variant.platform} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Légende</Label>
                  <Textarea
                    rows={4}
                    value={variant.caption}
                    disabled={!canEditContent}
                    onChange={(e) => updateVariant(index, { caption: e.target.value })}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Appel à l&apos;action</Label>
                    <Input
                      value={variant.cta}
                      disabled={!canEditContent}
                      onChange={(e) => updateVariant(index, { cta: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hashtags (séparés par des virgules)</Label>
                    <Input
                      value={variant.hashtags}
                      disabled={!canEditContent}
                      onChange={(e) => updateVariant(index, { hashtags: e.target.value })}
                    />
                  </div>
                </div>
                <SocialPublishStatus
                  publication={publication}
                  platform={variant.platform}
                  isPublishing={publishingPlatform === variant.platform}
                  onPublish={() => handleSocialPublish(variant.platform)}
                />
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {status !== PublicationStatus.PUBLISHED ? (
        <p className="text-right text-xs text-muted-foreground">
          « Publier » marque ceci comme prêt dans ALTA Services — utilisez les boutons de
          publication par plateforme ci-dessus pour publier réellement sur les réseaux sociaux.
        </p>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        {canDelete ? (
          <Button variant="outline" onClick={handleDelete} disabled={isTransitioning}>
            Supprimer
          </Button>
        ) : null}
        {canEditContent ? (
          <Button variant="outline" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Enregistrement…" : "Enregistrer les modifications"}
          </Button>
        ) : null}
        {status !== PublicationStatus.PUBLISHED ? (
          <Button
            onClick={() => handleStatusChange(PublicationStatus.PUBLISHED)}
            disabled={isTransitioning}
            title="Marque ceci comme Publié dans ALTA Services. Utilisez les boutons de publication par plateforme pour publier réellement."
          >
            Publier
          </Button>
        ) : null}
      </div>

      <FlyerSourceDialog
        open={isFlyerDialogOpen}
        onOpenChange={setIsFlyerDialogOpen}
        isSubmitting={isMakingFlyer}
        onConfirm={handleMakeFlyer}
      />

      <Dialog open={pendingHref !== null} onOpenChange={(open) => !open && setPendingHref(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Modifications non enregistrées</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Enregistrez vos modifications avant de quitter, sinon elles seront perdues.
          </p>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" onClick={() => setPendingHref(null)}>
              Annuler
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const href = pendingHref;
                setPendingHref(null);
                if (href) router.push(href);
              }}
            >
              Quitter sans enregistrer
            </Button>
            <Button
              disabled={isSaving}
              onClick={async () => {
                const saved = await handleSave();
                if (saved) {
                  const href = pendingHref;
                  setPendingHref(null);
                  if (href) router.push(href);
                }
              }}
            >
              {isSaving ? "Enregistrement…" : "Enregistrer et quitter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SocialPublishStatus({
  publication,
  platform,
  isPublishing,
  onPublish,
}: {
  publication: PublicationWithRelations;
  platform: Platform;
  isPublishing: boolean;
  onPublish: () => void;
}) {
  const variant = publication.variants.find((v) => v.platform === platform);
  const label = PLATFORM_CONFIG[platform].label;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
      <div className="space-y-0.5">
        {variant?.publishedAt ? (
          <p className="text-sm text-muted-foreground">
            Publié sur {label}
            {variant.externalPostUrl ? (
              <>
                {" — "}
                <a
                  href={variant.externalPostUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-primary hover:underline"
                >
                  voir la publication
                </a>
              </>
            ) : null}
          </p>
        ) : variant?.publishError ? (
          <p className="text-sm text-destructive">Échec de la publication sur {label} : {variant.publishError}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Pas encore publié sur {label}.</p>
        )}
      </div>
      <Button size="sm" variant="outline" onClick={onPublish} disabled={isPublishing}>
        {isPublishing ? "Publication…" : variant?.publishedAt ? "Publier à nouveau" : `Publier sur ${label}`}
      </Button>
    </div>
  );
}
