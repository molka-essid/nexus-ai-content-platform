import { CalendarDays, CalendarRange, FileText, ImageIcon, Palette, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Calendrier", icon: CalendarDays },
  { href: "/calendar/weeks", label: "Plans hebdomadaires", icon: CalendarRange },
  { href: "/publications", label: "Publications", icon: FileText },
  { href: "/images", label: "Images", icon: ImageIcon },
  { href: "/brand", label: "Marque", icon: Palette },
];
