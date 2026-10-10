import { AppSidebar } from "@/components/app-sidebar";
import { Brand } from "@/components/brand";
import { DemoBanner } from "@/components/demo-banner";
import { DEMO_COUNTS, DEMO_MANAGER } from "@/lib/demo";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <DemoBanner />
      <div className="flex flex-1">
        <AppSidebar counts={DEMO_COUNTS} user={DEMO_MANAGER} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center bg-sidebar px-4 py-3 lg:hidden">
            <Brand className="text-white" />
          </header>
          <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
