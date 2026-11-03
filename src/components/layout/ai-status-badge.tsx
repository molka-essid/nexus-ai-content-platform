"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type QuotaStatus = { available: boolean; blockedUntil: string | null };

const POLL_INTERVAL_MS = 30_000;
const TICK_INTERVAL_MS = 1_000;

function formatRemaining(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  if (hours > 0) return `${hours} h ${minutes} min`;
  if (minutes > 0) return `${minutes} min`;
  return `${totalSeconds} s`;
}

// Shared, site-wide indicator (backed by AiQuotaStatus in the DB, not
// per-browser state) — every staff member sees the same red/green light,
// since the AI quota is shared across the whole workspace.
export function AiStatusBadge() {
  const [status, setStatus] = useState<QuotaStatus | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const response = await fetch("/api/ai/quota-status");
        if (!response.ok) return;
        const data: QuotaStatus = await response.json();
        if (!cancelled) setStatus(data);
      } catch {
        // Silently skip — a failed poll just means the badge keeps its last
        // known state until the next one succeeds.
      }
    }
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

  const blockedUntilMs = status.blockedUntil ? new Date(status.blockedUntil).getTime() : null;
  const isAvailable = status.available && (!blockedUntilMs || blockedUntilMs <= now);

  return (
    <span
      className={cn(
        "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium sm:inline-flex",
        isAvailable
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-red-200 bg-red-50 text-red-700",
      )}
    >
      <span className={cn("size-1.5 rounded-full", isAvailable ? "bg-emerald-500" : "bg-red-500")} />
      {isAvailable ? "IA disponible" : `Limite atteinte — réessayez dans ${formatRemaining(blockedUntilMs! - now)}`}
    </span>
  );
}
