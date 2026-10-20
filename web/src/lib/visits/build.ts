import type { ClientDisplay } from "@/lib/client-label";

// 현장 '오늘의 방문' 카드 집계 — DB에서 읽은 행으로 계산한다(순수 함수).

export type VisitClient = ClientDisplay & { id: string };
export type VisitRow = { clientId: string; visitedAt: string; workerId: string };
export type OpenFlagRow = { clientId: string; type: string; level: string };

export type VisitCard = VisitClient & {
  /** 누가 다녀왔든 가장 최근 방문. 기록이 없으면 null */
  lastVisitedAt: string | null;
  /** 내가 쓴 기록 수(기간 무관) */
  myRecords: number;
  /** 해소되지 않은 신호 종류 수 */
  openSignals: number;
  /** 해소되지 않은 신호 중 주의 등급이 있는지 */
  caution: boolean;
};

/** 대상자 순서는 받은 그대로(번호순) 둔다 */
export function buildVisitCards(clients: VisitClient[], visits: VisitRow[], flags: OpenFlagRow[], userId: string): VisitCard[] {
  const last = new Map<string, VisitRow>();
  const mine = new Map<string, number>();
  for (const v of visits) {
    if (v.workerId === userId) mine.set(v.clientId, (mine.get(v.clientId) ?? 0) + 1);
    const prev = last.get(v.clientId);
    if (!prev || Date.parse(v.visitedAt) > Date.parse(prev.visitedAt)) last.set(v.clientId, v);
  }
  const types = new Map<string, Set<string>>();
  const caution = new Set<string>();
  for (const f of flags) {
    if (!types.has(f.clientId)) types.set(f.clientId, new Set());
    types.get(f.clientId)?.add(f.type);
    if (f.level === "caution") caution.add(f.clientId);
  }
  return clients.map((c) => {
    const v = last.get(c.id);
    return {
      ...c,
      lastVisitedAt: v?.visitedAt ?? null,
      myRecords: mine.get(c.id) ?? 0,
      openSignals: types.get(c.id)?.size ?? 0,
      caution: caution.has(c.id),
    };
  });
}
