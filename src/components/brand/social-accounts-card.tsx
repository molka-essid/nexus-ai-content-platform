"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLATFORM_CONFIG } from "@/lib/platforms";
import type { Platform } from "@prisma/client";

type ConnectedAccount = { platform: Platform; displayName: string | null };

const PLATFORMS: Platform[] = ["FACEBOOK", "INSTAGRAM", "LINKEDIN", "TIKTOK"];

export function SocialAccountsCard({ accounts }: { accounts: ConnectedAccount[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const connected = searchParams.get("social_connected");
    const error = searchParams.get("social_error");
    if (connected) {
      const label = connected
        .split(" ")
        .map((word) => (word.length ? word[0].toUpperCase() + word.slice(1) : word))
        .join(" ");
      toast.success(`${label} connecté.`);
    }
    if (error) toast.error(error);
    if (connected || error) router.replace("/brand");
  }, [searchParams, router]);

  async function handleDisconnect(platform: Platform) {
    try {
      const response = await fetch(`/api/social/${platform.toLowerCase()}`, { method: "DELETE" });
      if (!response.ok) throw new Error();
      toast.success("Déconnecté.");
      router.refresh();
    } catch {
      toast.error("Échec de la déconnexion.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comptes de réseaux sociaux connectés</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Connectez un compte pour que « Publier sur » puisse y publier directement. Un compte par plateforme.
        </p>
        {PLATFORMS.map((platform) => {
          const { label, Icon } = PLATFORM_CONFIG[platform];
          const account = accounts.find((a) => a.platform === platform);
          return (
            <div key={platform} className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
              <div className="flex items-center gap-2.5">
                <Icon className="size-4.5" />
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">
                    {account ? `Connecté en tant que ${account.displayName ?? account.platform}` : "Non connecté"}
                  </p>
                </div>
              </div>
              {account ? (
                <Button size="sm" variant="outline" onClick={() => handleDisconnect(platform)}>
                  Déconnecter
                </Button>
              ) : (
                <Button size="sm" asChild>
                  <a href={`/api/social/${platform.toLowerCase()}/connect`}>Connecter</a>
                </Button>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
