import { seoulDate } from "@/lib/records/dates";
import type { SignalLevel, SignalType } from "@/schemas/signal";

// 관리자 대시보드 집계 — DB에서 읽은 행으로 화면 숫자를 계산한다(순수 함수, 시각은 인자로 받는다).

export type FlagStatus = "unchecked" | "checked" | "acting" | "resolved";

export type DashFlag = {
  clientId: string;
  type: SignalType;
  level: SignalLevel;
  status: FlagStatus;
  createdAt: string;
  resolvedAt: string | null;
  outcome: string | null;
  /** 이 신호가 나온 기록을 쓴 기관 */
  agencyId: string;
  evidence: string;
};
export type DashClient = { id: string; code: string; ageBand: number | null; dong: string };
export type DashRecord = { clientId: string; visitedAt: string; hasFlags: boolean };

export type ClientSignal = {
  type: SignalType;
  level: SignalLevel;
  /** 처음 발견된 날부터 오늘(해소됐으면 해소일)까지 일수, 첫날 = 1 */
  days: number;
  /** 48시간 안에 처음 발견 */
  isNew: boolean;
  agencyCount: number;
  status: FlagStatus;
  evidence: string;
};
export type ClientStatus = "caution" | "observe" | "resolved";
export type PriorityClient = {
  client: DashClient;
  status: ClientStatus;
  signals: ClientSignal[];
  agencyCount: number;
  maxDays: number;
};
export type Stat = { value: number; trend: number[] };
export type Dashboard = {
  totalClients: number;
  /** 주의 대상자 수 ("오늘 N명 중 먼저 볼 M명"의 M) */
  priorityCount: number;
  recordsToday: number;
  stats: { caution: Stat; observe: Stat; normal: Stat; earlyDetected: Stat };
  priority: PriorityClient[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const TREND_DAYS = 10;
const PROGRESS: Record<FlagStatus, number> = { unchecked: 0, checked: 1, acting: 2, resolved: 3 };

function dayNumber(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

function keyFromDayNumber(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

function summarize(group: DashFlag[], now: Date, untilKey: string): ClientSignal {
  const sorted = [...group].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const first = sorted[0];
  const latest = sorted[sorted.length - 1];
  return {
    type: first.type,
    level: group.some((f) => f.level === "caution") ? "caution" : "observe",
    days: dayNumber(untilKey) - dayNumber(seoulDate(first.createdAt)) + 1,
    isNew: now.getTime() - new Date(first.createdAt).getTime() < 2 * DAY_MS,
    agencyCount: new Set(group.map((f) => f.agencyId)).size,
    // 가장 덜 진행된 상태를 보인다: '조치 중'인 종류에 새 신호가 들어오면 다시 '미확인'으로 드러난다
    status: group.reduce<FlagStatus>((s, f) => (PROGRESS[f.status] < PROGRESS[s] ? f.status : s), group[0].status),
    evidence: latest.evidence,
  };
}

function groupByType(flags: DashFlag[]): DashFlag[][] {
  const map = new Map<SignalType, DashFlag[]>();
  for (const f of flags) map.set(f.type, [...(map.get(f.type) ?? []), f]);
  return [...map.values()];
}

const bySignalOrder = (a: ClientSignal, b: ClientSignal) =>
  a.level === b.level ? b.days - a.days : a.level === "caution" ? -1 : 1;

/**
 * 해소되지 않은 신호는 기간과 상관없이 항상 센다(오래 지속된 문제가 기간 밖이라고 사라지면 안 된다).
 * 기간(days)은 해소된 신호와 기록 수에만 적용한다.
 */
export function buildDashboard(input: {
  clients: DashClient[];
  flags: DashFlag[];
  records: DashRecord[];
  now: Date;
  days: number;
}): Dashboard {
  const { clients, flags, records, now, days } = input;
  const today = seoulDate(now.toISOString());
  const periodStart = now.getTime() - days * DAY_MS;
  const month = today.slice(0, 7);

  const priority: PriorityClient[] = [];
  for (const client of clients) {
    const mine = flags.filter((f) => f.clientId === client.id);
    const active = mine.filter((f) => f.status !== "resolved");
    if (active.length > 0) {
      const signals = groupByType(active).map((g) => summarize(g, now, today)).sort(bySignalOrder);
      priority.push({
        client,
        status: signals.some((s) => s.level === "caution") ? "caution" : "observe",
        signals,
        agencyCount: new Set(active.map((f) => f.agencyId)).size,
        maxDays: Math.max(...signals.map((s) => s.days)),
      });
      continue;
    }
    const resolved = mine.filter((f) => f.resolvedAt && new Date(f.resolvedAt).getTime() >= periodStart);
    if (resolved.length > 0) {
      const signals = groupByType(resolved).map((g) => {
        const lastResolved = g.map((f) => f.resolvedAt as string).sort().at(-1) as string;
        return { ...summarize(g, now, seoulDate(lastResolved)), isNew: false, status: "resolved" as const };
      });
      priority.push({
        client,
        status: "resolved",
        signals,
        agencyCount: new Set(resolved.map((f) => f.agencyId)).size,
        maxDays: Math.max(...signals.map((s) => s.days)),
      });
    }
  }

  const rank = (p: PriorityClient) => (p.status === "resolved" ? 0 : p.signals.length);
  priority.sort(
    (a, b) =>
      rank(b) - rank(a) || b.maxDays - a.maxDays || b.agencyCount - a.agencyCount || a.client.code.localeCompare(b.client.code),
  );

  const caution = priority.filter((p) => p.status === "caution").length;
  const observe = priority.filter((p) => p.status === "observe").length;

  // 이번 달 '연계로 이어진' 해소 (대상자·신호 종류 단위)
  const linked = new Map<string, string>();
  for (const f of flags) {
    if (f.outcome !== "linked" || !f.resolvedAt) continue;
    const key = seoulDate(f.resolvedAt);
    if (key.slice(0, 7) !== month) continue;
    const id = `${f.clientId}:${f.type}`;
    const prev = linked.get(id);
    if (!prev || key < prev) linked.set(id, key);
  }

  const window = Array.from({ length: TREND_DAYS }, (_, i) => keyFromDayNumber(dayNumber(today) - (TREND_DAYS - 1 - i)));
  const countFlagsOn = (level: SignalLevel, key: string) =>
    flags.filter((f) => f.level === level && seoulDate(f.createdAt) === key).length;

  return {
    totalClients: clients.length,
    priorityCount: caution,
    recordsToday: records.filter((r) => seoulDate(r.visitedAt) === today).length,
    stats: {
      caution: { value: caution, trend: window.map((k) => countFlagsOn("caution", k)) },
      observe: { value: observe, trend: window.map((k) => countFlagsOn("observe", k)) },
      normal: {
        value: clients.length - caution - observe,
        trend: window.map((k) => records.filter((r) => !r.hasFlags && seoulDate(r.visitedAt) === k).length),
      },
      earlyDetected: {
        value: linked.size,
        trend: window.map((k) => [...linked.values()].filter((d) => d <= k).length),
      },
    },
    priority,
  };
}
