import { describe, expect, it } from "vitest";
import { readAll, toMetricRecords } from "@/lib/metrics/rows";

describe("readAll", () => {
  it("1000행씩 나눠 끝까지 읽는다", async () => {
    const all = Array.from({ length: 2500 }, (_, i) => i);
    const asked: [number, number][] = [];
    const rows = await readAll(async (from, to) => {
      asked.push([from, to]);
      return { data: all.slice(from, to + 1), error: null };
    });
    expect(rows).toHaveLength(2500);
    expect(asked).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
  });

  it("오류가 나면 조용히 넘기지 않고 알린다 (지표가 적게 나오지 않게)", async () => {
    await expect(readAll(async () => ({ data: null, error: { message: "timeout" } }))).rejects.toThrow("timeout");
  });
});

describe("toMetricRecords", () => {
  it("시연·파일럿 연습 데이터는 빼고, AI 초안 여부를 붙인다", () => {
    const draft = { summary: "안부", service_types: [], health: "", medication: "", meals: "", mood: "", living: "", services_provided: "", notes: "", follow_up: "" };
    const empty = { ...draft, summary: "" };
    const base = { worker_id: "w1", visited_at: "2026-10-12T01:00:00Z", edit_ratio: 0, duration_ms: 60_000 };
    expect(
      toMetricRecords([
        { ...base, draft_json: draft, stt_engine: "whisper-large-v3-turbo" },
        { ...base, draft_json: empty, stt_engine: null, edit_ratio: 1 },
        { ...base, draft_json: draft, stt_engine: "seed-demo" },
        { ...base, draft_json: draft, stt_engine: "pilot-demo" },
      ]),
    ).toEqual([
      { workerId: "w1", visitedAt: base.visited_at, aiDrafted: true, editRatio: 0, durationMs: 60_000 },
      { workerId: "w1", visitedAt: base.visited_at, aiDrafted: false, editRatio: 1, durationMs: 60_000 },
    ]);
  });
});
