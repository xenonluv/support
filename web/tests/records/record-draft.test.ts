import { describe, expect, it } from "vitest";
import { DraftRequestSchema, RecordDraftSchema, formatRecordText, type RecordDraft } from "@/schemas/record-draft";

const draft: RecordDraft = {
  summary: "혈압약 2일 미복용, 점심 절반 섭취",
  service_types: ["안전지원", "일상생활지원"],
  health: "어지러움 호소",
  medication: "고혈압약 2일분 미복용",
  meals: "점심 절반 섭취",
  mood: "",
  living: "",
  services_provided: "복약 확인, 말벗",
  notes: "화장실 문턱에서 휘청거림 1회",
  follow_up: "보호자에게 복약 확인 요청",
};

describe("RecordDraftSchema", () => {
  it("정상 초안을 받아들이고, 정해진 서비스 유형만 허용한다", () => {
    expect(RecordDraftSchema.parse(draft)).toEqual(draft);
    expect(() => RecordDraftSchema.parse({ ...draft, service_types: ["아무거나"] })).toThrow();
  });
});

describe("DraftRequestSchema", () => {
  it("너무 짧거나 긴 구술은 거부한다", () => {
    expect(DraftRequestSchema.safeParse({ transcript: "  짧음 " }).success).toBe(false);
    expect(DraftRequestSchema.safeParse({ transcript: "가".repeat(5001) }).success).toBe(false);
    expect(DraftRequestSchema.safeParse({ transcript: "어르신께서 점심을 드셨어요" }).success).toBe(true);
  });
});

describe("formatRecordText", () => {
  it("머리말과 비어 있지 않은 항목만 복사용 글로 만든다", () => {
    const text = formatRecordText(draft, { clientCode: "C-0012", date: "2026-10-11" });
    expect(text.split("\n")).toEqual([
      "[방문 기록] C-0012 · 2026-10-11",
      "요약: 혈압약 2일 미복용, 점심 절반 섭취",
      "서비스 유형: 안전지원, 일상생활지원",
      "건강: 어지러움 호소",
      "복약: 고혈압약 2일분 미복용",
      "식사: 점심 절반 섭취",
      "제공 서비스: 복약 확인, 말벗",
      "특이사항: 화장실 문턱에서 휘청거림 1회",
      "후속 조치: 보호자에게 복약 확인 요청",
    ]);
  });

  it("머리말 없이 본문만 만들 수도 있다", () => {
    expect(formatRecordText(draft).startsWith("요약:")).toBe(true);
  });
});
