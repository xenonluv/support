import { beforeEach, describe, expect, it, vi } from "vitest";

// supabase 쿼리 체인을 흉내 낸다: 부른 메서드를 기록하고, 끝에서 정해 둔 결과를 돌려준다
const calls: [string, string, unknown[]][] = [];
function chain(table: string, result: unknown) {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "update", "eq", "neq", "lte"]) {
    q[m] = (...args: unknown[]) => {
      calls.push([table, m, args]);
      return q;
    };
  }
  q.maybeSingle = async () => result;
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return q;
}
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: { sub: "manager-1" } } }) },
    from: (table: string) =>
      table === "clients" ? chain(table, { data: { id: "client-12" } }) : chain(table, { data: [{ id: "f1" }], error: null }),
  }),
}));
vi.mock("next/cache", () => ({ refresh: () => {} }));

const { updateSignalStatus } = await import("@/lib/dashboard/actions");

describe("updateSignalStatus", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("화면을 연 시각(seenAt) 이전에 생긴 신호만 바꾼다 — 그 뒤 들어온 새 신호는 그대로 둔다", async () => {
    const seenAt = "2026-10-11T03:00:00.000Z";
    expect(await updateSignalStatus({ clientCode: "C-0012", type: "fall", status: "resolved", seenAt })).toEqual({ ok: true });
    const flagCalls = calls.filter(([t]) => t === "flags").map(([, m, a]) => [m, a[0], a[1]]);
    expect(flagCalls).toContainEqual(["eq", "client_id", "client-12"]);
    expect(flagCalls).toContainEqual(["eq", "type", "fall"]);
    expect(flagCalls).toContainEqual(["neq", "status", "resolved"]);
    expect(flagCalls).toContainEqual(["lte", "created_at", seenAt]);
  });

  it("seenAt이 없거나 시각 형식이 아니면 거절한다", async () => {
    expect(await updateSignalStatus({ clientCode: "C-0012", type: "fall", status: "checked" })).toMatchObject({ ok: false });
    expect(await updateSignalStatus({ clientCode: "C-0012", type: "fall", status: "checked", seenAt: "어제" })).toMatchObject({ ok: false });
    expect(calls).toEqual([]);
  });
});
