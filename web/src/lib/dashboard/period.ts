export const PERIOD_OPTIONS = [7, 14, 30] as const;

/** 주소의 ?days= 값을 7·14·30 중 하나로. 그 밖이면 14(2주) */
export function parseDays(raw: string | string[] | undefined): number {
  const n = Number(Array.isArray(raw) ? raw[0] : raw);
  return (PERIOD_OPTIONS as readonly number[]).includes(n) ? n : 14;
}
