import { getBrandProfile } from "@/lib/data/brand";
import { listSocialAccounts } from "@/lib/data/social-accounts";
import { getSocialAppConfig } from "@/lib/data/social-app-config";
import { BrandForm } from "@/components/brand/brand-form";
import { SocialAccountsCard } from "@/components/brand/social-accounts-card";
import { SocialAppConfigCard } from "@/components/brand/social-app-config-card";

export default async function BrandPage() {
  const [brand, socialAccounts, socialAppConfig] = await Promise.all([
    getBrandProfile(),
    listSocialAccounts(),
    getSocialAppConfig(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Marque</h1>
        <p className="text-muted-foreground">
          Ce logo, cette palette et cette voix guident chaque publication générée par l&apos;IA.
        </p>
      </div>
      <BrandForm initialBrand={brand} />
      <SocialAppConfigCard
        metaAppId={socialAppConfig.metaAppId ?? ""}
        hasMetaAppSecret={Boolean(socialAppConfig.metaAppSecret)}
        instagramAppId={socialAppConfig.instagramAppId ?? ""}
        hasInstagramAppSecret={Boolean(socialAppConfig.instagramAppSecret)}
        tiktokClientKey={socialAppConfig.tiktokClientKey ?? ""}
        hasTiktokClientSecret={Boolean(socialAppConfig.tiktokClientSecret)}
        linkedinClientId={socialAppConfig.linkedinClientId ?? ""}
        hasLinkedinClientSecret={Boolean(socialAppConfig.linkedinClientSecret)}
      />
      <SocialAccountsCard accounts={socialAccounts} />
    </div>
  );
}
