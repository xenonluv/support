import { AppSidebar } from "@/components/app-sidebar";
import { Brand } from "@/components/brand";
import { DemoBanner } from "@/components/demo-banner";
import { LogoutButton } from "@/components/user-info";
import { DEMO_COUNTS } from "@/lib/demo";

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <DemoBanner />
      <div className="flex flex-1">
        <AppSidebar counts={DEMO_COUNTS} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between bg-sidebar px-4 py-3 lg:hidden">
            <Brand className="text-white" />
            <LogoutButton className="text-sm text-sidebar-foreground/80" />
          </header>
          <main className="flex-1 px-4 py-6 lg:px-10 lg:py-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
