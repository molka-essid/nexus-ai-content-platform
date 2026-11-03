"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ChevronsLeft, ChevronsRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { navItems } from "@/components/layout/nav-items";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const COLLAPSE_STORAGE_KEY = "alta-sidebar-collapsed";

export function Sidebar({
  onNavigate,
  forceExpanded,
}: {
  onNavigate?: () => void;
  /** Used by the mobile drawer — an icon-only rail makes no sense inside an already-narrow overlay. */
  forceExpanded?: boolean;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Read the persisted preference after mount only, so the server-rendered
  // (always-expanded) markup matches the client's first paint — avoids a
  // hydration mismatch from reading localStorage during render.
  useEffect(() => {
    if (forceExpanded) return;
    setMounted(true);
    if (localStorage.getItem(COLLAPSE_STORAGE_KEY) === "1") setCollapsed(true);
  }, [forceExpanded]);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  return (
    <div
      className={cn(
        "bg-gradient-brand flex h-full flex-col text-sidebar-foreground transition-[width] duration-200",
        mounted && collapsed ? "w-[72px]" : "w-64",
      )}
    >
      <div className="flex h-16 shrink-0 items-center justify-between gap-1 border-b border-white/10 px-4">
        <div className="flex min-w-0 items-center gap-1 text-lg font-bold tracking-tight">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sm font-black text-sidebar-primary-foreground">
            A
          </span>
          {!collapsed || !mounted ? (
            <span className="truncate">
              ALTA <span className="text-sidebar-primary">SERVICES</span>
            </span>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;

          const link = (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150",
                collapsed && mounted && "justify-center px-0",
                isActive ? "text-sidebar-accent-foreground" : "text-sidebar-foreground/75 hover:text-sidebar-accent-foreground",
              )}
            >
              {isActive ? (
                <motion.span
                  layoutId="sidebar-active-pill"
                  className="absolute inset-0 rounded-lg bg-sidebar-accent shadow-sm"
                  transition={{ type: "spring", stiffness: 500, damping: 40 }}
                />
              ) : null}
              <span
                className={cn(
                  "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-md transition-colors",
                  isActive ? "bg-white/15" : "group-hover:bg-white/5",
                )}
              >
                <Icon className="size-4" />
              </span>
              {!collapsed || !mounted ? <span className="relative z-10 truncate">{item.label}</span> : null}
            </Link>
          );

          if (collapsed && mounted) {
            return (
              <Tooltip key={item.href} delayDuration={100}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }
          return link;
        })}
      </nav>

      <div className="flex items-center justify-between gap-2 border-t border-white/10 px-4 py-3">
        {!collapsed || !mounted ? (
          <span className="truncate text-xs text-sidebar-foreground/60">notre expertise la relation client</span>
        ) : null}
        {forceExpanded ? null : (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Déplier le menu" : "Réduire le menu"}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-white/10 hover:text-sidebar-foreground"
          >
            {collapsed && mounted ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
