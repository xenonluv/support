"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { WORKER_TABS } from "@/components/worker-tabs";

/** 한 손 조작용 하단 탭. 누르는 영역은 높이 56px 이상. */
export function WorkerTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="현장 메뉴"
      className="fixed bottom-0 left-1/2 w-full max-w-md -translate-x-1/2 border-t bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-3">
        {WORKER_TABS.map(({ label, icon: Icon, href }) => {
          const active = pathname.startsWith(href);
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
