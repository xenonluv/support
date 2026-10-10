import { describe, expect, it } from "vitest";
import { seoulDate, seoulDateTime, seoulMonthDay } from "@/lib/records/dates";

describe("서울 시간 날짜 표시", () => {
  it("UTC 저녁은 서울로는 다음 날이다", () => {
    expect(seoulDate("2026-10-10T16:30:00Z")).toBe("2026-10-11");
    expect(seoulMonthDay("2026-10-10T16:30:00Z")).toBe("10월 11일");
  });

  it("서울 같은 날이면 그대로", () => {
    expect(seoulDate("2026-10-11T02:00:00Z")).toBe("2026-10-11");
  });
});

describe("seoulDateTime", () => {
  it("'2026년 10월 14일 수요일 09:45' 형식으로 쓴다", () => {
    expect(seoulDateTime("2026-10-14T00:45:00Z")).toBe("2026년 10월 14일 수요일 09:45");
    expect(seoulDateTime("2026-10-14T13:05:00Z")).toBe("2026년 10월 14일 수요일 22:05");
  });
});
