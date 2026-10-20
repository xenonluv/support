import { z } from "zod";

// 웹푸시 구독 — 브라우저 PushSubscription.toJSON()에서 필요한 칸만 받는다.
// endpoint는 브라우저 회사의 푸시 서비스 주소(https)이고 개인정보가 아니다.
export const PushSubscriptionSchema = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(1000),
  keys: z.object({
    p256dh: z.string().min(1).max(200),
    auth: z.string().min(1).max(100),
  }),
});
export type PushSubscriptionInput = z.infer<typeof PushSubscriptionSchema>;

export const PushEndpointSchema = z.url({ protocol: /^https$/ }).max(1000);
export const ClientIdSchema = z.uuid();

/** 휴대폰에 뜨는 알림 내용. 잠금 화면에 보이므로 고정 문구와 열 주소만 담는다 */
export const PushPayloadSchema = z.object({
  title: z.string(),
  body: z.string(),
  url: z.string().startsWith("/"),
  tag: z.string(),
});
export type PushPayload = z.infer<typeof PushPayloadSchema>;
