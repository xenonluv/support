import { describe, expect, it } from "vitest";
import { briefingPeriod } from "@/lib/briefing/period";

describe("briefingPeriod", () => {
  it("서울 기준 오늘 포함 N일, 시작일 0시(서울)부터", () => {
    // 서울 10월 11일 낮 12시
    expect(briefingPeriod(new Date("2026-10-11T03:00:00Z"), 7)).toEqual({
      days: 7,
      from: "2026-10-05",
      to: "2026-10-11",
      startIso: "2026-10-04T15:00:00.000Z",
      label: "10월 5일 ~ 10월 11일",
    });
  });

  it("서울 새벽(UTC로는 전날)에도 서울 날짜를 쓴다", () => {
    // UTC 10월 11일 17:30 = 서울 10월 12일 02:30
    const p = briefingPeriod(new Date("2026-10-11T17:30:00Z"), 14);
    expect(p.to).toBe("2026-10-12");
    expect(p.from).toBe("2026-09-29");
    expect(p.startIso).toBe("2026-09-28T15:00:00.000Z");
    expect(p.label).toBe("9월 29일 ~ 10월 12일");
  });

  it("해를 넘겨도 날짜를 바르게 센다", () => {
    const p = briefingPeriod(new Date("2027-01-03T03:00:00Z"), 30);
    expect(p.from).toBe("2026-12-05");
    expect(p.to).toBe("2027-01-03");
  });
});
