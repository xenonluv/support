import { connection } from "next/server";
import type { ClientSignal } from "@/lib/dashboard/build";
import { loadClientSignals } from "@/lib/dashboard/data";
import { readAll } from "@/lib/metrics/rows";
import { createClient } from "@/lib/supabase/server";
import { buildVisitCards, type VisitCard, type VisitRow } from "@/lib/visits/build";
import { RecordDraftSchema, type RecordDraft } from "@/schemas/record-draft";

// 현장 인력 화면 데이터. 세션을 읽으므로 <Suspense> 안에서만 쓴다.
// RLS가 내 기관과 연결된 대상자의 기록·신호를 돌려준다 — 함께 돌보는 다른 기관이 쓴 것도 읽는다(인수인계).
// 작성한 사람 이름은 읽지 않는다(직원 목록은 본인만 보임). 기관 이름으로만 표시한다.

/** 오늘의 방문: 종결 안 된 담당 대상자, 최근 방문(누구든), 해소 안 된 신호 */
export async function getVisitCards(): Promise<VisitCard[]> {
  await connection();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return [];
  const [{ data: clients }, visits, { data: flags }] = await Promise.all([
    supabase.from("clients").select("id, code, age_band, dong").is("closed_at", null).order("code"),
    readAll<{ client_id: string; visited_at: string; worker_id: string }>((from, to) =>
      supabase.from("visit_records").select("client_id, visited_at, worker_id").order("id").range(from, to),
    ),
    supabase.from("flags").select("client_id, type, level").neq("status", "resolved"),
  ]);
  return buildVisitCards(
    (clients ?? []).map((c) => ({ id: c.id, code: c.code, ageBand: c.age_band, dong: c.dong })),
    visits.map((v): VisitRow => ({ clientId: v.client_id, visitedAt: v.visited_at, workerId: v.worker_id })),
    (flags ?? []).map((f) => ({ clientId: f.client_id, type: f.type, level: f.level })),
    userId,
  );
}

export type SharedRecord = { id: string; visitedAt: string; agency: string; mine: boolean; final: RecordDraft };
export type ClientSituation = {
  code: string;
  ageBand: number | null;
  dong: string;
  closed: boolean;
  /** 해소되지 않은 신호 */
  signals: ClientSignal[];
  /** 최근 기록(모든 기관), 최신순 */
  records: SharedRecord[];
};

const RECENT_RECORDS = 20;

/** 대상자 상황(읽기 전용). 볼 수 없는 대상자나 잘못된 id면 null */
export async function getClientSituation(clientId: string): Promise<ClientSituation | null> {
  await connection();
  if (!/^[0-9a-f-]{36}$/.test(clientId)) return null;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return null;
  const { data: client } = await supabase.from("clients").select("id, code, age_band, dong, closed_at").eq("id", clientId).maybeSingle();
  if (!client) return null;
  const display = { id: client.id, code: client.code, ageBand: client.age_band, dong: client.dong };
  const [item, { data: rows }] = await Promise.all([
    loadClientSignals(supabase, display, new Date()),
    supabase
      .from("visit_records")
      .select("id, visited_at, worker_id, final_json, agencies(name)")
      .eq("client_id", client.id)
      .order("visited_at", { ascending: false })
      .limit(RECENT_RECORDS),
  ]);
  const records: SharedRecord[] = [];
  for (const r of rows ?? []) {
    const final = RecordDraftSchema.safeParse(r.final_json);
    if (!final.success) continue;
    records.push({ id: r.id, visitedAt: r.visited_at, agency: r.agencies?.name ?? "기관 미상", mine: r.worker_id === userId, final: final.data });
  }
  return {
    code: client.code,
    ageBand: client.age_band,
    dong: client.dong,
    closed: client.closed_at !== null,
    signals: (item?.signals ?? []).filter((s) => s.status !== "resolved"),
    records,
  };
}
