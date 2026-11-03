import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { countPublicationsWithPublishErrors } from "@/lib/data/publications";

export async function DashboardShell({ children }: { children: ReactNode }) {
  const publishErrorCount = await countPublicationsWithPublishErrors();

  return (
    <div className="flex min-h-svh">
      <aside className="hidden shrink-0 md:block">
        <Sidebar />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar publishErrorCount={publishErrorCount} />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
