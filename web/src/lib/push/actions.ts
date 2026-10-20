"use server";

import { refresh } from "next/cache";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { clientAlertPayload, testPayload } from "@/lib/push/payload";
import { PUSH_ENDPOINT_COOKIE } from "@/lib/push/payload";
import { PushConfigError, sendPush, vapidPublicKey, type PushDevice } from "@/lib/push/send";
import { ClientIdSchema, PushEndpointSchema, PushSubscriptionSchema } from "@/schemas/push";

export type PushActionResult = { ok: true; message: string } | { ok: false; error: string };

const NOT_READY = "알림 기능이 아직 설정되지 않았어요. 관리자에게 알려 주세요.";

function failed(label: string, error: { code?: string; message?: string }): { ok: false; error: string } {
  if (error.message === "too-soon") return { ok: false, error: "방금 보냈어요. 1분 뒤에 다시 보낼 수 있어요." };
  if (error.code === "42501") return { ok: false, error: "이 대상자에게 알림을 보낼 권한이 없어요." };
  if (error.code === "22023" && error.message === "client-closed") return { ok: false, error: "종결된 대상자예요." };
  console.error(`[${label}] ${error.code ?? "unknown"}`); // 주소·내용은 남기지 않는다
  return { ok: false, error: "처리하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
}

/** 이 기기를 내 알림 기기로 저장 */
export async function savePushSubscription(input: unknown): Promise<PushActionResult> {
  const parsed = PushSubscriptionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "이 브라우저의 알림 정보를 읽지 못했어요." };
  const { endpoint, keys } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", { p_endpoint: endpoint, p_p256dh: keys.p256dh, p_auth: keys.auth });
  if (error?.code === "42501") return { ok: false, error: "이 기기의 알림을 저장하지 못했어요. [알림 끄기] 후 다시 켜 주세요." };
  if (error) return failed("push-subscribe", error);
  // 로그아웃할 때 이 기기의 알림을 끊으려고 기억해 둔다 (공용 폰에서 다음 사람이 앞사람 알림을 받지 않게)
  // 값이 같으면 다시 쓰지 않는다(쿠키를 바꾸면 화면을 다시 그린다)
  const jar = await cookies();
  if (jar.get(PUSH_ENDPOINT_COOKIE)?.value !== endpoint) jar.set(PUSH_ENDPOINT_COOKIE, endpoint, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 400 });
  return { ok: true, message: "알림을 켰어요." };
}

/** 이 기기의 알림 끄기 (내 기기만 지워진다 — RLS) */
export async function removePushSubscription(endpoint: unknown): Promise<PushActionResult> {
  const parsed = PushEndpointSchema.safeParse(endpoint);
  if (!parsed.success) return { ok: true, message: "알림을 껐어요." };
  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").delete().eq("endpoint", parsed.data);
  if (error) return failed("push-unsubscribe", error);
  (await cookies()).delete(PUSH_ENDPOINT_COOKIE);
  return { ok: true, message: "알림을 껐어요." };
}

/** 내 기기 전체로 시험 알림 */
export async function sendTestPush(): Promise<PushActionResult> {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return { ok: false, error: "다시 로그인해 주세요." };
  const { data, error } = await supabase.from("push_subscriptions").select("id, endpoint, p256dh, auth").eq("worker_id", userId);
  if (error) return failed("push-test", error);
  if (!data.length) return { ok: false, error: "알림을 켠 기기가 없어요. 먼저 [알림 받기]를 눌러 주세요." };
  try {
    const result = await sendPush(data, testPayload());
    if (result.expired.length) await supabase.from("push_subscriptions").delete().in("id", result.expired);
    if (result.delivered === 0) return { ok: false, error: "보내지 못했어요. 알림을 껐다가 다시 켜 주세요." };
    return { ok: true, message: "보냈어요. 몇 초 안에 알림이 오는지 확인해 주세요." };
  } catch (e) {
    if (e instanceof PushConfigError) return { ok: false, error: NOT_READY };
    throw e;
  }
}

/** 관리자 → 그 대상자와 연결된 모든 기관의 현장인력. 권한·받는 사람은 DB 함수가 정한다 */
export async function sendClientAlert(clientId: unknown): Promise<PushActionResult> {
  const parsed = ClientIdSchema.safeParse(clientId);
  if (!parsed.success) return { ok: false, error: "대상자를 찾지 못했어요." };
  if (!vapidPublicKey()) return { ok: false, error: NOT_READY }; // 보낸 기록을 만들기 전에 설정부터 확인한다
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("send_client_alert", { p_client_id: parsed.data });
  if (error || !data?.length) return failed("push-alert", error ?? {});
  const alertId = data[0].alert_id;
  const devices = data.filter((d): d is typeof d & PushDevice => Boolean(d.subscription_id)).map((d) => ({
    id: d.subscription_id,
    endpoint: d.endpoint,
    p256dh: d.p256dh,
    auth: d.auth,
  }));
  const result = devices.length ? await sendPush(devices, clientAlertPayload(parsed.data)) : { delivered: 0, expired: [], failed: 0 };
  const { error: finishError } = await supabase.rpc("finish_client_alert", {
    p_alert_id: alertId,
    p_delivered: result.delivered,
    p_expired: result.expired,
  });
  if (finishError) console.error(`[push-alert-finish] ${finishError.code ?? "unknown"}`);
  refresh();
  if (devices.length === 0) return { ok: false, error: "알림을 켠 현장 인력이 없어 보내지 못했어요. 전화로 연락해 주세요." };
  if (result.delivered === 0) return { ok: false, error: "알림 서버 오류로 보내지 못했어요. 전화로 연락하고, 계속되면 운영 담당자에게 알려 주세요." };
  return { ok: true, message: `현장 인력 기기 ${result.delivered}대로 보냈어요.` };
}
