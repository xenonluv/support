import { MINOR_EDIT_MAX, TARGETS, TIME_OUTLIER_MINUTES } from "@/lib/metrics/targets";
import { seoulDate } from "@/lib/records/dates";
import { RECORD_FIELDS, RecordDraftSchema } from "@/schemas/record-draft";

// 성과지표 계산 (순수 함수). 화면(/metrics)과 최종 집계 스크립트(npm run metrics)가 함께 쓴다.

export type MetricRecord = {
  workerId: string;
  visitedAt: string;
  /** AI 초안이 있었는지 ('AI 없이 직접 작성'이면 false) */
  aiDrafted: boolean;
  editRatio: number | null;
  durationMs: number | null;
};

export type Kpi = {
  key: "time" | "pilot" | "records" | "acceptance";
  label: string;
  value: string;
  target: string;
  /** 판단할 수 없으면 null (기존 작성시간 미입력, AI 초안 기록 없음 등) */
  met: boolean | null;
};

export type Metrics = {
  records: number;
  workers: number;
  firstDay: string | null;
  lastDay: string | null;
  days: number;
  acceptance: { aiDrafted: number; unchanged: number; minor: number; major: number; rate: number | null };
  writingTime: { counted: number; excluded: number; averageMinutes: number | null; medianMinutes: number | null; reduction: number | null };
  kpis: Kpi[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const round = (n: number, digits: number) => Math.round(n * 10 ** digits) / 10 ** digits;
const percent = (n: number) => `${Math.round(n * 100)}%`;

/** 저장된 draft_json이 내용 있는 AI 초안인지 ('AI 없이 직접 작성'은 빈 초안으로 시작한다) */
export function hasAiDraft(draft: unknown): boolean {
  const parsed = RecordDraftSchema.safeParse(draft);
  if (!parsed.success) return false;
  return parsed.data.service_types.length > 0 || RECORD_FIELDS.some(({ key }) => parsed.data[key].trim() !== "");
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function computeMetrics(records: MetricRecord[], opts: { baselineMinutes: number | null }): Metrics {
  // 사용 인원·기간
  const workers = new Set(records.map((r) => r.workerId)).size;
  const dayKeys = records.map((r) => seoulDate(r.visitedAt)).sort();
  const firstDay = dayKeys[0] ?? null;
  const lastDay = dayKeys.at(-1) ?? null;
  const days = firstDay && lastDay ? (Date.parse(lastDay) - Date.parse(firstDay)) / DAY_MS + 1 : 0;

  // 수용률: AI 초안이 있는 기록만
  const drafted = records.filter((r) => r.aiDrafted && r.editRatio !== null);
  const unchanged = drafted.filter((r) => r.editRatio === 0).length;
  const minor = drafted.filter((r) => r.editRatio! > 0 && r.editRatio! <= MINOR_EDIT_MAX).length;
  const rate = drafted.length ? round((unchanged + minor) / drafted.length, 3) : null;

  // 작성시간: 시간이 기록된 것 중 30분 이하만 평균
  const timed = records.map((r) => r.durationMs).filter((ms): ms is number => ms !== null && ms > 0).map((ms) => ms / 60_000);
  const counted = timed.filter((m) => m <= TIME_OUTLIER_MINUTES);
  const averageMinutes = counted.length ? round(counted.reduce((a, b) => a + b, 0) / counted.length, 2) : null;
  const medianMinutes = median(counted);
  const reduction = averageMinutes !== null && opts.baselineMinutes ? round(1 - averageMinutes / opts.baselineMinutes, 3) : null;

  const avgText = averageMinutes === null ? "기록 없음" : `평균 ${averageMinutes.toFixed(1)}분`;
  const kpis: Kpi[] = [
    {
      key: "time",
      label: "기록 작성시간 단축",
      value: reduction !== null ? `${percent(reduction)} 단축 (${avgText})` : `${avgText} (기존 작성시간 미입력)`,
      target: `${percent(TARGETS.timeReduction)} 이상 단축`,
      met: reduction === null ? null : reduction >= TARGETS.timeReduction,
    },
    {
      key: "pilot",
      label: "파일럿 참여",
      value: `${workers}명 · ${days}일`,
      target: `${TARGETS.workers}~10명 · ${TARGETS.days}일 이상`,
      met: workers >= TARGETS.workers && days >= TARGETS.days,
    },
    {
      key: "records",
      label: "누적 기록",
      value: `${records.length}건`,
      target: `${TARGETS.records}건 이상`,
      met: records.length >= TARGETS.records,
    },
    {
      key: "acceptance",
      label: "AI 초안 수용률",
      value: rate === null ? "AI 초안 기록 없음" : percent(rate),
      target: `${percent(TARGETS.acceptance)} 이상`,
      met: rate === null ? null : rate >= TARGETS.acceptance,
    },
  ];

  return {
    records: records.length,
    workers,
    firstDay,
    lastDay,
    days,
    acceptance: { aiDrafted: drafted.length, unchanged, minor, major: drafted.length - unchanged - minor, rate },
    writingTime: { counted: counted.length, excluded: timed.length - counted.length, averageMinutes, medianMinutes, reduction },
    kpis,
  };
}
