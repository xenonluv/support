import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildDashboard, type DashClient, type DashFlag, type Dashboard, type PriorityClient } from "@/lib/dashboard/build";
import type { CountKey } from "@/components/manager-nav";
import type { SignalLevel, SignalType } from "@/schemas/signal";

// 세션을 읽으므로 <Suspense> 안에서만 쓴다. RLS가 내 기관과 연결된 대상자의 행만 돌려준다.

const DAY_MS = 24 * 60 * 60 * 1000;
// 추이(10일)·이번 달 집계를 덮도록 넉넉히 읽는다. 해소되지 않은 신호는 날짜와 상관없이 읽는다.
const LOOKBACK_DAYS = 40;

type FlagRow = {
  client_id: string;
  type: string;
  level: string;
  status: string;
  created_at: string;
  resolved_at: string | null;
  outcome: string | null;
  evidence_quote: string;
  visit_records: { agency_id: string } | null;
};

function toDashFlag(f: FlagRow): DashFlag {
  return {
    clientId: f.client_id,
    type: f.type as SignalType,
    level: f.level as SignalLevel,
    status: f.status as DashFlag["status"],
    createdAt: f.created_at,
    resolvedAt: f.resolved_at,
    outcome: f.outcome,
    agencyId: f.visit_records?.agency_id ?? "",
    evidence: f.evidence_quote,
  };
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function loadFlags(supabase: Supabase, sinceIso: string, clientId?: string) {
  let query = supabase
    .from("flags")
    .select("client_id, type, level, status, created_at, resolved_at, outcome, evidence_quote, visit_records(agency_id)")
    .or(`status.neq.resolved,created_at.gte.${sinceIso},resolved_at.gte.${sinceIso}`);
  if (clientId) query = query.eq("client_id", clientId);
  const { data } = await query;
  return (data ?? []).map((f) => toDashFlag(f as FlagRow));
}

/**
 * 한 대상자의 신호(최근 30일 + 해소되지 않은 것)를 대상자·종류별로 묶는다. 신호가 없으면 null.
 * connection()을 쓰지 않으므로 서버 액션에서도 쓸 수 있다.
 */
export async function loadClientSignals(supabase: Supabase, client: DashClient, now: Date): Promise<PriorityClient | null> {
  const flags = await loadFlags(supabase, new Date(now.getTime() - 30 * DAY_MS).toISOString(), client.id);
  return buildDashboard({ clients: [client], flags, records: [], now, days: 30 }).priority[0] ?? null;
}

/** 이상징후 현황 화면 데이터 */
export async function getDashboard(days: number): Promise<Dashboard & { asOf: Date }> {
  await connection();
  const now = new Date();
  const sinceIso = new Date(now.getTime() - Math.max(days, LOOKBACK_DAYS) * DAY_MS).toISOString();
  const supabase = await createClient();
  const [{ data: clients }, flags, { data: records }] = await Promise.all([
    supabase.from("clients").select("id, code, age_band, dong").order("code"),
    loadFlags(supabase, sinceIso),
    supabase.from("visit_records").select("client_id, visited_at, flags(id)").gte("visited_at", sinceIso),
  ]);
  const dash = buildDashboard({
    clients: (clients ?? []).map((c) => ({ id: c.id, code: c.code, ageBand: c.age_band, dong: c.dong })),
    flags,
    records: (records ?? []).map((r) => ({ clientId: r.client_id, visitedAt: r.visited_at, hasFlags: r.flags.length > 0 })),
    now,
    days,
  });
  return { ...dash, asOf: now };
}

export type AlertInfo = { id: string; body: string; copiedAt: string | null };
export type ClientDetail = { item: PriorityClient | null; code: string; ageBand: number | null; dong: string; alert: AlertInfo | null };

/** 알림 상세 화면 데이터 (식별번호로 찾음). 볼 수 없는 대상자면 null */
export async function getClientDetail(code: string): Promise<ClientDetail | null> {
  await connection();
  const now = new Date();
  const supabase = await createClient();
  const { data: client } = await supabase.from("clients").select("id, code, age_band, dong").eq("code", code).maybeSingle();
  if (!client) return null;
  const display = { id: client.id, code: client.code, ageBand: client.age_band, dong: client.dong };
  const [item, { data: alerts }] = await Promise.all([
    loadClientSignals(supabase, display, now),
    supabase
      .from("alert_drafts")
      .select("id, body, copied_at, created_at, flags!inner(client_id)")
      .eq("flags.client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);
  const latest = alerts?.[0];
  return {
    item,
    code: client.code,
    ageBand: client.age_band,
    dong: client.dong,
    alert: latest ? { id: latest.id, body: latest.body, copiedAt: latest.copied_at } : null,
  };
}

/** 사이드바 숫자: 확인할 신호가 있는 대상자, 대상자, 연계 기관 */
export async function getSidebarCounts(): Promise<Record<CountKey, number>> {
  await connection();
  const supabase = await createClient();
  const [{ count: clients }, { count: agencies }, { data: active }] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }),
    supabase.from("agencies").select("id", { count: "exact", head: true }),
    supabase.from("flags").select("client_id").neq("status", "resolved"),
  ]);
  return {
    signals: new Set((active ?? []).map((f) => f.client_id)).size,
    clients: clients ?? 0,
    agencies: agencies ?? 0,
  };
}
