import type { FlagStatus } from "@/lib/dashboard/build";

/** 배지·카드 색조 */
export type Tone = "caution" | "observe" | "normal" | "neutral";

/** 대상자별 이상징후 상태 */
export type SignalStatus = "caution" | "observe" | "resolved";

export const STATUS_META: Record<SignalStatus, { label: string; tone: Tone }> = {
  caution: { label: "주의", tone: "caution" },
  observe: { label: "관찰", tone: "observe" },
  resolved: { label: "해소", tone: "normal" },
};

/** 신호 하나의 처리 상태 (flags.status) */
export const FLAG_STATUS_LABEL: Record<FlagStatus, string> = {
  unchecked: "미확인",
  checked: "확인함",
  acting: "조치 중",
  resolved: "해소",
};
