import { seoulDate } from "@/lib/records/dates";

const DAY_MS = 24 * 60 * 60 * 1000;
const KST_MS = 9 * 60 * 60 * 1000;

export type BriefingPeriod = {
  days: number;
  /** 서울 기준 시작일 "2026-09-29" (briefings.period_from) */
  from: string;
  /** 서울 기준 종료일 = 오늘 (briefings.period_to) */
  to: string;
  /** 시작일 서울 0시의 ISO 시각 — visited_at 조회 하한 */
  startIso: string;
  /** "9월 29일 ~ 10월 12일" */
  label: string;
};

const utcDay = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
};
const monthDay = (key: string) => {
  const [, m, d] = key.split("-").map(Number);
  return `${m}월 ${d}일`;
};

/** 브리핑 기간: 서울 기준 오늘을 포함한 최근 N일 */
export function briefingPeriod(now: Date, days: number): BriefingPeriod {
  const to = seoulDate(now.toISOString());
  const fromUtc = utcDay(to) - (days - 1) * DAY_MS;
  const from = new Date(fromUtc).toISOString().slice(0, 10);
  return {
    days,
    from,
    to,
    startIso: new Date(fromUtc - KST_MS).toISOString(),
    label: `${monthDay(from)} ~ ${monthDay(to)}`,
  };
}
