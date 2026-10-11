"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { WORKER_TABS } from "@/components/worker-tabs";

/** 현재 주소로 선택 탭을 표시한다. 주소를 읽으므로 반드시 <Suspense> 안에서 쓴다(대상자 상황처럼 주소에 id가 있는 화면). */
export function WorkerTabBar() {
  return <TabList pathname={usePathname()} />;
}

/** 한 손 조작용 하단 탭. 누르는 영역은 높이 56px 이상. pathname이 빈 문자열이면 선택 표시 없이 그린다(불러오는 중 화면용). */
export function TabList({ pathname }: { pathname: string }) {
  return (
    <nav
      aria-label="현장 메뉴"
      className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-3">
        {WORKER_TABS.map(({ label, icon: Icon, href }) => {
          const active = pathname !== "" && pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="size-6" aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
