import { describe, expect, it } from "vitest";
import { seoulDate, seoulMonthDay } from "@/lib/records/dates";

describe("서울 시간 날짜 표시", () => {
  it("UTC 저녁은 서울로는 다음 날이다", () => {
    expect(seoulDate("2026-10-10T16:30:00Z")).toBe("2026-10-11");
    expect(seoulMonthDay("2026-10-10T16:30:00Z")).toBe("10월 11일");
  });

  it("서울 같은 날이면 그대로", () => {
    expect(seoulDate("2026-10-11T02:00:00Z")).toBe("2026-10-11");
  });
});
