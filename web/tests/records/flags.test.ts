import { describe, expect, it } from "vitest";
import { buildAlertRow, buildFlagRows } from "@/lib/records/flags";
import type { Signal } from "@/schemas/signal";

const signals: Signal[] = [
  { type: "reduced_meal", level: "observe", evidence_quote: "점심을 절반만 드셨어요" },
  { type: "missed_medication", level: "caution", evidence_quote: "김영희 어르신이 약을 이틀째 안 드셨어요" },
];

describe("buildFlagRows", () => {
  it("주의 신호를 앞에 두고, 근거 문장의 개인정보를 가린 플래그 행을 만든다", () => {
    expect(buildFlagRows(signals, { recordId: "r-1", clientId: "c-1" })).toEqual([
      {
        record_id: "r-1",
        client_id: "c-1",
        type: "missed_medication",
        level: "caution",
        evidence_quote: "[이름] 어르신이 약을 이틀째 안 드셨어요",
        status: "unchecked",
      },
      {
        record_id: "r-1",
        client_id: "c-1",
        type: "reduced_meal",
        level: "observe",
        evidence_quote: "점심을 절반만 드셨어요",
        status: "unchecked",
      },
    ]);
  });

  it("신호가 없으면 빈 배열", () => {
    expect(buildFlagRows([], { recordId: "r-1", clientId: "c-1" })).toEqual([]);
  });
});

describe("buildAlertRow", () => {
  it("첫 플래그(가장 우선)에 동 담당자용 문안을 붙이고 개인정보를 가린다", () => {
    expect(buildAlertRow("f-1", "아드님 010-1234-5678로 연락 부탁드립니다")).toEqual({
      flag_id: "f-1",
      target: "dong_manager",
      body: "아드님 [전화번호]로 연락 부탁드립니다",
    });
  });

  it("문안이 비어 있으면 만들지 않는다", () => {
    expect(buildAlertRow("f-1", "   ")).toBeNull();
  });
});
