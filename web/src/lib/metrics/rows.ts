import { hasAiDraft, type MetricRecord } from "@/lib/metrics/compute";
import type { Database } from "@/lib/supabase/types";

// 화면(/metrics)과 집계 스크립트가 함께 쓰는 DB 행 처리. next 모듈을 쓰지 않아 관리 스크립트에서도 가져다 쓴다.

export type MetricRow = Pick<
  Database["public"]["Tables"]["visit_records"]["Row"],
  "worker_id" | "visited_at" | "draft_json" | "edit_ratio" | "duration_ms" | "stt_engine"
>;

/** 지표에 필요한 visit_records 컬럼 */
export const METRIC_COLUMNS = "worker_id, visited_at, draft_json, edit_ratio, duration_ms, stt_engine";

const PAGE = 1000;

/** PostgREST는 한 번에 1000행까지만 돌려준다. 1000행씩 나눠 끝까지 읽는다(호출하는 쪽이 정렬을 정한다). */
export async function readAll<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < PAGE) return rows;
  }
}

/** 시연·연습 데이터 표시(stt_engine). seed-demo: 시험 계정 시연, pilot-demo: 파일럿 계정 연습 데이터 */
export const DEMO_ENGINES = ["seed-demo", "pilot-demo"] as const;

/** DB 행 → 지표 입력. 시연·연습 데이터는 뺀다. */
export function toMetricRecords(rows: MetricRow[]): MetricRecord[] {
  return rows
    .filter((r) => !(DEMO_ENGINES as readonly (string | null)[]).includes(r.stt_engine))
    .map((r) => ({
      workerId: r.worker_id,
      visitedAt: r.visited_at,
      aiDrafted: hasAiDraft(r.draft_json),
      editRatio: r.edit_ratio,
      durationMs: r.duration_ms,
    }));
}
