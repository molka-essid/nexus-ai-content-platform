import type { Platform } from "@prisma/client";
import type { ComponentType, SVGProps } from "react";
import { FacebookIcon, LinkedinIcon, InstagramIcon, TiktokIcon } from "@/components/icons/platform-icons";

// Single source of truth for how a platform is labeled, iconed, and colored
// across the app (generation forms, the weekly wizard, calendar chips,
// publication detail tabs). Adding a new platform is a single new entry here
// — no hunting down hardcoded pill lists in multiple components.
export const PLATFORM_CONFIG: Record<
  Platform,
  { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>>; color: string }
> = {
  FACEBOOK: { label: "Facebook", Icon: FacebookIcon, color: "#1877F2" },
  LINKEDIN: { label: "LinkedIn", Icon: LinkedinIcon, color: "#0A66C2" },
  INSTAGRAM: { label: "Instagram", Icon: InstagramIcon, color: "#E1306C" },
  TIKTOK: { label: "TikTok", Icon: TiktokIcon, color: "#000000" },
};

export const PLATFORM_LIST = Object.keys(PLATFORM_CONFIG) as Platform[];
