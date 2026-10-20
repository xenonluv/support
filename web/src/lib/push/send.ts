import webpush from "web-push";
import type { Tables } from "@/lib/supabase/types";
import type { PushPayload } from "@/schemas/push";
import { isExpiredStatus } from "@/lib/push/payload";

// 웹푸시 발송. 서버에서만 쓴다(VAPID 비밀 키). 테스트에서는 가짜 sender를 넣는다.

export type PushDevice = Pick<Tables<"push_subscriptions">, "id" | "endpoint" | "p256dh" | "auth">;
export type PushSender = (device: PushDevice, body: string) => Promise<void>;
export type PushResult = { delivered: number; expired: string[]; failed: number };

/** 휴대폰이 꺼져 있으면 하루 안에 켜질 때 도착한다 */
const TTL_SECONDS = 24 * 60 * 60;

export class PushConfigError extends Error {
  constructor() {
    super("VAPID keys are not set");
    this.name = "PushConfigError";
  }
}

function vapidConfig(): { publicKey: string; privateKey: string; subject: string } | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  return publicKey && privateKey && subject ? { publicKey, privateKey, subject } : null;
}

/** 브라우저가 구독할 때 쓰는 공개키. 키 3개가 모두 설정돼야 값이 있다(없으면 알림 화면을 숨긴다) */
export function vapidPublicKey(): string | null {
  return vapidConfig()?.publicKey ?? null;
}

function webPushSender(): PushSender {
  const config = vapidConfig();
  if (!config) throw new PushConfigError();
  const { publicKey, privateKey, subject } = config;
  return async (device, body) => {
    await webpush.sendNotification({ endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } }, body, {
      TTL: TTL_SECONDS,
      urgency: "high",
      vapidDetails: { subject, publicKey, privateKey },
    });
  };
}

/** 여러 기기로 동시에 보낸다. 한 기기가 실패해도 나머지는 보낸다 */
export async function sendPush(devices: PushDevice[], payload: PushPayload, sender: PushSender = webPushSender()): Promise<PushResult> {
  const body = JSON.stringify(payload);
  const results = await Promise.allSettled(devices.map((d) => sender(d, body)));
  const result: PushResult = { delivered: 0, expired: [], failed: 0 };
  results.forEach((r, i) => {
    if (r.status === "fulfilled") result.delivered += 1;
    else if (isExpiredStatus((r.reason as { statusCode?: number } | null)?.statusCode)) result.expired.push(devices[i].id);
    else result.failed += 1;
  });
  // 실패 원인만 남긴다(주소·내용은 남기지 않는다)
  if (result.failed > 0) console.error(`[push] failed ${result.failed}/${devices.length}`);
  return result;
}
