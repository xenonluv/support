import { describe, expect, it } from "vitest";
import { planPilotDemo, DEMO_DAYS, type DemoClient, type DemoWorker } from "@/lib/pilot/demo-plan";
import { maskPersonalInfo } from "@/lib/privacy/mask";
import { RECORD_FIELDS, RecordDraftSchema } from "@/schemas/record-draft";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-10-11T03:00:00Z"); // 서울 낮 12시
const [D, P, W, OTHER] = ["agency-dong", "agency-provider", "agency-welfare", "agency-test"];
const workers: DemoWorker[] = [
  { id: "d1", agencyId: D, agencyType: "dong_center" },
  { id: "d2", agencyId: D, agencyType: "dong_center" },
  ...["p1", "p2", "p3", "p4"].map((id): DemoWorker => ({ id, agencyId: P, agencyType: "provider" })),
  { id: "w1", agencyId: W, agencyType: "welfare_center" },
  { id: "w2", agencyId: W, agencyType: "welfare_center" },
];
// 지금 운영 구성과 같게: C-2001~2012 동+수행기관, C-2009~2020 동+복지관, 앱에서 등록한 대상자 1명
const clients: DemoClient[] = [
  ...Array.from({ length: 20 }, (_, i): DemoClient => {
    const n = 2001 + i;
    return { id: `c${n}`, code: `C-${n}`, dong: "○○동", ageBand: null, agencyIds: [D, ...(n <= 2012 ? [P] : []), ...(n >= 2009 ? [W] : [])] };
  }),
  { id: "c1234", code: "C-1234", dong: "북구 광산동", ageBand: 70, agencyIds: [D, P] },
  { id: "c-other", code: "C-0063", dong: "서구 화정1동", ageBand: 80, agencyIds: [OTHER] },
];
const plan = planPilotDemo({ clients, workers, now, seed: 20261011 });
const byClient = (id: string) => plan.records.filter((r) => r.clientId === id);

describe("파일럿 연습 데이터 계획", () => {
  it("파일럿 기관과 연결된 대상자만, 각 3~7건씩 채운다", () => {
    expect(byClient("c-other")).toHaveLength(0);
    for (const c of clients.slice(0, 21)) {
      const n = byClient(c.id).length;
      expect(n, c.code).toBeGreaterThanOrEqual(3);
      expect(n, c.code).toBeLessThanOrEqual(7);
    }
  });

  it("모든 기록이 기록 서식에 맞고, 서비스 유형·요약이 있다", () => {
    for (const r of plan.records) {
      for (const d of [r.draft, r.final]) {
        expect(RecordDraftSchema.safeParse(d).success).toBe(true);
        expect(d.summary).not.toBe("");
        expect(d.service_types.length).toBeGreaterThan(0);
      }
    }
  });

  it("작성자는 대상자와 연결된 기관의 현장 인력이고, 연결 기관이 둘 이상이면 둘 이상이 쓴다", () => {
    for (const r of plan.records) {
      const client = clients.find((c) => c.id === r.clientId);
      expect(client?.agencyIds).toContain(r.agencyId);
      expect(workers.find((w) => w.id === r.workerId)?.agencyId).toBe(r.agencyId);
    }
    for (const c of clients.slice(0, 21)) expect(new Set(byClient(c.id).map((r) => r.agencyId)).size, c.code).toBeGreaterThanOrEqual(2);
  });

  it("방문 시각은 모두 지난 3주 안의 과거다", () => {
    for (const r of plan.records) {
      const t = Date.parse(r.visitedAt);
      expect(t).toBeLessThan(now.getTime());
      expect(t).toBeGreaterThan(now.getTime() - (DEMO_DAYS + 1) * DAY);
    }
  });

  it("해소 안 된 신호 대상자 7명, 해소된 신호 대상자 4명. 두 기관이 함께 본 신호가 있다", () => {
    const flagged = plan.records.filter((r) => r.flags.length > 0);
    const open = new Set(flagged.filter((r) => r.flags.some((f) => f.status !== "resolved")).map((r) => r.clientId));
    const closed = new Set(flagged.filter((r) => r.flags.every((f) => f.status === "resolved")).map((r) => r.clientId));
    expect(open.size).toBe(7);
    expect(closed.size).toBe(4);
    const statuses = new Set(flagged.flatMap((r) => r.flags.map((f) => f.status)));
    expect([...statuses].sort()).toEqual(["acting", "checked", "resolved", "unchecked"]);
    const shared = [...open].some((id) => {
      const agenciesByType = new Map<string, Set<string>>();
      for (const r of byClient(id)) for (const f of r.flags) agenciesByType.set(f.type, (agenciesByType.get(f.type) ?? new Set()).add(r.agencyId));
      return [...agenciesByType.values()].some((s) => s.size >= 2);
    });
    expect(shared).toBe(true);
  });

  it("해소 안 된 신호가 있는 대상자는 첫 신호 뒤에 '평소대로' 기록이 끼지 않는다 (앞뒤가 맞게)", () => {
    const open = new Set(plan.records.filter((r) => r.flags.some((f) => f.status !== "resolved")).map((r) => r.clientId));
    for (const id of open) {
      const recs = byClient(id);
      const firstFlag = Math.min(...recs.filter((r) => r.flags.length > 0).map((r) => Date.parse(r.visitedAt)));
      for (const r of recs.filter((r) => r.flags.length === 0)) expect(Date.parse(r.visitedAt), id).toBeLessThan(firstFlag);
    }
  });

  it("해소된 신호는 해소 시각이 발견 뒤·지금 전이고, 알림 문안은 주의 신호에만 붙는다", () => {
    for (const r of plan.records) {
      for (const f of r.flags) {
        expect(f.quote.length).toBeGreaterThan(0);
        expect(f.quote.length).toBeLessThanOrEqual(500);
        if (f.status === "resolved") {
          expect(Date.parse(f.resolvedAt ?? "")).toBeGreaterThan(Date.parse(r.visitedAt));
          expect(Date.parse(f.resolvedAt ?? "")).toBeLessThan(now.getTime());
        } else {
          expect(f.resolvedAt).toBeNull();
        }
      }
      if (r.alert) {
        expect(r.flags.some((f) => f.level === "caution")).toBe(true);
        const client = clients.find((c) => c.id === r.clientId);
        expect(r.alert).toContain(client?.code);
        expect(r.alert).not.toContain("{");
      }
    }
    expect(plan.records.filter((r) => r.alert).length).toBe(3);
  });

  it("연령대는 비어 있는 대상자에게만 채운다", () => {
    expect(plan.ageBands).toHaveLength(20);
    expect(plan.ageBands.some((a) => a.clientId === "c1234")).toBe(false);
    for (const a of plan.ageBands) expect([60, 70, 80, 90]).toContain(a.ageBand);
  });

  it("개인정보 마스킹에 걸리는 글이 없다 (성명·연락처·주소 없음)", () => {
    for (const r of plan.records) {
      const texts = [...RECORD_FIELDS.map(({ key }) => r.final[key]), ...r.flags.map((f) => f.quote), r.alert ?? ""];
      for (const t of texts) expect(maskPersonalInfo(t).count, t).toBe(0);
    }
  });

  it("같은 seed면 같은 결과, 다른 seed면 다른 결과", () => {
    expect(planPilotDemo({ clients, workers, now, seed: 20261011 })).toEqual(plan);
    expect(planPilotDemo({ clients, workers, now, seed: 7 })).not.toEqual(plan);
  });
});
