import { connection } from "next/server";
import type { BriefingRecord } from "@/lib/briefing/input";
import { briefingPeriod, type BriefingPeriod } from "@/lib/briefing/period";
import type { ClientDisplay } from "@/lib/client-label";
import type { ClientSignal } from "@/lib/dashboard/build";
import { loadClientSignals } from "@/lib/dashboard/data";
import { createClient } from "@/lib/supabase/server";
import { parseBriefingBody, type BriefingContent } from "@/schemas/briefing";
import { RecordDraftSchema } from "@/schemas/record-draft";

// RLS가 내 기관과 연결된 대상자의 기록(다른 기관이 쓴 것 포함)만 돌려준다.

type Supabase = Awaited<ReturnType<typeof createClient>>;
const DAY_MS = 24 * 60 * 60 * 1000;

export type SourceRecord = BriefingRecord & { createdAt: string };
export type BriefingSource = {
  clientId: string;
  subject: ClientDisplay;
  /** 기간 안의 기록, 방문 시각 순 */
  records: SourceRecord[];
  /** 해소되지 않은 신호 */
  signals: ClientSignal[];
};

/**
 * 브리핑 원자료: 대상자, 기간 안의 기록(모든 기관), 미해결 신호. 볼 수 없는 대상자면 null.
 * connection()을 쓰지 않으므로 서버 액션에서도 쓴다.
 */
export async function loadBriefingSource(supabase: Supabase, code: string, period: BriefingPeriod, now: Date): Promise<BriefingSource | null> {
  const { data: client } = await supabase.from("clients").select("id, code, age_band, dong").eq("code", code).maybeSingle();
  if (!client) return null;
  const display = { id: client.id, code: client.code, ageBand: client.age_band, dong: client.dong };
  const [{ data: rows }, item] = await Promise.all([
    supabase
      .from("visit_records")
      .select("visited_at, created_at, final_json, agencies(name)")
      .eq("client_id", client.id)
      .gte("visited_at", period.startIso)
      .order("visited_at"),
    loadClientSignals(supabase, display, now),
  ]);
  const records: SourceRecord[] = [];
  for (const r of rows ?? []) {
    const final = RecordDraftSchema.safeParse(r.final_json);
    if (!final.success) continue;
    records.push({ visitedAt: r.visited_at, createdAt: r.created_at, agency: r.agencies?.name ?? "기관 미상", record: final.data });
  }
  return {
    clientId: client.id,
    subject: { code: client.code, ageBand: client.age_band, dong: client.dong },
    records,
    signals: (item?.signals ?? []).filter((s) => s.status !== "resolved"),
  };
}

export type AgencyCount = { name: string; count: number };
export type SavedBriefing = {
  /** 형식이 깨졌으면 null → 원문(raw)을 그대로 보여 준다 */
  content: BriefingContent | null;
  raw: string;
  createdAt: string;
  /** 만든 뒤 들어온 기록 수 */
  newerRecords: number;
};
export type BriefingPageData = {
  subject: ClientDisplay;
  period: BriefingPeriod;
  recordCount: number;
  agencies: AgencyCount[];
  lastVisitedAt: string | null;
  signals: ClientSignal[];
  latest: SavedBriefing | null;
};

/** 브리핑 화면 데이터. 같은 기간(시작·종료일)으로 만든 가장 최근 브리핑을 함께 읽는다. 세션을 읽으므로 <Suspense> 안에서만 쓴다. */
export async function getBriefingPage(code: string, days: number): Promise<BriefingPageData | null> {
  await connection();
  const now = new Date();
  const period = briefingPeriod(now, days);
  const supabase = await createClient();
  const source = await loadBriefingSource(supabase, code, period, now);
  if (!source) return null;
  const { data: saved } = await supabase
    .from("briefings")
    .select("body, created_at")
    .eq("client_id", source.clientId)
    .eq("period_from", period.from)
    .eq("period_to", period.to)
    .order("created_at", { ascending: false })
    .limit(1);
  const latest = saved?.[0];
  const counts = new Map<string, number>();
  for (const r of source.records) counts.set(r.agency, (counts.get(r.agency) ?? 0) + 1);
  return {
    subject: source.subject,
    period,
    recordCount: source.records.length,
    agencies: [...counts].map(([name, count]) => ({ name, count })),
    lastVisitedAt: source.records.at(-1)?.visitedAt ?? null,
    signals: source.signals,
    latest: latest
      ? {
          content: parseBriefingBody(latest.body),
          raw: latest.body,
          createdAt: latest.created_at,
          newerRecords: source.records.filter((r) => Date.parse(r.createdAt) > Date.parse(latest.created_at)).length,
        }
      : null,
  };
}

export type BriefingClientRow = {
  client: ClientDisplay;
  recordCount: number;
  agencyCount: number;
  lastVisitedAt: string | null;
  activeSignals: number;
};

/** 브리핑 대상자 목록: 최근 14일 기록 수·기관 수, 미해결 신호가 있는 대상자부터 */
export async function getBriefingClients(): Promise<BriefingClientRow[]> {
  await connection();
  const sinceIso = new Date(Date.now() - 14 * DAY_MS).toISOString();
  const supabase = await createClient();
  const [{ data: clients }, { data: visits }, { data: active }] = await Promise.all([
    supabase.from("clients").select("id, code, age_band, dong").is("closed_at", null).order("code"), // 종결한 대상자는 빼고
    supabase.from("visit_records").select("client_id, agency_id, visited_at").gte("visited_at", sinceIso),
    supabase.from("flags").select("client_id, type").neq("status", "resolved"),
  ]);
  const rows = (clients ?? []).map((c) => {
    const mine = (visits ?? []).filter((v) => v.client_id === c.id);
    const last = mine.reduce<string | null>((max, v) => (max && max > v.visited_at ? max : v.visited_at), null);
    return {
      client: { code: c.code, ageBand: c.age_band, dong: c.dong },
      recordCount: mine.length,
      agencyCount: new Set(mine.map((v) => v.agency_id)).size,
      lastVisitedAt: last,
      activeSignals: new Set((active ?? []).filter((f) => f.client_id === c.id).map((f) => f.type)).size,
    };
  });
  return rows.sort((a, b) => b.activeSignals - a.activeSignals || b.recordCount - a.recordCount || a.client.code.localeCompare(b.client.code));
}
