import { describe, expect, it } from "vitest";
import { buildDashboard, type DashFlag } from "@/lib/dashboard/build";

// 기준 시각: 2026-10-14(수) 09:45 서울
const now = new Date("2026-10-14T00:45:00Z");
const clients = [
  { id: "a", code: "C-0012", ageBand: 70, dong: "서구 화정1동" },
  { id: "b", code: "C-0047", ageBand: 80, dong: "서구 화정2동" },
  { id: "c", code: "C-0063", ageBand: 80, dong: "서구 농성1동" },
  { id: "d", code: "C-0081", ageBand: 70, dong: "서구 화정1동" },
];
const flag = (f: Partial<DashFlag> & Pick<DashFlag, "clientId" | "type" | "level" | "createdAt">): DashFlag => ({
  status: "unchecked",
  resolvedAt: null,
  outcome: null,
  agencyId: "X",
  evidence: "근거",
  ...f,
});
const flags: DashFlag[] = [
  flag({ clientId: "a", type: "missed_medication", level: "caution", createdAt: "2026-10-11T23:00:00Z", evidence: "약을 이틀째" }), // 서울 10-12 08:00, 49시간 45분 전
  flag({ clientId: "a", type: "reduced_meal", level: "observe", createdAt: "2026-10-08T02:00:00Z", agencyId: "Y" }),
  flag({ clientId: "a", type: "reduced_meal", level: "observe", createdAt: "2026-10-11T02:00:00Z", agencyId: "X", evidence: "최근 근거" }),
  flag({ clientId: "a", type: "fall", level: "observe", createdAt: "2026-10-13T23:00:00Z" }),
  flag({ clientId: "b", type: "visit_refusal", level: "caution", createdAt: "2026-10-12T05:00:00Z", status: "checked" }),
  flag({
    clientId: "c",
    type: "reduced_meal",
    level: "observe",
    createdAt: "2026-10-09T05:00:00Z",
    status: "resolved",
    resolvedAt: "2026-10-13T05:00:00Z",
    outcome: "linked",
  }),
];
const records = [
  { clientId: "a", visitedAt: "2026-10-14T00:10:00Z", hasFlags: true },
  { clientId: "d", visitedAt: "2026-10-13T16:30:00Z", hasFlags: false }, // 서울 10-14 01:30
  { clientId: "d", visitedAt: "2026-10-13T05:00:00Z", hasFlags: false }, // 서울 10-13
];

const dash = buildDashboard({ clients, flags, records, now, days: 14 });

describe("buildDashboard — 먼저 확인할 어르신", () => {
  it("신호 수 → 지속 기간 → 관찰 기관 수 순으로 정렬하고, 해소된 대상자는 뒤에 둔다", () => {
    expect(dash.priority.map((p) => [p.client.code, p.status])).toEqual([
      ["C-0012", "caution"],
      ["C-0047", "caution"],
      ["C-0063", "resolved"],
    ]);
  });

  it("같은 종류 신호를 합쳐 지속 일수·신규·관찰 기관 수를 계산한다", () => {
    const a = dash.priority[0];
    expect(a.agencyCount).toBe(2);
    expect(a.signals.map((s) => [s.type, s.level, s.days, s.isNew])).toEqual([
      ["missed_medication", "caution", 3, false],
      ["reduced_meal", "observe", 7, false],
      ["fall", "observe", 1, true],
    ]);
    expect(a.signals[1].evidence).toBe("최근 근거");
    expect(a.signals[1].agencyCount).toBe(2);
  });

  it("진행 상태(확인함)를 신호에 붙인다", () => {
    expect(dash.priority[1].signals[0].status).toBe("checked");
  });

  it("같은 종류에 아직 확인하지 않은 새 신호가 있으면 덜 진행된 상태(미확인)로 보인다", () => {
    const later = buildDashboard({
      clients,
      flags: [
        flag({ clientId: "b", type: "missed_medication", level: "observe", createdAt: "2026-10-10T05:00:00Z", status: "acting" }),
        flag({ clientId: "b", type: "missed_medication", level: "caution", createdAt: "2026-10-13T05:00:00Z" }),
      ],
      records: [],
      now,
      days: 14,
    });
    expect(later.priority[0].signals[0].status).toBe("unchecked");
  });
});

describe("buildDashboard — 요약", () => {
  it("주의·관찰·특이사항 없음·이번 달 조기 발견을 센다", () => {
    expect(dash.totalClients).toBe(4);
    expect(dash.stats.caution.value).toBe(2);
    expect(dash.stats.observe.value).toBe(0);
    expect(dash.stats.normal.value).toBe(2);
    expect(dash.stats.earlyDetected.value).toBe(1);
    expect(dash.priorityCount).toBe(2);
  });

  it("오늘(서울) 접수된 기록 수를 센다", () => {
    expect(dash.recordsToday).toBe(2);
  });

  it("추이는 최근 10일(오래된 날 → 오늘) 값이다", () => {
    expect(dash.stats.caution.trend).toHaveLength(10);
    // 10-12에 새 주의 신호 2건
    expect(dash.stats.caution.trend[7]).toBe(2);
    // 10-14(오늘)에 신호 없는 기록 1건
    expect(dash.stats.normal.trend[9]).toBe(1);
  });
});
