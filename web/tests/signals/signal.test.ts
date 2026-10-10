import { describe, expect, it } from "vitest";
import { SIGNAL_LABEL, keepGroundedSignals, type Signal } from "@/schemas/signal";

const transcript = "어르신께서 혈압약을 이틀째 안 드셨어요. 화장실 문턱에서 한 번 휘청하셨어요.";

describe("keepGroundedSignals", () => {
  it("근거 문장이 구술에 실제로 있으면 남긴다 (띄어쓰기·문장부호 차이는 무시)", () => {
    const signals: Signal[] = [
      { type: "missed_medication", level: "caution", evidence_quote: "혈압약을 이틀째 안 드셨어요" },
      { type: "fall", level: "observe", evidence_quote: "화장실문턱에서 한번 휘청하셨어요." },
    ];
    expect(keepGroundedSignals(signals, transcript)).toEqual(signals);
  });

  it("구술에 없는 근거(지어낸 문장)의 신호는 버린다", () => {
    const signals: Signal[] = [{ type: "reduced_meal", level: "observe", evidence_quote: "식사를 거의 못 하셨어요" }];
    expect(keepGroundedSignals(signals, transcript)).toEqual([]);
  });

  it("같은 종류가 여러 개면 하나만 남기고, 주의가 있으면 주의를 남긴다", () => {
    const signals: Signal[] = [
      { type: "missed_medication", level: "observe", evidence_quote: "혈압약을 이틀째 안 드셨어요" },
      { type: "missed_medication", level: "caution", evidence_quote: "이틀째 안 드셨어요" },
    ];
    expect(keepGroundedSignals(signals, transcript)).toEqual([signals[1]]);
  });

  it("근거가 너무 짧으면(4자 미만) 우연히 겹친 것으로 보고 버린다", () => {
    expect(keepGroundedSignals([{ type: "fall", level: "observe", evidence_quote: "한 번" }], transcript)).toEqual([]);
  });
});

describe("SIGNAL_LABEL", () => {
  it("5종 모두 한국어 이름이 있다", () => {
    expect(Object.values(SIGNAL_LABEL)).toEqual(["약 미복용", "식사량 감소", "낙상", "정서적 위축", "방문 거부"]);
  });
});
