import { Suspense } from "react";
import { ChevronDown, CircleUserRound } from "lucide-react";
import { Brand } from "@/components/brand";
import { NavList, SidebarNav } from "@/components/sidebar-nav";
import { LogoutButton, SidebarUserInfo } from "@/components/user-info";
import { getSidebarCounts } from "@/lib/dashboard/data";

/** PC(lg 이상) 전용 남색 사이드바. 기관 선택은 아직 비활성. */
export function AppSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col gap-6 bg-sidebar px-4 py-6 text-sidebar-foreground lg:sticky lg:top-0 lg:flex lg:h-dvh">
      <Brand className="px-2 text-white" />
      <button
        type="button"
        disabled
        className="flex items-center gap-3 rounded-lg border border-sidebar-border px-3 py-2.5 text-left text-sm font-medium"
      >
        <CircleUserRound className="size-6 shrink-0" aria-hidden="true" />
        <span className="flex-1">광주다움 통합돌봄</span>
        <ChevronDown className="size-4" aria-hidden="true" />
      </button>
      <Suspense fallback={<NavList pathname="" />}>
        <SidebarNavWithCounts />
      </Suspense>
      <div className="mt-auto border-t border-sidebar-border pt-4">
        <Suspense fallback={<p className="px-2 text-sm text-sidebar-foreground/60">불러오는 중…</p>}>
          <SidebarUserInfo />
        </Suspense>
        <LogoutButton className="mt-3 w-full rounded-lg border border-sidebar-border px-3 py-2 text-sm hover:bg-sidebar-accent" />
      </div>
    </aside>
  );
}

// 사이드바 숫자는 세션을 읽으므로 Suspense 안에서 채운다
async function SidebarNavWithCounts() {
  return <SidebarNav counts={await getSidebarCounts()} />;
}
