import type { PushPayload } from "@/schemas/push";

// 알림 내용과 결과 판정 — 순수 함수.
// 잠금 화면에 보이므로 이름·식별번호·건강 정보를 넣지 않는다. 대상자는 내부 id(주소)로만 가리킨다.

/** 이 기기의 구독 주소를 기억하는 쿠키 — 로그아웃 때 그 기기 알림을 끊는다 */
export const PUSH_ENDPOINT_COOKIE = "push_endpoint";

/** 켜져 있는 기기를 서버에 다시 알렸는지(세션 저장소). 로그인 화면이 지워, 새로 로그인한 사람 기준으로 다시 알린다 */
export const PUSH_RESAVED_KEY = "push-resaved";

export const ALERT_TITLE = "돌봄이음";
export const ALERT_BODY = "확인이 필요한 대상자가 있습니다. 눌러서 확인해 주세요.";

/** 관리자 → 현장인력: 대상자 상황 화면을 연다 */
export function clientAlertPayload(clientId: string): PushPayload {
  return { title: ALERT_TITLE, body: ALERT_BODY, url: `/visits/${clientId}`, tag: `client-${clientId}` };
}

/** 내 기기로 보내는 시험 알림 */
export function testPayload(): PushPayload {
  return { title: ALERT_TITLE, body: "알림이 잘 도착했어요. 이제 관리자 알림을 받을 수 있어요.", url: "/visits", tag: "test" };
}

/** 푸시 서비스가 이 기기 구독이 끝났다고 알린 응답(다시 보내도 안 감 → 지운다) */
export function isExpiredStatus(statusCode: number | undefined): boolean {
  return statusCode === 404 || statusCode === 410;
}
