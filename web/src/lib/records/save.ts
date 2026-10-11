import { buildAlertRow, buildFlagRows } from "@/lib/records/flags";
import { buildRecordRow } from "@/lib/records/row";
import { createClient } from "@/lib/supabase/server";
import { SaveRecordSchema } from "@/schemas/record-draft";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** 식별번호로 대상자를 찾는다. 기록 화면을 연 사이 동 담당자가 번호를 바꿨으면 옛 번호로도 찾는다(번호는 다시 쓰지 않아 하나로 정해진다). */
async function findClient(supabase: Supabase, code: string): Promise<{ id: string } | null> {
  const { data } = await supabase.from("clients").select("id").eq("code", code).maybeSingle();
  if (data) return data;
  const { data: moved } = await supabase
    .from("client_code_history")
    .select("client_id")
    .eq("old_code", code)
    .order("changed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return moved ? { id: moved.client_id } : null;
}

/** warning: 기록은 저장됐지만 신호·알림 문안을 저장하지 못한 경우. 다시 저장하면 기록이 중복되므로 '저장됨'으로 처리한다. */
export type SaveResult = { ok: true; id: string; visitedAt: string; warning?: string } | { ok: false; error: string };

/**
 * 방문 기록 저장 (`POST /api/records`). 로그인 사용자 권한으로 insert하므로 RLS가 본인·내 기관 대상자만 허용한다.
 * 서버 액션이 아니라 고정 주소로 부른다 — 서버 액션 ID는 배포마다 바뀌어, 열려 있던 기록 화면에서 저장이 영구히 실패하고 고친 초안을 잃는다.
 */
export async function saveRecord(input: unknown): Promise<SaveResult> {
  const parsed = SaveRecordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "입력 내용을 확인해 주세요." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return { ok: false, error: "로그인이 필요합니다." };

  const [{ data: me }, client] = await Promise.all([
    supabase.from("workers").select("agency_id").eq("id", userId).single(),
    findClient(supabase, parsed.data.clientCode),
  ]);
  if (!me) return { ok: false, error: "직원 정보가 없습니다. 기관 담당자에게 문의해 주세요." };
  if (!client) return { ok: false, error: "담당 대상자가 아닙니다." };

  const row = buildRecordRow(parsed.data, { workerId: userId, agencyId: me.agency_id, clientId: client.id });
  const { data, error } = await supabase.from("visit_records").insert(row).select("id, visited_at").single();
  if (error || !data) {
    console.error(`[save] ${error?.code ?? "unknown"}`); // 기록 내용은 남기지 않는다
    return { ok: false, error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  }

  // 신호와 알림 문안 (기록은 이미 저장됨 — 실패해도 '저장됨'으로 알리고 경고만 붙인다. 다시 저장하면 기록이 중복된다)
  const flagRows = buildFlagRows(parsed.data.signals, { recordId: data.id, clientId: client.id });
  if (flagRows.length > 0) {
    const { data: flags, error: flagError } = await supabase.from("flags").insert(flagRows).select("id");
    const alertRow = flags?.[0] ? buildAlertRow(flags[0].id, parsed.data.alertDraft) : null;
    const alertError = alertRow ? (await supabase.from("alert_drafts").insert(alertRow)).error : null;
    if (flagError || alertError) {
      console.error(`[save] signals ${flagError?.code ?? alertError?.code ?? "unknown"}`);
      return {
        ok: true,
        id: data.id,
        visitedAt: data.visited_at,
        warning: "기록은 저장했지만 확인이 필요한 신호를 함께 저장하지 못했어요. 다시 저장하지 말고 관리자에게 알려 주세요.",
      };
    }
  }
  return { ok: true, id: data.id, visitedAt: data.visited_at };
}
