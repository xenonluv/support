import { connection } from "next/server";
import { readAll } from "@/lib/metrics/rows";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import type { AgencyType } from "@/schemas/client";

// 대상자 관리 화면 데이터. 세션을 읽으므로 <Suspense> 안에서만 쓴다.
// RLS가 내 기관과 연결된 대상자만 돌려준다. 쓰기 권한(canEdit)은 DB 함수가 다시 판단한다.

export type AgencyOption = { id: string; name: string; type: AgencyType };
export type ManagedClient = {
  id: string;
  code: string;
  ageBand: number | null;
  dong: string;
  closedAt: string | null;
  /** 연결된 기관 (내 기관 먼저) */
  agencies: (AgencyOption & { mine: boolean })[];
  recordCount: number;
  lastVisitedAt: string | null;
};
export type CodeChange = { oldCode: string; newCode: string; changedAt: string };

type Supabase = Awaited<ReturnType<typeof createClient>>;
type Me = { agencyId: string; agencyName: string; canEdit: boolean };

const CLIENT_COLUMNS = "id, code, age_band, dong, closed_at, client_agencies(agencies(id, name, type))";
const selectClients = (supabase: Supabase) => supabase.from("clients").select(CLIENT_COLUMNS);
type ClientRow = NonNullable<Awaited<ReturnType<typeof selectClients>>["data"]>[number];
type VisitRow = Pick<Database["public"]["Tables"]["visit_records"]["Row"], "client_id" | "visited_at">;

async function loadMe(supabase: Supabase): Promise<Me | null> {
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return null;
  const { data } = await supabase.from("workers").select("agency_id, role, agencies(name, type)").eq("id", userId).single();
  if (!data) return null;
  // 동 담당자: 관리자이고 소속이 동 행정복지센터 (DB의 private.is_dong_manager와 같은 기준)
  return {
    agencyId: data.agency_id,
    agencyName: data.agencies?.name ?? "",
    canEdit: data.role === "manager" && data.agencies?.type === "dong_center",
  };
}

function toManaged(row: ClientRow, myAgencyId: string, visits: VisitRow[]): ManagedClient {
  const mine = visits.filter((v) => v.client_id === row.id);
  const agencies = row.client_agencies
    .flatMap((l) => (l.agencies ? [{ ...l.agencies, type: l.agencies.type as AgencyType, mine: l.agencies.id === myAgencyId }] : []))
    .sort((a, b) => Number(b.mine) - Number(a.mine) || a.name.localeCompare(b.name));
  return {
    id: row.id,
    code: row.code,
    ageBand: row.age_band,
    dong: row.dong,
    closedAt: row.closed_at,
    agencies,
    recordCount: mine.length,
    lastVisitedAt: mine.reduce<string | null>((max, v) => (max && max > v.visited_at ? max : v.visited_at), null),
  };
}

function readVisits(supabase: Supabase, clientId?: string) {
  return readAll<VisitRow>((from, to) => {
    let q = supabase.from("visit_records").select("client_id, visited_at");
    if (clientId) q = q.eq("client_id", clientId);
    return q.order("id").range(from, to);
  });
}

/** 대상자 관리 목록: 진행 중(기본) 또는 종결 */
export async function getClientList(closed: boolean): Promise<(Me & { clients: ManagedClient[] }) | null> {
  await connection();
  const supabase = await createClient();
  const me = await loadMe(supabase);
  if (!me) return null;
  const query = selectClients(supabase).order("code");
  const [{ data: rows }, visits] = await Promise.all([
    closed ? query.not("closed_at", "is", null) : query.is("closed_at", null),
    readVisits(supabase),
  ]);
  return { ...me, clients: (rows ?? []).map((r) => toManaged(r, me.agencyId, visits)) };
}

/** 대상자 상세·수정: 번호 변경 이력과 함께 돌볼 기관 선택지까지. 볼 수 없는 대상자면 null */
export async function getClientEdit(
  clientId: string,
): Promise<(Me & { client: ManagedClient; history: CodeChange[]; options: AgencyOption[] }) | null> {
  await connection();
  if (!/^[0-9a-f-]{36}$/.test(clientId)) return null;
  const supabase = await createClient();
  const me = await loadMe(supabase);
  if (!me) return null;
  const [{ data: row }, visits, { data: history }, options] = await Promise.all([
    selectClients(supabase).eq("id", clientId).maybeSingle(),
    readVisits(supabase, clientId),
    supabase.from("client_code_history").select("old_code, new_code, changed_at").eq("client_id", clientId).order("changed_at", { ascending: false }),
    loadAgencyOptions(supabase),
  ]);
  if (!row) return null;
  return {
    ...me,
    client: toManaged(row, me.agencyId, visits),
    history: (history ?? []).map((h) => ({ oldCode: h.old_code, newCode: h.new_code, changedAt: h.changed_at })),
    options,
  };
}

/** 대상자 등록 화면: 함께 돌볼 기관 선택지 */
export async function getRegisterForm(): Promise<(Me & { options: AgencyOption[] }) | null> {
  await connection();
  const supabase = await createClient();
  const me = await loadMe(supabase);
  if (!me) return null;
  return { ...me, options: await loadAgencyOptions(supabase) };
}

async function loadAgencyOptions(supabase: Supabase): Promise<AgencyOption[]> {
  const { data } = await supabase.rpc("list_agencies");
  return (data ?? []).map((a) => ({ id: a.id, name: a.name, type: a.type as AgencyType }));
}
