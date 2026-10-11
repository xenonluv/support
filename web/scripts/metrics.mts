// 최종 성과지표: 모든 기관의 파일럿 참여자 기록 기준 (시험 계정·시연 데이터 제외).
// 실행: npm run metrics [-- --baseline=분]   (기존 작성시간을 아직 코드에 넣지 않았으면 --baseline으로 준다)
import { createClient } from "@supabase/supabase-js";
import { computeMetrics } from "@/lib/metrics/compute";
import { METRIC_COLUMNS, readAll, toMetricRecords, type MetricRow } from "@/lib/metrics/rows";
import { BASELINE_MINUTES, MINOR_EDIT_MAX, TIME_OUTLIER_MINUTES } from "@/lib/metrics/targets";

function need(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 환경변수가 없습니다 (.env.local 확인)`);
  return value;
}

const arg = process.argv.find((a) => a.startsWith("--baseline="));
const baselineMinutes = arg ? Number(arg.split("=")[1]) : BASELINE_MINUTES;
if (arg && !(baselineMinutes! > 0)) throw new Error("--baseline은 0보다 큰 분 단위 숫자 (예: --baseline=15)");

const admin = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const [rows, { count: issued, error }] = await Promise.all([
  readAll<MetricRow>((from, to) =>
    admin.from("visit_records").select(`${METRIC_COLUMNS}, workers!inner(pilot)`).eq("workers.pilot", true).order("id").range(from, to),
  ),
  admin.from("workers").select("id", { count: "exact", head: true }).eq("pilot", true),
]);
if (error) throw new Error(`참여자 수: ${error.message}`);

const m = computeMetrics(toMetricRecords(rows), { baselineMinutes });
const mark = (met: boolean | null) => (met === null ? "–" : met ? "✓" : "✗");
const percent = (n: number) => `${Math.round(n * 100)}%`;

console.log(`성과지표 (파일럿 참여자 ${issued ?? 0}명 발급, 기록 남긴 사람 ${m.workers}명${m.firstDay ? ` · ${m.firstDay} ~ ${m.lastDay}` : ""})\n`);
for (const k of m.kpis) console.log(`${mark(k.met)} ${k.label}: ${k.value}  (목표 ${k.target})`);
console.log(
  `\n수용률 내역: AI 초안 ${m.acceptance.aiDrafted}건 중 그대로 ${m.acceptance.unchanged} · 경미 수정(${percent(MINOR_EDIT_MAX)} 이하) ${m.acceptance.minor} · 많이 수정 ${m.acceptance.major}, 직접 작성 ${m.records - m.acceptance.aiDrafted}건 제외`,
);
console.log(
  `작성시간 내역: ${m.writingTime.averageMinutes === null ? "기록 없음" : `평균 ${m.writingTime.averageMinutes.toFixed(1)}분 · 중앙값 ${m.writingTime.medianMinutes!.toFixed(1)}분 (${m.writingTime.counted}건)`}, ${TIME_OUTLIER_MINUTES}분 초과 ${m.writingTime.excluded}건 제외, 기존 작성시간 ${baselineMinutes === null ? "미입력" : `${baselineMinutes}분`}`,
);
