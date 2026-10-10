import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SourceRecord } from "@/lib/briefing/data";
import type { RecordDraft } from "@/schemas/record-draft";
import { BRIEFING_FIXTURE } from "../fixtures/briefing";

const claims = vi.fn();
const inserted: unknown[] = [];
const insertResult = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getClaims: async () => ({ data: claims() }) },
    from: (table: string) => ({
      insert: async (row: unknown) => {
        inserted.push({ table, row });
        return insertResult();
      },
    }),
  }),
}));
const sourceMock = vi.fn();
vi.mock("@/lib/briefing/data", () => ({ loadBriefingSource: (...args: unknown[]) => sourceMock(...args) }));
const briefingMock = vi.fn();
vi.mock("@/lib/ai/briefing", () => ({ generateBriefing: (...args: unknown[]) => briefingMock(...args) }));
const refreshMock = vi.fn();
vi.mock("next/cache", () => ({ refresh: () => refreshMock() }));

const { createBriefing } = await import("@/lib/briefing/actions");
const { AiConfigError, AiRefusedError, AiFailedError } = await import("@/lib/ai/client");

const final: RecordDraft = {
  summary: "안부 확인",
  service_types: [],
  health: "",
  medication: "",
  meals: "",
  mood: "",
  living: "",
  services_provided: "",
  notes: "",
  follow_up: "",
};
const record: SourceRecord = { visitedAt: "2026-10-09T01:00:00Z", createdAt: "2026-10-09T01:05:00Z", agency: "화정1동 행정복지센터", record: final };
const source = {
  clientId: "client-12",
  subject: { code: "C-0012", ageBand: 70, dong: "서구 화정1동" },
  records: [record],
  signals: [],
};
const asManager = () => claims.mockReturnValue({ claims: { sub: "manager-1", app_metadata: { role: "manager" } } });

describe("createBriefing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    inserted.length = 0;
    asManager();
    sourceMock.mockResolvedValue(source);
    briefingMock.mockResolvedValue({ content: BRIEFING_FIXTURE, model: "m" });
    insertResult.mockReturnValue({ error: null });
  });

  it("관리자가 만들면 기간 안 기록으로 요약하고, 본인 이름으로 저장한 뒤 화면을 새로 그린다", async () => {
    expect(await createBriefing({ clientCode: "C-0012", days: 14 })).toEqual({ ok: true });
    const [, code, period] = sourceMock.mock.calls[0];
    expect(code).toBe("C-0012");
    expect(period.days).toBe(14);
    expect(briefingMock).toHaveBeenCalledWith({ subject: source.subject, period, records: [record], signals: [] });
    expect(inserted).toEqual([
      {
        table: "briefings",
        row: {
          client_id: "client-12",
          period_from: period.from,
          period_to: period.to,
          body: JSON.stringify(BRIEFING_FIXTURE),
          created_by: "manager-1",
        },
      },
    ]);
    expect(refreshMock).toHaveBeenCalledOnce();
  });

  it("입력이 틀리면 거절 (기간은 7·14·30일만)", async () => {
    expect(await createBriefing({ clientCode: "C-0012", days: 10 })).toMatchObject({ ok: false });
    expect(await createBriefing({ clientCode: "김영희", days: 14 })).toMatchObject({ ok: false });
    expect(await createBriefing(null)).toMatchObject({ ok: false });
    expect(sourceMock).not.toHaveBeenCalled();
  });

  it("로그인하지 않았거나 현장 인력이면 거절하고 Claude를 부르지 않는다", async () => {
    claims.mockReturnValue(null);
    expect(await createBriefing({ clientCode: "C-0012", days: 14 })).toEqual({ ok: false, error: "다시 로그인해 주세요." });
    claims.mockReturnValue({ claims: { sub: "worker-1", app_metadata: { role: "worker" } } });
    expect(await createBriefing({ clientCode: "C-0012", days: 14 })).toEqual({ ok: false, error: "브리핑은 관리자만 만들 수 있어요." });
    expect(briefingMock).not.toHaveBeenCalled();
  });

  it("볼 수 없는 대상자, 기간 안 기록 0건이면 Claude를 부르지 않는다", async () => {
    sourceMock.mockResolvedValueOnce(null);
    expect(await createBriefing({ clientCode: "C-0063", days: 14 })).toEqual({ ok: false, error: "볼 수 없는 대상자예요." });
    sourceMock.mockResolvedValueOnce({ ...source, records: [] });
    expect(await createBriefing({ clientCode: "C-0012", days: 7 })).toEqual({ ok: false, error: "이 기간에는 기록이 없어 만들 수 없어요." });
    expect(briefingMock).not.toHaveBeenCalled();
    expect(inserted).toEqual([]);
  });

  it("AI 오류는 종류별 안내로 바꾸고 저장하지 않는다", async () => {
    briefingMock.mockRejectedValueOnce(new AiConfigError());
    expect(await createBriefing({ clientCode: "C-0012", days: 14 })).toMatchObject({ ok: false, error: expect.stringContaining("AI 설정") });
    briefingMock.mockRejectedValueOnce(new AiRefusedError("general_harms"));
    expect(await createBriefing({ clientCode: "C-0012", days: 14 })).toMatchObject({ ok: false, error: expect.stringContaining("만들지 못했어요") });
    briefingMock.mockRejectedValueOnce(new AiFailedError("max_tokens"));
    expect(await createBriefing({ clientCode: "C-0012", days: 14 })).toMatchObject({ ok: false, error: expect.stringContaining("만들지 못했어요") });
    expect(inserted).toEqual([]);
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("저장이 실패하면 알리고 화면을 새로 그리지 않는다", async () => {
    insertResult.mockReturnValueOnce({ error: { code: "42501" } });
    expect(await createBriefing({ clientCode: "C-0012", days: 14 })).toEqual({ ok: false, error: "브리핑을 저장하지 못했어요. 다시 시도해 주세요." });
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
