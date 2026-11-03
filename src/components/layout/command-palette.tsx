"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FilePlus, CalendarPlus, FileText } from "lucide-react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { navItems } from "@/components/layout/nav-items";

type PublicationHit = { id: string; title: string; category: string };

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [publications, setPublications] = useState<PublicationHit[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  // Loaded once per open (not per keystroke) — cmdk does the actual text
  // filtering against each CommandItem's `value` client-side.
  async function handleOpenChange(nextOpen: boolean) {
    onOpenChange(nextOpen);
    if (nextOpen && publications === null) {
      setIsLoading(true);
      try {
        const response = await fetch("/api/publications");
        const data = await response.json();
        setPublications(data.map((p: PublicationHit) => ({ id: p.id, title: p.title, category: p.category })));
      } catch {
        setPublications([]);
      } finally {
        setIsLoading(false);
      }
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={handleOpenChange}>
      {/* cmdk's Input/List/Item primitives need this root to provide their
          internal store via context — without it, CommandInput crashes the
          moment it mounts. */}
      <Command>
        <CommandInput placeholder="Rechercher une publication ou accéder à..." />
        <CommandList>
          <CommandEmpty>
            {isLoading ? "Chargement…" : "Aucune publication trouvée."}
          </CommandEmpty>
          <CommandGroup heading="Actions">
            <CommandItem value="Nouvelle publication" onSelect={() => go("/publications/new")}>
              <FilePlus />
              Nouvelle publication
            </CommandItem>
            <CommandItem value="Générer une semaine" onSelect={() => go("/calendar/new")}>
              <CalendarPlus />
              Générer une semaine
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Aller à">
            {navItems.map((item) => (
              <CommandItem key={item.href} value={item.label} onSelect={() => go(item.href)}>
                <item.icon />
                {item.label}
              </CommandItem>
            ))}
          </CommandGroup>
          {publications && publications.length > 0 ? (
            <>
              <CommandSeparator />
              <CommandGroup heading="Publications">
                {publications.map((pub) => (
                  <CommandItem
                    key={pub.id}
                    value={pub.title}
                    onSelect={() => go(`/publications/${pub.id}`)}
                  >
                    <FileText />
                    {pub.title}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          ) : null}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
