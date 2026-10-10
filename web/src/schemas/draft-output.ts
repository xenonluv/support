import { z } from "zod";
import { RecordDraftSchema } from "@/schemas/record-draft";
import { SignalSchema } from "@/schemas/signal";

/** Claude 한 번 호출로 받는 결과: 기록 초안 + 이상징후 신호 + 알림 문안 (호출을 한 번으로 줄여 비용 절감) */
export const DraftOutputSchema = z.object({
  record: RecordDraftSchema,
  signals: z.array(SignalSchema).describe("확인이 필요한 신호. 없으면 빈 배열"),
  alert_draft: z
    .string()
    .describe("신호가 있을 때 동 통합돌봄 담당자에게 보낼 공유 문안 초안. 성명 없이 식별번호만. 신호가 없으면 빈 문자열"),
});
