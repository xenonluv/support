import { ChevronDown, CircleUserRound, LogOut } from "lucide-react";
import { Brand } from "@/components/brand";
import { SidebarNav } from "@/components/sidebar-nav";
import type { CountKey } from "@/components/manager-nav";

type Props = {
  counts: Record<CountKey, number>;
  user: { displayName: string; affiliation: string };
};

/** PC(lg 이상) 전용 남색 사이드바. 기관 선택과 로그아웃은 5단계에서 연결한다. */
export function AppSidebar({ counts, user }: Props) {
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
      <SidebarNav counts={counts} />
      <div className="mt-auto border-t border-sidebar-border pt-4">
        <p className="px-2 font-semibold text-white">{user.displayName}</p>
        <p className="px-2 text-xs text-sidebar-foreground/70">{user.affiliation}</p>
        <button
          type="button"
          disabled
          className="mt-3 flex w-full items-center gap-2 rounded-lg border border-sidebar-border px-3 py-2 text-sm opacity-60"
        >
          <LogOut className="size-4" aria-hidden="true" />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
