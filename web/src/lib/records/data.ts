import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RecordDraftSchema, type RecordDraft } from "@/schemas/record-draft";

// 세션을 읽으므로 <Suspense> 안에서만 쓴다. RLS가 내 기관과 연결된 대상자·기록만 돌려준다.

export type MyClient = { code: string; ageBand: number | null; dong: string; lastVisitedAt: string | null };

/** 내 기관과 연결된 대상자와, 내가 마지막으로 기록한 날 */
export async function getMyClients(): Promise<MyClient[]> {
  await connection();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return [];
  const [{ data: clients }, { data: visits }] = await Promise.all([
    supabase.from("clients").select("id, code, age_band, dong").order("code"),
    supabase.from("visit_records").select("client_id, visited_at").eq("worker_id", userId).order("visited_at", { ascending: false }),
  ]);
  const last = new Map<string, string>();
  for (const v of visits ?? []) if (!last.has(v.client_id)) last.set(v.client_id, v.visited_at);
  return (clients ?? []).map((c) => ({ code: c.code, ageBand: c.age_band, dong: c.dong, lastVisitedAt: last.get(c.id) ?? null }));
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
