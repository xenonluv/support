import { Brand } from "@/components/brand";
import { DemoBanner } from "@/components/demo-banner";
import { WorkerTabBar } from "@/components/worker-tab-bar";
import { DEMO_WORKER } from "@/lib/demo";

export default function WorkerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <DemoBanner />
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <header className="flex items-center justify-between bg-sidebar px-4 py-3">
          <Brand className="text-white" />
          <span className="text-sm text-sidebar-foreground/80">{DEMO_WORKER.displayName}</span>
        </header>
        <main className="flex-1 px-4 pt-5 pb-[calc(6rem+env(safe-area-inset-bottom))]">{children}</main>
        <WorkerTabBar />
      </div>
    </div>
  );
}
