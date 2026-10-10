import { describe, expect, it } from "vitest";
import { signalSummary } from "@/lib/dashboard/summary";
import { SignalStatusUpdateSchema } from "@/schemas/signal";
import type { ClientSignal } from "@/lib/dashboard/build";

const base = { agencyCount: 1, status: "unchecked", evidence: "" } as const;

describe("signalSummary", () => {
  it("신호마다 '이름 N일째' 또는 '이름 신규'로 쓰고, 주의·신규는 강조한다", () => {
    const signals: ClientSignal[] = [
      { ...base, type: "missed_medication", level: "caution", days: 3, isNew: false },
      { ...base, type: "fall", level: "observe", days: 1, isNew: true },
      { ...base, type: "reduced_meal", level: "observe", days: 7, isNew: false },
    ];
    expect(signalSummary(signals, "caution")).toEqual([
      { text: "약 미복용 3일째", emphasis: true },
      { text: " · " },
      { text: "낙상 신규", emphasis: true },
      { text: " · " },
      { text: "식사량 감소 7일째" },
    ]);
  });

  it("해소된 대상자는 '이름 해소'로 쓴다", () => {
    const signals: ClientSignal[] = [{ ...base, type: "reduced_meal", level: "observe", days: 5, isNew: false, status: "resolved" }];
    expect(signalSummary(signals, "resolved")).toEqual([{ text: "식사량 감소 해소 — 정상 범위로 돌아옴" }]);
  });
});

describe("SignalStatusUpdateSchema", () => {
  it("확인·조치 중·해소만 받고, 연계 여부는 해소일 때만 의미가 있다", () => {
    const seenAt = "2026-10-11T03:00:00.000Z";
    expect(SignalStatusUpdateSchema.safeParse({ clientCode: "C-0012", type: "fall", status: "acting", seenAt }).success).toBe(true);
    expect(SignalStatusUpdateSchema.safeParse({ clientCode: "C-0012", type: "fall", status: "resolved", linked: true, seenAt }).success).toBe(true);
    expect(SignalStatusUpdateSchema.safeParse({ clientCode: "C-0012", type: "fall", status: "unchecked", seenAt }).success).toBe(false);
    expect(SignalStatusUpdateSchema.safeParse({ clientCode: "x", type: "fall", status: "checked", seenAt }).success).toBe(false);
  });
});

describe("parseDays", () => {
  it("7·14·30만 받고 그 밖은 14", async () => {
    const { parseDays } = await import("@/lib/dashboard/period");
    expect([parseDays("7"), parseDays("30"), parseDays("99"), parseDays(undefined), parseDays(["7", "30"])]).toEqual([7, 30, 14, 14, 7]);
  });
});
