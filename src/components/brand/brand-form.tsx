"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { BrandProfile } from "@prisma/client";
import { brandProfileSchema } from "@/lib/validation/brand";

type FormState = {
  name: string;
  slogan: string;
  colorPrimary: string;
  colorAccent: string;
  colorBackground: string;
  toneGuidelines: string;
  communicationGuidelines: string;
};

function toFormState(brand: BrandProfile): FormState {
  return {
    name: brand.name,
    slogan: brand.slogan ?? "",
    colorPrimary: brand.colorPrimary,
    colorAccent: brand.colorAccent,
    colorBackground: brand.colorBackground,
    toneGuidelines: brand.toneGuidelines ?? "",
    communicationGuidelines: brand.communicationGuidelines ?? "",
  };
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-10 shrink-0 cursor-pointer rounded-md border"
        />
        <Input value={value} onChange={(e) => onChange(e.target.value)} maxLength={7} />
      </div>
    </div>
  );
}

export function BrandForm({ initialBrand }: { initialBrand: BrandProfile }) {
  const [form, setForm] = useState<FormState>(toFormState(initialBrand));
  const [logoUrl, setLogoUrl] = useState(initialBrand.logoUrl);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/brand/logo", { method: "POST", body });
      if (!response.ok) throw new Error(await response.text());
      const updated = await response.json();
      setLogoUrl(updated.logoUrl);
      toast.success("Logo mis à jour.");
    } catch {
      toast.error("Échec du téléversement du logo.");
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleSave() {
    const parsed = brandProfileSchema.safeParse({
      ...form,
      slogan: form.slogan || null,
      toneGuidelines: form.toneGuidelines || null,
      communicationGuidelines: form.communicationGuidelines || null,
    });

    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Configuration de marque invalide.");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/brand", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!response.ok) throw new Error(await response.text());
      toast.success("Configuration de marque enregistrée.");
    } catch {
      toast.error("Échec de l'enregistrement de la configuration de marque.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>Logo</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Avatar className="size-24 rounded-lg">
            <AvatarImage src={logoUrl ?? undefined} alt={form.name} className="object-contain" />
            <AvatarFallback className="rounded-lg bg-brand-primary text-lg text-white">
              {form.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={handleLogoChange}
            className="hidden"
            id="logo-upload"
          />
          <Button
            variant="outline"
            size="sm"
            disabled={isUploadingLogo}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploadingLogo ? "Téléversement…" : "Remplacer le logo"}
          </Button>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Identité</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="brand-name">Nom</Label>
              <Input id="brand-name" value={form.name} onChange={(e) => update("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand-slogan">Slogan</Label>
              <Input
                id="brand-slogan"
                value={form.slogan}
                onChange={(e) => update("slogan", e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <ColorField
              label="Primaire"
              value={form.colorPrimary}
              onChange={(v) => update("colorPrimary", v)}
            />
            <ColorField
              label="Accent"
              value={form.colorAccent}
              onChange={(v) => update("colorAccent", v)}
            />
            <ColorField
              label="Arrière-plan"
              value={form.colorBackground}
              onChange={(v) => update("colorBackground", v)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Voix et directives</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tone-guidelines">Directives de ton</Label>
            <Textarea
              id="tone-guidelines"
              rows={3}
              value={form.toneGuidelines}
              onChange={(e) => update("toneGuidelines", e.target.value)}
              placeholder="ex. Humain, dynamique, engageant, professionnel, moderne."
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="communication-guidelines">Directives de communication</Label>
            <Textarea
              id="communication-guidelines"
              rows={4}
              value={form.communicationGuidelines}
              onChange={(e) => update("communicationGuidelines", e.target.value)}
              placeholder="ex. Se concentrer sur le Recrutement, les RH et le Bien-être des employés. Adapter le ton selon la plateforme."
            />
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? "Enregistrement…" : "Enregistrer les modifications"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
