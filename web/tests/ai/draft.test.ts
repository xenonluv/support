import { afterEach, describe, expect, it } from "vitest";
import { AiConfigError, AiFailedError, AiRefusedError, type AiClient } from "@/lib/ai/client";
import { generateDraft } from "@/lib/ai/draft";
import { DRAFT_MODEL } from "@/lib/ai/models";
import { DRAFT_FIXTURE, DRAFT_OUTPUT_FIXTURE } from "../fixtures/record-draft";

type Reply = Awaited<ReturnType<AiClient["messages"]["parse"]>>;

function fakeClient(reply: Partial<Reply>) {
  const calls: Parameters<AiClient["messages"]["parse"]>[0][] = [];
  const client: AiClient = {
    messages: {
      parse: async (params) => {
        calls.push(params);
        return { stop_reason: "end_turn", stop_details: null, parsed_output: DRAFT_OUTPUT_FIXTURE, model: DRAFT_MODEL, ...reply };
      },
    },
  };
  return { client, calls };
}

describe("generateDraft", () => {
  const saved = process.env.ANTHROPIC_API_KEY;
  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = saved;
  });

  it("정해진 모델·낮은 effort·캐시된 시스템 프롬프트로 요청하고 초안을 돌려준다", async () => {
    const { client, calls } = fakeClient({});
    const result = await generateDraft("어르신께서 고혈압약을 이틀째 안 드셨어요", client);
    expect(result).toEqual({
      draft: DRAFT_FIXTURE,
      signals: [DRAFT_OUTPUT_FIXTURE.signals[0]],
      alertDraft: DRAFT_OUTPUT_FIXTURE.alert_draft,
      model: DRAFT_MODEL,
    });
    const sent = calls[0];
    expect(sent.model).toBe(DRAFT_MODEL);
    expect(sent.output_config?.effort).toBe("low");
    expect(JSON.stringify(sent.system)).toContain("ephemeral");
    expect(JSON.stringify(sent.messages)).toContain("<구술>");
  });

  it("근거가 구술에 없는 신호는 버리고, 남은 신호가 없으면 알림 문안도 비운다", async () => {
    const { client } = fakeClient({
      parsed_output: { ...DRAFT_OUTPUT_FIXTURE, signals: [DRAFT_OUTPUT_FIXTURE.signals[1]] },
    });
    const result = await generateDraft("어르신께서 고혈압약을 이틀째 안 드셨어요", client);
    expect(result.signals).toEqual([]);
    expect(result.alertDraft).toBe("");
  });

  it("대상자 정보(식별번호·연령대·동)가 있으면 함께 보낸다", async () => {
    const { client, calls } = fakeClient({});
    await generateDraft("어르신 방문 기록입니다", client, { code: "C-0012", ageBand: 70, dong: "서구 화정1동" });
    expect(JSON.stringify(calls[0].messages)).toContain("<대상자>C-0012 · 70대 · 서구 화정1동</대상자>");
  });

  it("호출 전에 개인정보를 다시 가린다", async () => {
    const { client, calls } = fakeClient({});
    await generateDraft("김영희 어르신 010-1234-5678", client);
    const sent = JSON.stringify(calls[0].messages);
    expect(sent).toContain("[이름] 어르신 [전화번호]");
    expect(sent).not.toContain("김영희");
  });

  it("대상자 머리말도 가린 뒤 보낸다", async () => {
    const { client, calls } = fakeClient({});
    await generateDraft("어르신 방문 기록입니다", client, { code: "C-0012", ageBand: 70, dong: "서구 화정1동 010-1234-5678" });
    const sent = JSON.stringify(calls[0].messages);
    expect(sent).toContain("<대상자>C-0012 · 70대 · 서구 화정1동 [전화번호]</대상자>");
    expect(sent).not.toContain("010-1234-5678");
  });

  it("거절(refusal)이면 분류와 함께 AiRefusedError", async () => {
    const { client } = fakeClient({ stop_reason: "refusal", stop_details: { category: "general_harms" }, parsed_output: null });
    await expect(generateDraft("어르신 방문 기록입니다", client)).rejects.toMatchObject({
      name: "AiRefusedError",
      category: "general_harms",
    });
  });

  it("결과를 해석하지 못하면 AiFailedError", async () => {
    const empty = fakeClient({ stop_reason: "max_tokens", parsed_output: null });
    await expect(generateDraft("어르신 방문 기록입니다", empty.client)).rejects.toBeInstanceOf(AiFailedError);
    const wrong = fakeClient({ parsed_output: { summary: 1 } });
    await expect(generateDraft("어르신 방문 기록입니다", wrong.client)).rejects.toBeInstanceOf(AiFailedError);
  });

  it("ANTHROPIC_API_KEY가 없으면 설정 오류", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    await expect(generateDraft("어르신 방문 기록입니다")).rejects.toBeInstanceOf(AiConfigError);
  });

  it("거절 오류는 AiRefusedError 클래스다", async () => {
    const { client } = fakeClient({ stop_reason: "refusal", stop_details: null, parsed_output: null });
    await expect(generateDraft("어르신 방문 기록입니다", client)).rejects.toBeInstanceOf(AiRefusedError);
  });
});
