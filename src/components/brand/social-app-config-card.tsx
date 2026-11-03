"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  metaAppId: string;
  hasMetaAppSecret: boolean;
  instagramAppId: string;
  hasInstagramAppSecret: boolean;
  tiktokClientKey: string;
  hasTiktokClientSecret: boolean;
  linkedinClientId: string;
  hasLinkedinClientSecret: boolean;
};

// App-level developer credentials for Facebook/Instagram/LinkedIn/TikTok,
// editable right from the app instead of requiring a redeploy with new env
// vars. Secret fields are never pre-filled with the real value (only
// whether one's saved) — leaving a secret field blank on save keeps
// whatever's already stored.
export function SocialAppConfigCard({
  metaAppId: initialMetaAppId,
  hasMetaAppSecret,
  instagramAppId: initialInstagramAppId,
  hasInstagramAppSecret,
  tiktokClientKey: initialTiktokClientKey,
  hasTiktokClientSecret,
  linkedinClientId: initialLinkedinClientId,
  hasLinkedinClientSecret,
}: Props) {
  const router = useRouter();
  const [metaAppId, setMetaAppId] = useState(initialMetaAppId);
  const [metaAppSecret, setMetaAppSecret] = useState("");
  const [instagramAppId, setInstagramAppId] = useState(initialInstagramAppId);
  const [instagramAppSecret, setInstagramAppSecret] = useState("");
  const [tiktokClientKey, setTiktokClientKey] = useState(initialTiktokClientKey);
  const [tiktokClientSecret, setTiktokClientSecret] = useState("");
  const [linkedinClientId, setLinkedinClientId] = useState(initialLinkedinClientId);
  const [linkedinClientSecret, setLinkedinClientSecret] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    try {
      const response = await fetch("/api/social/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metaAppId,
          ...(metaAppSecret ? { metaAppSecret } : {}),
          instagramAppId,
          ...(instagramAppSecret ? { instagramAppSecret } : {}),
          tiktokClientKey,
          ...(tiktokClientSecret ? { tiktokClientSecret } : {}),
          linkedinClientId,
          ...(linkedinClientSecret ? { linkedinClientSecret } : {}),
        }),
      });
      if (!response.ok) throw new Error();
      toast.success("Enregistré. Vous pouvez maintenant connecter des comptes.");
      setMetaAppSecret("");
      setInstagramAppSecret("");
      setTiktokClientSecret("");
      setLinkedinClientSecret("");
      router.refresh();
    } catch {
      toast.error("Échec de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Identifiants développeur des plateformes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Depuis vos applications développeur Meta, TikTok et LinkedIn. Nécessaire une fois avant
          que « Connecter » ne fonctionne ci-dessous.
        </p>

        <div className="space-y-3">
          <p className="text-sm font-medium">Facebook</p>
          <p className="text-xs text-muted-foreground">
            Depuis Paramètres → Général de votre application Meta (l&apos;ID/Secret principal de l&apos;app).
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="meta-app-id">ID de l&apos;application</Label>
              <Input id="meta-app-id" value={metaAppId} onChange={(e) => setMetaAppId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meta-app-secret">Secret de l&apos;application</Label>
              <Input
                id="meta-app-secret"
                type="password"
                value={metaAppSecret}
                onChange={(e) => setMetaAppSecret(e.target.value)}
                placeholder={hasMetaAppSecret ? "•••••••• (enregistré — laisser vide pour conserver)" : "Entrez votre secret d'application"}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">Instagram</p>
          <p className="text-xs text-muted-foreground">
            Un ID/Secret d&apos;application différent de celui de Facebook, même s&apos;il s&apos;agit de la
            même application Meta — trouvez-le sous Instagram → « API setup with Instagram Login »
            dans votre tableau de bord d&apos;application.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="instagram-app-id">ID de l&apos;application Instagram</Label>
              <Input
                id="instagram-app-id"
                value={instagramAppId}
                onChange={(e) => setInstagramAppId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="instagram-app-secret">Secret de l&apos;application Instagram</Label>
              <Input
                id="instagram-app-secret"
                type="password"
                value={instagramAppSecret}
                onChange={(e) => setInstagramAppSecret(e.target.value)}
                placeholder={
                  hasInstagramAppSecret ? "•••••••• (enregistré — laisser vide pour conserver)" : "Entrez votre secret d'application Instagram"
                }
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">TikTok</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="tiktok-client-key">Clé client</Label>
              <Input
                id="tiktok-client-key"
                value={tiktokClientKey}
                onChange={(e) => setTiktokClientKey(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tiktok-client-secret">Secret client</Label>
              <Input
                id="tiktok-client-secret"
                type="password"
                value={tiktokClientSecret}
                onChange={(e) => setTiktokClientSecret(e.target.value)}
                placeholder={
                  hasTiktokClientSecret ? "•••••••• (enregistré — laisser vide pour conserver)" : "Entrez votre secret client"
                }
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium">LinkedIn</p>
          <p className="text-xs text-muted-foreground">
            Connecte votre profil personnel pour publier. Une Page Entreprise nécessite d&apos;abord
            l&apos;approbation séparée de LinkedIn pour la Community Management API.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="linkedin-client-id">ID client</Label>
              <Input
                id="linkedin-client-id"
                value={linkedinClientId}
                onChange={(e) => setLinkedinClientId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="linkedin-client-secret">Secret client</Label>
              <Input
                id="linkedin-client-secret"
                type="password"
                value={linkedinClientSecret}
                onChange={(e) => setLinkedinClientSecret(e.target.value)}
                placeholder={
                  hasLinkedinClientSecret ? "•••••••• (enregistré — laisser vide pour conserver)" : "Entrez votre secret client"
                }
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Enregistrement…" : "Enregistrer les identifiants"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
