import { beforeEach, describe, expect, it, vi } from "vitest";
import { DRAFT_FIXTURE } from "../fixtures/record-draft";

// 테이블별 결과를 정해 두는 supabase 흉내. insert 횟수를 센다.
const inserts: string[] = [];
const results: Record<string, { data: unknown; error: unknown }> = {};
function chain(table: string) {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq"]) q[m] = () => q;
  q.insert = () => {
    inserts.push(table);
    return q;
  };
  q.single = async () => results[table];
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(results[table]).then(resolve);
  return q;
}
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: { claims: { sub: "worker-1" } } }) },
    from: (table: string) => chain(table),
  }),
}));

const { saveRecord } = await import("@/lib/records/save");

const input = {
  clientCode: "C-0012",
  transcript: "어르신께서 혈압약을 이틀째 안 드셨다고 하셨어요",
  draft: DRAFT_FIXTURE,
  final: DRAFT_FIXTURE,
  inputMode: "text",
  sttEngine: null,
  durationMs: 60_000,
  signals: [{ type: "missed_medication", level: "caution", evidence_quote: "혈압약을 이틀째 안 드셨다고" }],
  alertDraft: "화정1동 통합돌봄 담당자님, 확인이 필요해 공유드립니다.",
};

describe("saveRecord", () => {
  beforeEach(() => {
    inserts.length = 0;
    results.workers = { data: { agency_id: "agency-a" }, error: null };
    results.clients = { data: { id: "client-12" }, error: null };
    results.visit_records = { data: { id: "record-1", visited_at: "2026-10-11T03:00:00Z" }, error: null };
    results.flags = { data: [{ id: "flag-1" }], error: null };
    results.alert_drafts = { data: null, error: null };
  });

  it("기록·신호·알림 문안을 저장한다", async () => {
    expect(await saveRecord(input)).toEqual({ ok: true, id: "record-1", visitedAt: "2026-10-11T03:00:00Z" });
    expect(inserts).toEqual(["visit_records", "flags", "alert_drafts"]);
  });

  it("기록은 저장됐는데 신호 저장이 실패하면 '저장됨'으로 알려 다시 저장(중복 기록)하지 않게 하고, 경고만 붙인다", async () => {
    results.flags = { data: null, error: { code: "42501" } };
    const result = await saveRecord(input);
    expect(result).toMatchObject({ ok: true, id: "record-1", warning: expect.stringContaining("신호") });
  });

  it("알림 문안 저장만 실패해도 마찬가지로 '저장됨' + 경고", async () => {
    results.alert_drafts = { data: null, error: { code: "08006" } };
    expect(await saveRecord(input)).toMatchObject({ ok: true, warning: expect.any(String) });
  });

  it("기록 자체를 저장하지 못하면 실패로 알린다", async () => {
    results.visit_records = { data: null, error: { code: "08006" } };
    expect(await saveRecord(input)).toMatchObject({ ok: false });
    expect(inserts).toEqual(["visit_records"]);
  });
});
