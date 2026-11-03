"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { addDays, format, isMonday, nextMonday, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { ArrowLeft, Check, ChevronRight, Image as ImageIcon, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ImagePicker, type PickedImage } from "@/components/images/image-picker";
import { cn } from "@/lib/utils";
import { generateCalendarInputSchema } from "@/lib/ai/schemas";
import { PLATFORM_LIST, PLATFORM_CONFIG } from "@/lib/platforms";
import type { ContentCategory, Platform } from "@prisma/client";
import type { PhotoMode } from "@/lib/ai/schemas";

const categoryOptions: { value: ContentCategory; label: string }[] = [
  { value: "RECRUITMENT", label: "Recrutement" },
  { value: "HUMAN_RESOURCES", label: "Ressources humaines" },
  { value: "EMPLOYEE_WELLBEING", label: "Bien-être des employés" },
];

const STEPS = ["Définir la semaine", "Stratégie et visuel"] as const;

function defaultWeekStart() {
  const today = startOfDay(new Date());
  return format(isMonday(today) ? today : nextMonday(today), "yyyy-MM-dd");
}

type FormState = {
  weekStart: string;
  postsPerWeek: number;
  theme: string;
  categories: ContentCategory[];
  platforms: Platform[];
  tone: string;
  additionalInstructions: string;
  flyerPhotoMode: PhotoMode;
  autoPublish: boolean;
};

