import { z } from "zod";

// 이상징후 신호 — 단일 출처. AI는 판정하지 않고 "확인이 필요한 신호"만 근거와 함께 제안한다.

export const SIGNAL_TYPES = ["missed_medication", "reduced_meal", "fall", "emotional_withdrawal", "visit_refusal"] as const;
export type SignalType = (typeof SIGNAL_TYPES)[number];

export const SIGNAL_LABEL: Record<SignalType, string> = {
  missed_medication: "약 미복용",
  reduced_meal: "식사량 감소",
  fall: "낙상",
  emotional_withdrawal: "정서적 위축",
  visit_refusal: "방문 거부",
};

export const SIGNAL_LEVELS = ["observe", "caution"] as const;
export type SignalLevel = (typeof SIGNAL_LEVELS)[number];

export const SIGNAL_LEVEL_LABEL: Record<SignalLevel, string> = { observe: "관찰", caution: "주의" };

export const SignalSchema = z.object({
  type: z.enum(SIGNAL_TYPES).describe("신호 종류"),
  level: z.enum(SIGNAL_LEVELS).describe("확인 우선순위 제안: caution(먼저 확인) 또는 observe(지켜봄)"),
  evidence_quote: z.string().describe("구술에서 그대로 옮긴 근거 문장. 바꿔 쓰지 않는다"),
});
export type Signal = z.infer<typeof SignalSchema>;

// 띄어쓰기·문장부호를 빼고 비교한다 (음성 인식과 인용의 사소한 차이 허용)
const normalize = (s: string) => s.replace(/[\s.,!?~·…"'“”‘’()\-]/g, "");

/**
 * 근거 문장이 구술에 실제로 있는 신호만 남긴다(지어낸 근거 차단).
 * 같은 종류는 하나로 합치고, 주의가 있으면 주의를 남긴다.
 */
export function keepGroundedSignals(signals: readonly Signal[], transcript: string): Signal[] {
  const source = normalize(transcript);
  const byType = new Map<SignalType, Signal>();
  for (const s of signals) {
    const quote = normalize(s.evidence_quote);
    if (quote.length < 4 || !source.includes(quote)) continue;
    const prev = byType.get(s.type);
    if (!prev || (prev.level === "observe" && s.level === "caution")) byType.set(s.type, s);
  }
  return [...byType.values()];
}

/** 관리자가 신호 상태를 바꿀 때의 입력 (대상자·신호 종류 단위) */
export const SignalStatusUpdateSchema = z.object({
  clientCode: z.string().regex(/^C-\d{4}$/),
  type: z.enum(SIGNAL_TYPES),
  status: z.enum(["checked", "acting", "resolved"]),
  /** 해소할 때 '연계로 이어짐' (이번 달 조기 발견 집계) */
  linked: z.boolean().optional(),
});
