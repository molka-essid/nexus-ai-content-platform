import type { ReactNode } from "react";
import { DashboardShell } from "@/components/layout/dashboard-shell";

// Every dashboard page reads live DB data (publications, images, brand,
// calendar). Without a session/cookies() call forcing dynamic rendering
// (which is what happened here before auth was simplified), Next.js will
// statically pre-render these pages at build time and bake in a stale
// snapshot — force dynamic rendering explicitly so data is always fresh.
export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
