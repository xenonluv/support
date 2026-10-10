import { afterEach, describe, expect, it } from "vitest";
import { AiConfigError, AiFailedError, AiRefusedError, type AiClient } from "@/lib/ai/client";
import { generateBriefing } from "@/lib/ai/briefing";
import { BRIEFING_MODEL } from "@/lib/ai/models";
import type { BriefingRecord } from "@/lib/briefing/input";
import { briefingPeriod } from "@/lib/briefing/period";
import type { RecordDraft } from "@/schemas/record-draft";
import { BRIEFING_FIXTURE } from "../fixtures/briefing";

type Reply = Awaited<ReturnType<AiClient["messages"]["parse"]>>;

function fakeClient(reply: Partial<Reply>) {
  const calls: Parameters<AiClient["messages"]["parse"]>[0][] = [];
  const client: AiClient = {
    messages: {
      parse: async (params) => {
        calls.push(params);
        return { stop_reason: "end_turn", stop_details: null, parsed_output: BRIEFING_FIXTURE, model: BRIEFING_MODEL, ...reply };
      },
    },
  };
  return { client, calls };
}

const A = "화정1동 행정복지센터";
const B = "서구 노인맞춤돌봄 수행기관";
const record = (summary: string): RecordDraft => ({
  summary,
  service_types: [],
  health: "",
  medication: "",
  meals: "",
  mood: "",
  living: "",
  services_provided: "",
  notes: "",
  follow_up: "",
});
const records: BriefingRecord[] = [
  { visitedAt: "2026-10-05T01:00:00Z", agency: B, record: record("점심 절반 섭취, 목욕 지원") },
  { visitedAt: "2026-10-09T01:00:00Z", agency: A, record: record("김영희 어르신 혈압약 2일째 미복용") },
];
const input = {
  subject: { code: "C-0012", ageBand: 70, dong: "서구 화정1동" },
  period: briefingPeriod(new Date("2026-10-11T03:00:00Z"), 14),
  records,
  signals: [],
};

describe("generateBriefing", () => {
  const saved = process.env.ANTHROPIC_API_KEY;
  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = saved;
  });

  it("정해진 모델·낮은 effort·캐시된 시스템 프롬프트로, 가린 기록만 보낸다", async () => {
    const { client, calls } = fakeClient({});
    const result = await generateBriefing(input, client);
    expect(result).toEqual({ content: BRIEFING_FIXTURE, model: BRIEFING_MODEL });
    const params = calls[0];
    expect(params.model).toBe(BRIEFING_MODEL);
    expect(params.output_config?.effort).toBe("low");
    expect(params.system).toEqual([expect.objectContaining({ cache_control: { type: "ephemeral" } })]);
    const sent = JSON.stringify(params.messages);
    expect(sent).toContain(`[10월 5일 · ${B}]`);
    expect(sent).toContain("[이름] 어르신 혈압약");
    expect(sent).not.toContain("김영희");
  });

  it("받은 글도 가리고, 입력에 없는 기관은 버리고, 기관은 입력 순서로 정렬한다", async () => {
    const { client } = fakeClient({
      parsed_output: {
        ...BRIEFING_FIXTURE,
        overview: "박철수 어르신께 010-9876-5432로 연락함",
        by_agency: [
          { agency: A, summary: "복약 확인" },
          { agency: "지어낸 복지관", summary: "방문함" },
          { agency: ` ${B} `, summary: "목욕 지원" },
          { agency: A, summary: "중복" },
        ],
      },
    });
    const { content } = await generateBriefing(input, client);
    expect(content.overview).toBe("[이름] 어르신께 [전화번호]로 연락함");
    expect(content.by_agency).toEqual([
      { agency: B, summary: "목욕 지원" },
      { agency: A, summary: "복약 확인" },
    ]);
  });

  it("변화는 6개, 이어서 할 일은 5개까지만 남기고 빈 줄은 뺀다", async () => {
    const { client } = fakeClient({
      parsed_output: {
        ...BRIEFING_FIXTURE,
        changes: ["", ...Array.from({ length: 8 }, (_, i) => `변화 ${i}`)],
        follow_ups: ["  ", ...Array.from({ length: 7 }, (_, i) => `할 일 ${i}`)],
      },
    });
    const { content } = await generateBriefing(input, client);
    expect(content.changes).toEqual(["변화 0", "변화 1", "변화 2", "변화 3", "변화 4", "변화 5"]);
    expect(content.follow_ups).toEqual(["할 일 0", "할 일 1", "할 일 2", "할 일 3", "할 일 4"]);
  });

  it("거절이면 AiRefusedError, 해석하지 못하거나 요약이 비면 AiFailedError", async () => {
    const refused = fakeClient({ stop_reason: "refusal", stop_details: { category: "general_harms" }, parsed_output: null });
    await expect(generateBriefing(input, refused.client)).rejects.toBeInstanceOf(AiRefusedError);
    const empty = fakeClient({ stop_reason: "max_tokens", parsed_output: null });
    await expect(generateBriefing(input, empty.client)).rejects.toBeInstanceOf(AiFailedError);
    const blank = fakeClient({ parsed_output: { ...BRIEFING_FIXTURE, overview: " " } });
    await expect(generateBriefing(input, blank.client)).rejects.toBeInstanceOf(AiFailedError);
  });

  it("ANTHROPIC_API_KEY가 없으면 설정 오류", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(generateBriefing(input)).rejects.toBeInstanceOf(AiConfigError);
  });
});
