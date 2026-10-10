import { maskPersonalInfo } from "@/lib/privacy/mask";
import type { Database } from "@/lib/supabase/types";
import type { Signal } from "@/schemas/signal";

type FlagInsert = Database["public"]["Tables"]["flags"]["Insert"];
type AlertInsert = Database["public"]["Tables"]["alert_drafts"]["Insert"];

/** 저장할 플래그 행. 주의 신호를 앞에 두고(알림 문안은 첫 플래그에 붙음), 근거 문장의 개인정보를 가린다. */
export function buildFlagRows(signals: readonly Signal[], ctx: { recordId: string; clientId: string }): FlagInsert[] {
  return [...signals]
    .sort((a, b) => (a.level === b.level ? 0 : a.level === "caution" ? -1 : 1))
    .map((s) => ({
      record_id: ctx.recordId,
      client_id: ctx.clientId,
      type: s.type,
      level: s.level,
      evidence_quote: maskPersonalInfo(s.evidence_quote).text,
      status: "unchecked",
    }));
}

/** 동 담당자용 알림 문안 행. 비어 있으면 null */
export function buildAlertRow(flagId: string, body: string): AlertInsert | null {
  const text = maskPersonalInfo(body.trim()).text;
  return text ? { flag_id: flagId, target: "dong_manager", body: text } : null;
}
