"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Search, FilePlus, CalendarPlus, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/sidebar";
import { CommandPalette } from "@/components/layout/command-palette";
import { AiStatusBadge } from "@/components/layout/ai-status-badge";

type PageAction = { label: string; href: string; icon: typeof FilePlus };

function getPageMeta(pathname: string): { title: string; action?: PageAction } {
  if (pathname === "/") {
    return { title: "Calendrier", action: { label: "Générer une semaine", href: "/calendar/new", icon: CalendarPlus } };
  }
  if (pathname === "/publications") {
    return { title: "Publications", action: { label: "Nouvelle publication", href: "/publications/new", icon: FilePlus } };
  }
  if (pathname === "/publications/new") return { title: "Nouvelle publication" };
  if (pathname.startsWith("/publications/")) return { title: "Publication" };
  if (pathname === "/calendar/new") return { title: "Générer une semaine" };
  if (pathname === "/images") return { title: "Images" };
  if (pathname === "/brand") return { title: "Marque" };
  return { title: "" };
}

export function Topbar({ publishErrorCount = 0 }: { publishErrorCount?: number }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const pathname = usePathname();
  const { title, action } = getPageMeta(pathname);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setCommandOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-sm md:px-8">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setMobileNavOpen(true)}
        aria-label="Ouvrir la navigation"
      >
        <Menu className="size-5" />
      </Button>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar onNavigate={() => setMobileNavOpen(false)} forceExpanded />
        </SheetContent>
      </Sheet>

      <h1 className="min-w-0 truncate text-lg font-semibold tracking-tight">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        {publishErrorCount > 0 ? (
          <Link
            href="/publications"
            className="hidden items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 sm:inline-flex"
          >
            <TriangleAlert className="size-3.5" />
            {publishErrorCount === 1
              ? "1 publication à vérifier"
              : `${publishErrorCount} publications à vérifier`}
          </Link>
        ) : null}
        <AiStatusBadge />
        <Button
          variant="outline"
          size="sm"
          className="hidden text-muted-foreground sm:flex"
          onClick={() => setCommandOpen(true)}
        >
          <Search className="size-4" />
          Rechercher
          <kbd className="ml-2 rounded border bg-muted px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
        </Button>
        {action ? (
          <Button asChild size="sm">
            <Link href={action.href}>
              <action.icon className="size-4" />
              {action.label}
            </Link>
          </Button>
        ) : null}
      </div>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </header>
  );
}
