import { describe, expect, it } from "vitest";
import { computeMetrics, hasAiDraft, type MetricRecord } from "@/lib/metrics/compute";

const MIN = 60_000;
const rec = (r: Partial<MetricRecord>): MetricRecord => ({
  workerId: "w1",
  visitedAt: "2026-10-12T01:00:00Z",
  aiDrafted: true,
  editRatio: 0,
  durationMs: 2 * MIN,
  ...r,
});

describe("hasAiDraft", () => {
  it("AI 초안에 내용이 있으면 true, 'AI 없이 직접 작성'(빈 초안)이면 false", () => {
    const empty = { summary: "", service_types: [], health: "", medication: "", meals: "", mood: "", living: "", services_provided: "", notes: "", follow_up: "" };
    expect(hasAiDraft({ ...empty, summary: "안부 확인" })).toBe(true);
    expect(hasAiDraft({ ...empty, service_types: ["안전지원"] })).toBe(true);
    expect(hasAiDraft(empty)).toBe(false);
    expect(hasAiDraft(null)).toBe(false);
    expect(hasAiDraft({ 이상한: "값" })).toBe(false);
  });
});

describe("computeMetrics", () => {
  it("기록이 없으면 0으로 나누지 않고 비어 있음을 알린다", () => {
    const m = computeMetrics([], { baselineMinutes: 10 });
    expect(m.records).toBe(0);
    expect(m.acceptance.rate).toBeNull();
    expect(m.writingTime.averageMinutes).toBeNull();
    expect(m.writingTime.reduction).toBeNull();
    expect(m.kpis.map((k) => k.met)).toEqual([null, false, false, null]);
  });

  it("수용률: AI 초안 기록 중 그대로·경미 수정(20% 이하) 비율, 직접 작성은 뺀다", () => {
    const m = computeMetrics(
      [
        rec({ editRatio: 0 }),
        rec({ editRatio: 0.2 }),
        rec({ editRatio: 0.05 }),
        rec({ editRatio: 0.21 }),
        rec({ aiDrafted: false, editRatio: 1 }),
      ],
      { baselineMinutes: null },
    );
    expect(m.acceptance).toEqual({ aiDrafted: 4, unchanged: 1, minor: 2, major: 1, rate: 0.75 });
    expect(m.kpis[3]).toMatchObject({ key: "acceptance", value: "75%", met: false });
  });

  it("직접 작성 기록만 있으면 수용률은 '없음'(0%가 아님)", () => {
    const m = computeMetrics([rec({ aiDrafted: false, editRatio: 1 })], { baselineMinutes: null });
    expect(m.acceptance.rate).toBeNull();
    expect(m.kpis[3]).toMatchObject({ value: "AI 초안 기록 없음", met: null });
  });

  it("작성시간: 30분 넘는 기록과 시간 없는 기록은 평균에서 빼고, 뺀 수를 알린다. 기존 시간 대비 단축률", () => {
    const m = computeMetrics(
      [rec({ durationMs: 2 * MIN }), rec({ durationMs: 4 * MIN }), rec({ durationMs: 3 * MIN }), rec({ durationMs: 45 * MIN }), rec({ durationMs: 0 }), rec({ durationMs: null })],
      { baselineMinutes: 10 },
    );
    expect(m.writingTime).toEqual({ counted: 3, excluded: 1, averageMinutes: 3, medianMinutes: 3, reduction: 0.7 });
    expect(m.kpis[0]).toMatchObject({ key: "time", value: "70% 단축 (평균 3.0분)", met: true });
  });

  it("기존 작성시간을 모르면 단축률은 계산하지 않는다", () => {
    const m = computeMetrics([rec({})], { baselineMinutes: null });
    expect(m.writingTime.reduction).toBeNull();
    expect(m.kpis[0]).toMatchObject({ value: "평균 2.0분 (기존 작성시간 미입력)", met: null });
  });

  it("참여 인원은 기록을 남긴 사람 수, 기간은 첫 기록일~마지막 기록일(서울, 첫날 포함)", () => {
    const m = computeMetrics(
      [
        rec({ workerId: "w1", visitedAt: "2026-10-01T15:30:00Z" }), // 서울 10-02 00:30
        rec({ workerId: "w2", visitedAt: "2026-10-15T09:00:00Z" }), // 서울 10-15
        rec({ workerId: "w2", visitedAt: "2026-10-10T09:00:00Z" }),
      ],
      { baselineMinutes: null },
    );
    expect([m.workers, m.firstDay, m.lastDay, m.days]).toEqual([2, "2026-10-02", "2026-10-15", 14]);
    expect(m.kpis[1]).toMatchObject({ key: "pilot", value: "2명 · 14일", met: false });
  });

  it("목표: 5명 이상·14일 이상, 200건 이상", () => {
    const many = Array.from({ length: 200 }, (_, i) =>
      rec({ workerId: `w${i % 5}`, visitedAt: new Date(Date.UTC(2026, 9, 1, 3) + (i % 14) * 86_400_000).toISOString() }),
    );
    const m = computeMetrics(many, { baselineMinutes: null });
    expect(m.kpis[1]).toMatchObject({ value: "5명 · 14일", met: true });
    expect(m.kpis[2]).toMatchObject({ key: "records", value: "200건", met: true });
  });
});