export function GenerateWeekWizard() {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [flyerImage, setFlyerImage] = useState<PickedImage | null>(null);
  const [form, setForm] = useState<FormState>({
    weekStart: defaultWeekStart(),
    postsPerWeek: 5,
    theme: "",
    categories: [],
    platforms: ["LINKEDIN", "FACEBOOK", "INSTAGRAM"],
    tone: "",
    additionalInstructions: "",
    flyerPhotoMode: "generated",
    autoPublish: false,
  });

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleFrom<T>(list: T[], value: T): T[] {
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  const weekEnd = addDays(new Date(form.weekStart), 6);
  const rangeLabel = `${format(new Date(form.weekStart), "d MMM", { locale: fr })} – ${format(weekEnd, "d MMM yyyy", { locale: fr })}`;

  async function handleGenerate() {
    const parsed = generateCalendarInputSchema.safeParse({
      ...form,
      theme: form.theme || undefined,
      tone: form.tone || undefined,
      additionalInstructions: form.additionalInstructions || undefined,
      categories: form.categories.length > 0 ? form.categories : undefined,
      flyerImageId: form.flyerPhotoMode === "real" ? flyerImage?.id : undefined,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Veuillez vérifier votre stratégie.");
      return;
    }

    setIsGenerating(true);
    try {
      const response = await fetch("/api/ai/generate-calendar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        throw new Error(errorBody?.error ?? "Échec de la génération.");
      }
      const calendarWeek = await response.json();
      toast.success("Plan hebdomadaire généré.");
      // The generated week now lives at its own persistent URL — navigating
      // there (instead of flipping to an in-memory "Review" step) means
      // refreshing, bookmarking, or pressing Back never loses it.
      router.push(`/calendar/weeks/${calendarWeek.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Échec de la génération de la semaine. Veuillez réessayer.");
      setIsGenerating(false);
    }
  }

  const canContinueFromWeek = form.postsPerWeek >= 1 && form.postsPerWeek <= 7;
  const canGenerate =
    form.platforms.length > 0 && (form.flyerPhotoMode === "generated" || Boolean(flyerImage));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Stepper currentIndex={stepIndex} />

      <AnimatePresence mode="wait">
        {stepIndex === 0 ? (
          <StepPanel key="week">
            <Card>
              <CardContent className="space-y-5 pt-6">
                <div>
                  <h2 className="font-heading text-lg font-semibold">Définir la semaine</h2>
                  <p className="text-sm text-muted-foreground">
                    Choisissez une plage de dates et le nombre de publications à y planifier.
                  </p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="week-start">Semaine à partir du (lundi)</Label>
                    <Input
                      id="week-start"
                      type="date"
                      value={form.weekStart}
                      onChange={(e) => update("weekStart", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="posts-per-week">Nombre de publications</Label>
                    <Input
                      id="posts-per-week"
                      type="number"
                      min={1}
                      max={7}
                      value={form.postsPerWeek}
                      onChange={(e) => update("postsPerWeek", Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
                  Planification de <span className="font-medium text-foreground">{form.postsPerWeek}</span> publication
                  {form.postsPerWeek === 1 ? "" : "s"} sur{" "}
                  <span className="font-medium text-foreground">{rangeLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                  >
                    <ArrowLeft className="size-3.5" />
                    Annuler
                  </Link>
                  <Button onClick={() => setStepIndex(1)} disabled={!canContinueFromWeek}>
                    Continuer
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </StepPanel>
        ) : null}

        {stepIndex === 1 ? (
          <StepPanel key="strategy">
            <Card>
              <CardContent className="space-y-5 pt-6">
                <div>
                  <h2 className="font-heading text-lg font-semibold">Définir votre stratégie</h2>
                  <p className="text-sm text-muted-foreground">
                    Donnez à l&apos;IA un thème et des garde-fous — elle planifie le reste.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="theme">Thème de la semaine (optionnel)</Label>
                  <Input
                    id="theme"
                    placeholder="Laissez l'IA en inventer un, ou définissez le vôtre"
                    value={form.theme}
                    onChange={(e) => update("theme", e.target.value)}
                  />
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
                          onClick={() => update("platforms", toggleFrom(form.platforms, platform))}
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

                <div className="space-y-2">
                  <Label>Piliers de contenu (optionnel — laissez vide pour alterner les trois)</Label>
                  <div className="flex flex-wrap gap-2">
                    {categoryOptions.map((option) => {
                      const isSelected = form.categories.includes(option.value);
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => update("categories", toggleFrom(form.categories, option.value))}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                            isSelected
                              ? "border-brand-primary bg-brand-primary text-white"
                              : "border-border text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="tone">Ton (optionnel)</Label>
                    <Input
                      id="tone"
                      placeholder="Par défaut, le ton de la marque"
                      value={form.tone}
                      onChange={(e) => update("tone", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="instructions">Instructions supplémentaires (optionnel)</Label>
                  <Textarea
                    id="instructions"
                    rows={2}
                    placeholder="ex. Mentionner le nouveau bureau de Sousse, garder les légendes courtes"
                    value={form.additionalInstructions}
                    onChange={(e) => update("additionalInstructions", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Photos de flyer pour cette semaine</Label>
                  <p className="text-xs text-muted-foreground">
                    Choisi une fois pour toutes les publications de la semaine — vous pouvez toujours
                    le changer plus tard sur une publication individuelle.
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => update("flyerPhotoMode", "generated")}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                        form.flyerPhotoMode === "generated"
                          ? "border-brand-primary bg-brand-primary/5"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      <Sparkles className="size-5 text-brand-primary" />
                      <span className="text-sm font-medium">Générer les visuels avec l&apos;IA</span>
                      <span className="text-xs text-muted-foreground">
                        Une vraie photo est sourcée automatiquement pour chaque publication
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => update("flyerPhotoMode", "real")}
                      className={cn(
                        "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors",
                        form.flyerPhotoMode === "real"
                          ? "border-brand-primary bg-brand-primary/5"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      <ImageIcon className="size-5 text-brand-primary" />
                      <span className="text-sm font-medium">Utiliser une photo existante de l&apos;entreprise</span>
                      <span className="text-xs text-muted-foreground">
                        La même photo, stylisée pour chaque publication de la semaine
                      </span>
                    </button>
                  </div>
                  {form.flyerPhotoMode === "real" ? (
                    <div className="pt-1">
                      <ImagePicker value={flyerImage} onChange={setFlyerImage} />
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                  <div className="space-y-0.5">
                    <Label htmlFor="auto-publish-week">Publier automatiquement chaque post à sa date programmée</Label>
                    <p className="text-xs text-muted-foreground">
                      Marque chaque post comme Publié automatiquement une fois sa date arrivée — aucun
                      compte social n&apos;est encore connecté, cela met seulement à jour le statut dans
                      ALTA Services. Vous pouvez modifier ce réglage par publication plus tard.
                    </p>
                  </div>
                  <Switch
                    id="auto-publish-week"
                    checked={form.autoPublish}
                    onCheckedChange={(checked) => update("autoPublish", checked)}
                  />
                </div>

                <div className="flex justify-between">
                  <Button variant="ghost" onClick={() => setStepIndex(0)} disabled={isGenerating}>
                    Retour
                  </Button>
                  <Button onClick={handleGenerate} disabled={!canGenerate || isGenerating}>
                    {isGenerating ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Planification de votre semaine…
                      </>
                    ) : (
                      <>
                        <Sparkles className="size-4" />
                        Générer la semaine
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </StepPanel>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Stepper({ currentIndex }: { currentIndex: number }) {
  return (
    <div className="flex items-center">
      {STEPS.map((label, index) => (
        <div key={label} className="flex flex-1 items-center last:flex-none">
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
                index < currentIndex
                  ? "bg-brand-primary text-white"
                  : index === currentIndex
                    ? "bg-brand-primary text-white ring-4 ring-brand-primary/20"
                    : "bg-muted text-muted-foreground",
              )}
            >
              {index < currentIndex ? <Check className="size-3.5" /> : index + 1}
            </div>
            <span
              className={cn(
                "text-xs font-medium whitespace-nowrap",
                index <= currentIndex ? "text-foreground" : "text-muted-foreground",
              )}
            >
              {label}
            </span>
          </div>
          {index < STEPS.length - 1 ? (
            <div className={cn("mx-2 h-px flex-1 transition-colors", index < currentIndex ? "bg-brand-primary" : "bg-border")} />
          ) : null}
        </div>
      ))}
    </div>
  );
}

function StepPanel({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -12 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}
