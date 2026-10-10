import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MANAGER_NAV } from "@/components/manager-nav";
import { WORKER_TABS } from "@/components/worker-tabs";

function pageExists(group: string, href: string): boolean {
  return existsSync(new URL(`../src/app/(${group})${href}/page.tsx`, import.meta.url));
}

describe("관리자 메뉴", () => {
  it("링크가 있는 메뉴는 모두 실제 페이지로 연결된다 (없는 화면은 href 없이 '준비 중')", () => {
    const hrefs = MANAGER_NAV.flatMap((s) => s.items).flatMap((i) => (i.href ? [i.href] : []));
    expect(hrefs.length).toBeGreaterThan(0);
    for (const href of hrefs) expect(pageExists("manager", href), href).toBe(true);
  });
});

describe("현장 화면 아래 탭", () => {
  it("탭 3개가 모두 실제 페이지로 연결된다", () => {
    expect(WORKER_TABS.map((t) => t.label)).toEqual(["오늘의 방문", "기록하기", "내 기록"]);
    for (const t of WORKER_TABS) expect(pageExists("worker", t.href), t.href).toBe(true);
  });
});
