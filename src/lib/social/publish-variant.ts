import "server-only";
import { getSocialAccount } from "@/lib/data/social-accounts";
import { setPlatformVariantPublishResult, type PublicationWithRelations } from "@/lib/data/publications";
import { publishToInstagram } from "@/lib/social/instagram";
import { publishToFacebook } from "@/lib/social/facebook";
import { publishToTikTok } from "@/lib/social/tiktok";
import { publishToLinkedIn } from "@/lib/social/linkedin";
import type { Platform } from "@prisma/client";

export type PublishVariantOutcome =
  | { ok: true; externalPostId: string; externalPostUrl?: string }
  | { ok: false; status: number; error: string };

// Shared by the manual "Publish to X" button (publish-social/route.ts) and
// the auto-publish cron job — both need the exact same account lookup,
// image URL, and per-platform dispatch, so this is the single place that
// logic lives.
export async function publishPublicationVariant(
  publication: PublicationWithRelations,
  platform: Platform,
  origin: string,
): Promise<PublishVariantOutcome> {
  const variant = publication.variants.find((v) => v.platform === platform);
  if (!variant) {
    return { ok: false, status: 400, error: `Aucun contenu ${platform} sur cette publication.` };
  }

  const account = await getSocialAccount(platform);
  if (!account) {
    return {
      ok: false,
      status: 400,
      error: `Aucun compte ${platform} connecté. Connectez-en un depuis les paramètres de la Marque.`,
    };
  }

  if (!publication.image) {
    return { ok: false, status: 400, error: "Cette publication n'a pas encore d'image à publier." };
  }

  const imageUrl = `${origin}/api/images/${publication.image.id}/raw`;
  const caption = [variant.caption, variant.hashtags.map((tag) => `#${tag}`).join(" ")]
    .filter(Boolean)
    .join("\n\n");

  try {
    let result: { externalPostId: string; externalPostUrl?: string };
    switch (platform) {
      case "INSTAGRAM":
        result = await publishToInstagram({
          instagramUserId: account.externalAccountId,
          accessToken: account.accessToken,
          imageUrl,
          caption,
        });
        break;
      case "FACEBOOK":
        result = await publishToFacebook({
          pageId: account.externalAccountId,
          accessToken: account.accessToken,
          imageUrl,
          caption,
        });
        break;
      case "TIKTOK":
        result = await publishToTikTok({ accessToken: account.accessToken, imageUrl, caption });
        break;
      case "LINKEDIN":
        result = await publishToLinkedIn({
          personUrn: account.externalAccountId,
          accessToken: account.accessToken,
          imageUrl,
          caption,
        });
        break;
    }

    await setPlatformVariantPublishResult(publication.id, platform, result);
    return { ok: true, ...result };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Échec de la publication.";
    await setPlatformVariantPublishResult(publication.id, platform, { publishError: message });
    return { ok: false, status: 502, error: message };
  }
}
