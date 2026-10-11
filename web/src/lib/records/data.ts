import { connection } from "next/server";
import type { ClientDisplay } from "@/lib/client-label";
import { createClient } from "@/lib/supabase/server";
import { RecordDraftSchema, type RecordDraft } from "@/schemas/record-draft";

// 세션을 읽으므로 <Suspense> 안에서만 쓴다. RLS가 내 기관과 연결된 대상자·기록만 돌려준다.

/** 기록 화면의 대상자 고르기용: 내 기관과 연결된 대상자 (종결 제외) */
export async function getMyClients(): Promise<ClientDisplay[]> {
  await connection();
  const supabase = await createClient();
  const { data: clients } = await supabase.from("clients").select("code, age_band, dong").is("closed_at", null).order("code"); // 종결한 대상자는 빼고
  return (clients ?? []).map((c) => ({ code: c.code, ageBand: c.age_band, dong: c.dong }));
}

/** 식별번호로 내가 볼 수 있는 대상자를 찾는다 (RLS). 라우트 핸들러용이라 connection()을 쓰지 않는다. */
export async function findMyClient(code: string): Promise<ClientDisplay | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("clients").select("code, age_band, dong").eq("code", code).maybeSingle();
  return data ? { code: data.code, ageBand: data.age_band, dong: data.dong } : null;
}

/** 옛 식별번호 → 지금 번호 (동 담당자가 번호를 바꾼 경우). 볼 수 있는 대상자만 (RLS) */
export async function findRenamedCode(oldCode: string): Promise<string | null> {
  if (!/^C-\d{4}$/.test(oldCode)) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("client_code_history")
    .select("clients(code)")
    .eq("old_code", oldCode)
    .order("changed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.clients?.code ?? null;
}

export type MyRecord = { id: string; clientCode: string; visitedAt: string; final: RecordDraft; edited: boolean };

/** 내가 저장한 최근 기록 */
export async function getMyRecords(limit = 20): Promise<MyRecord[]> {
  await connection();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return [];
  const { data } = await supabase
    .from("visit_records")
    .select("id, visited_at, final_json, edited, clients(code)")
    .eq("worker_id", userId)
    .order("visited_at", { ascending: false })
    .limit(limit);
  const records: MyRecord[] = [];
  for (const r of data ?? []) {
    const final = RecordDraftSchema.safeParse(r.final_json);
    if (!final.success || !r.clients) continue;
    records.push({ id: r.id, clientCode: r.clients.code, visitedAt: r.visited_at, final: final.data, edited: r.edited });
  }
  return records;
}
