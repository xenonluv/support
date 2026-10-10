import { Suspense } from "react";
import { Brand } from "@/components/brand";
import { DemoBanner } from "@/components/demo-banner";
import { HeaderUserName, LogoutButton } from "@/components/user-info";
import { WorkerTabBar } from "@/components/worker-tab-bar";

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <DemoBanner />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 bg-sidebar px-4 py-3">
          <Brand className="text-white" />
          <div className="flex items-center gap-3 text-sm text-sidebar-foreground/80">
            <Suspense fallback={null}>
              <HeaderUserName />
            </Suspense>
            <LogoutButton className="rounded-md px-1 py-1" />
          </div>
        </header>
        <main className="flex-1 px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))]">{children}</main>
        <WorkerTabBar />
      </div>
    </div>
  );
}
