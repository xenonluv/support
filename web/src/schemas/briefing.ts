import { z } from "zod";
import { PERIOD_OPTIONS } from "@/lib/dashboard/period";

// 인수인계 브리핑 — 단일 출처. 여러 기관의 기록을 모아 "그동안 무슨 일이 있었는가"를 한 장으로 요약한다.

/** 받은 뒤 자르는 개수 상한 (구조화 출력 스키마에는 개수 제약을 넣지 않는다) */
export const MAX_CHANGES = 6;
export const MAX_FOLLOW_UPS = 5;

export const BriefingContentSchema = z.object({
  overview: z.string().describe("기간 전체를 2~3문장으로. 가장 중요한 변화부터"),
  changes: z.array(z.string()).describe("기간 중 달라진 점·눈에 띈 일. '10월 3일 — 점심 절반 섭취'처럼 날짜를 앞에, 시간순으로 6개 이하"),
  by_agency: z
    .array(
      z.object({
        agency: z.string().describe("입력에 나온 기관 이름 그대로"),
        summary: z.string().describe("이 기관이 한 일과 관찰한 내용 1~2문장"),
      }),
    )
    .describe("기록을 남긴 기관마다 하나씩"),
  follow_ups: z.array(z.string()).describe("다음 담당자가 이어서 확인할 일 5개 이하. 기록의 후속 조치와 미해결 신호에서 나온 것만"),
});
export type BriefingContent = z.infer<typeof BriefingContentSchema>;

/** 브리핑 만들기 서버 액션 입력 */
export const BriefingRequestSchema = z.object({
  clientCode: z.string().regex(/^C-\d{4}$/),
  days: z.number().refine((n) => (PERIOD_OPTIONS as readonly number[]).includes(n)),
});
export type BriefingRequest = z.infer<typeof BriefingRequestSchema>;

/** briefings.body(JSON 글)를 다시 읽는다. 형식이 다르면 null */
export function parseBriefingBody(body: string): BriefingContent | null {
  try {
    const parsed = BriefingContentSchema.safeParse(JSON.parse(body));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
