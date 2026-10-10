"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { MANAGER_NAV, type CountKey } from "@/components/manager-nav";

/** 현재 주소로 선택 메뉴를 표시한다. 주소를 읽으므로 반드시 <Suspense> 안에서 쓴다. */
export function SidebarNav({ counts }: { counts?: Record<CountKey, number> }) {
  return <NavList counts={counts} pathname={usePathname()} />;
}

/** 주소를 읽지 않는 메뉴 (불러오는 중 화면용). counts가 없으면 숫자를 비워 둔다. */
export function NavList({ counts, pathname }: { counts?: Record<CountKey, number>; pathname: string }) {
  return (
    <nav aria-label="관리자 메뉴" className="flex flex-col gap-6">
      {MANAGER_NAV.map((section) => (
        <div key={section.title}>
          <p className="px-3 text-xs font-medium text-sidebar-foreground/60">{section.title}</p>
          <ul className="mt-2 flex flex-col gap-1">
            {section.items.map((item) => {
              const Icon = item.icon;
              const count = item.countKey && counts ? counts[item.countKey] : undefined;
              const active = item.href !== undefined && pathname.startsWith(item.href);
              const body = (
                <>
                  <Icon className="size-5 shrink-0" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  {count !== undefined && <span className="text-sm tabular-nums opacity-80">{count}</span>}
                  {!item.href && <span className="text-[10px] opacity-70">준비 중</span>}
                </>
              );
              return (
                <li key={item.label}>
                  {item.href ? (
                    <Link
                      href={item.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      )}
                    >
                      {body}
                    </Link>
                  ) : (
                    <span
                      aria-disabled="true"
                      className="flex cursor-not-allowed items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium opacity-50"
                    >
                      {body}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
