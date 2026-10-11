import { connection } from "next/server";
import { computeMetrics, type Metrics } from "@/lib/metrics/compute";
import { METRIC_COLUMNS, readAll, toMetricRecords, type MetricRow } from "@/lib/metrics/rows";
import { BASELINE_MINUTES } from "@/lib/metrics/targets";
import { createClient } from "@/lib/supabase/server";

export type AgencyMetrics = { agencyName: string; pilotWorkers: number; baselineMinutes: number | null; metrics: Metrics };

/** 성과 지표 화면: 내 기관 파일럿 참여자의 기록. 세션을 읽으므로 <Suspense> 안에서만 쓴다. */
export async function getAgencyMetrics(): Promise<AgencyMetrics | null> {
  await connection();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return null;
  const { data: me } = await supabase.from("workers").select("agency_id, agencies(name)").eq("id", userId).single();
  if (!me) return null;

  const [rows, { count: pilotWorkers }] = await Promise.all([
    readAll<MetricRow>((from, to) =>
      supabase
        .from("visit_records")
        .select(`${METRIC_COLUMNS}, workers!inner(pilot)`)
        .eq("agency_id", me.agency_id)
        .eq("workers.pilot", true)
        .order("id")
        .range(from, to),
    ),
    supabase.from("workers").select("id", { count: "exact", head: true }).eq("agency_id", me.agency_id).eq("pilot", true),
  ]);
  return {
    agencyName: me.agencies?.name ?? "",
    pilotWorkers: pilotWorkers ?? 0,
    baselineMinutes: BASELINE_MINUTES,
    metrics: computeMetrics(toMetricRecords(rows), { baselineMinutes: BASELINE_MINUTES }),
  };
}
