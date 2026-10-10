import { describe, expect, it } from "vitest";
import { describeSignal, formatBriefingText } from "@/lib/briefing/format";
import { briefingPeriod } from "@/lib/briefing/period";
import type { ClientSignal } from "@/lib/dashboard/build";
import { parseBriefingBody, type BriefingContent } from "@/schemas/briefing";

const content: BriefingContent = {
  overview: "혈압약 미복용과 휘청임이 같은 주에 있었다.",
  changes: ["10월 5일 — 점심 절반 섭취", "10월 9일 — 혈압약 2일째 미복용"],
  by_agency: [
    { agency: "화정1동 행정복지센터", summary: "복약 확인, 휘청임 관찰" },
    { agency: "서구 노인맞춤돌봄 수행기관", summary: "목욕 지원, 병원 동행" },
  ],
  follow_ups: ["복약 달력 설치 검토"],
};
const signal: ClientSignal = {
  type: "fall",
  level: "observe",
  days: 1,
  isNew: true,
  agencyCount: 1,
  status: "checked",
  evidence: "휘청하셨어요",
};
const subject = { code: "C-0012", ageBand: 70, dong: "서구 화정1동" };
const period = briefingPeriod(new Date("2026-10-11T03:00:00Z"), 14);

describe("describeSignal", () => {
  it("이름 (수준 · 지속 · 상태)", () => {
    expect(describeSignal(signal)).toBe("낙상 (관찰 · 신규 · 확인함)");
    expect(describeSignal({ ...signal, level: "caution", isNew: false, days: 4, status: "acting" })).toBe("낙상 (주의 · 4일째 · 조치 중)");
  });
});

describe("formatBriefingText", () => {
  it("복사용 글: 머리말·요약·변화·기관별·미해결 신호·이어서 할 일", () => {
    expect(formatBriefingText({ subject, period, content, signals: [signal] })).toBe(
      [
        "[인수인계 브리핑] C-0012 · 70대 · 서구 화정1동",
        "기간: 9월 28일 ~ 10월 11일",
        "",
        "요약",
        "혈압약 미복용과 휘청임이 같은 주에 있었다.",
        "",
        "주요 변화",
        "- 10월 5일 — 점심 절반 섭취",
        "- 10월 9일 — 혈압약 2일째 미복용",
        "",
        "기관별 내용",
        "- 화정1동 행정복지센터: 복약 확인, 휘청임 관찰",
        "- 서구 노인맞춤돌봄 수행기관: 목욕 지원, 병원 동행",
        "",
        "미해결 신호",
        "- 낙상 (관찰 · 신규 · 확인함)",
        "",
        "이어서 확인할 일",
        "- 복약 달력 설치 검토",
      ].join("\n"),
    );
  });

  it("빈 목록은 구역째 빼고, 미해결 신호가 없으면 '없음'", () => {
    const text = formatBriefingText({ subject, period, content: { ...content, changes: [], follow_ups: [] }, signals: [] });
    expect(text).not.toContain("주요 변화");
    expect(text).not.toContain("이어서 확인할 일");
    expect(text).toContain("미해결 신호\n없음");
  });
});

describe("parseBriefingBody", () => {
  it("저장된 JSON을 다시 읽는다", () => {
    expect(parseBriefingBody(JSON.stringify(content))).toEqual(content);
  });

  it("JSON이 아니거나 형식이 다르면 null", () => {
    expect(parseBriefingBody("그냥 글")).toBeNull();
    expect(parseBriefingBody(JSON.stringify({ overview: 1 }))).toBeNull();
  });
});
