const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" });
const MONTH_DAY = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", month: "long", day: "numeric" });

/** 서울 기준 날짜 "2026-10-11" */
export function seoulDate(iso: string): string {
  return DAY.format(new Date(iso));
}

/** 서울 기준 "10월 11일" */
export function seoulMonthDay(iso: string): string {
  return MONTH_DAY.format(new Date(iso));
}
