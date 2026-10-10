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

const DATE_TIME = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/** 서울 기준 "2026년 10월 14일 수요일 09:45" */
export function seoulDateTime(iso: string): string {
  const parts = Object.fromEntries(DATE_TIME.formatToParts(new Date(iso)).map((p) => [p.type, p.value]));
  return `${parts.year}년 ${parts.month} ${parts.day}일 ${parts.weekday} ${parts.hour}:${parts.minute}`;
}
