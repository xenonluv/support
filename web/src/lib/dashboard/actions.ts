"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { SignalStatusUpdateSchema } from "@/schemas/signal";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** 대상자·신호 종류 단위로 상태를 바꾼다. 관리자만 가능(RLS flags_update). */
export async function updateSignalStatus(input: unknown): Promise<ActionResult> {
  const parsed = SignalStatusUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "요청을 확인해 주세요." };
  const { clientCode, type, status, linked } = parsed.data;

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return { ok: false, error: "로그인이 필요합니다." };

  const { data: client } = await supabase.from("clients").select("id").eq("code", clientCode).maybeSingle();
  if (!client) return { ok: false, error: "볼 수 없는 대상자입니다." };

  const resolved = status === "resolved";
  const { data, error } = await supabase
    .from("flags")
    .update({
      status,
      resolved_by: resolved ? userId : null,
      resolved_at: resolved ? new Date().toISOString() : null,
      outcome: resolved && linked ? "linked" : null,
    })
    .eq("client_id", client.id)
    .eq("type", type)
    .neq("status", "resolved")
    .select("id");
  if (error || !data || data.length === 0) {
    console.error(`[signal-status] ${error?.code ?? "no-rows"}`);
    return { ok: false, error: "상태를 바꾸지 못했어요. 관리자 계정인지 확인해 주세요." };
  }
  refresh();
  return { ok: true };
}

/** 알림 문안을 복사했다고 기록한다 (사람이 기존 채널로 보냄) */
export async function markAlertCopied(alertId: string): Promise<ActionResult> {
  if (!/^[0-9a-f-]{36}$/.test(alertId)) return { ok: false, error: "요청을 확인해 주세요." };
  const supabase = await createClient();
  const { error } = await supabase.from("alert_drafts").update({ copied_at: new Date().toISOString() }).eq("id", alertId);
  if (error) {
    console.error(`[alert-copied] ${error.code}`);
    return { ok: false, error: "복사 기록을 남기지 못했어요." };
  }
  return { ok: true };
}
