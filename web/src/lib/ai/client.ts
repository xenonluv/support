import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";

// LLM 호출은 lib/ai만 쓴다 (CLAUDE.md). 초안·브리핑이 함께 쓰는 클라이언트·오류. 테스트에서는 가짜 클라이언트를 넣는다.
type ParseParams = Parameters<Anthropic["messages"]["parse"]>[0];

export type AiClient = {
  messages: {
    parse(params: ParseParams): Promise<{
      stop_reason: string | null;
      stop_details: { category: string | null } | null;
      parsed_output: unknown;
      model: string;
    }>;
  };
};

export class AiConfigError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set");
    this.name = "AiConfigError";
  }
}

export class AiRefusedError extends Error {
  constructor(readonly category: string | null) {
    super(`ai refused (${category ?? "unknown"})`);
    this.name = "AiRefusedError";
  }
}

export class AiFailedError extends Error {
  constructor(reason: string) {
    super(`ai failed (${reason})`);
    this.name = "AiFailedError";
  }
}

/** 구조화 출력 요청 → 거절·해석 실패를 오류로 바꾸고, 결과를 Zod로 다시 검사한다. */
export async function requestStructured<S extends z.ZodType>(
  ai: AiClient,
  params: ParseParams,
  schema: S,
): Promise<{ data: z.infer<S>; model: string }> {
  const res = await ai.messages.parse(params);
  if (res.stop_reason === "refusal") throw new AiRefusedError(res.stop_details?.category ?? null);
  const parsed = schema.safeParse(res.parsed_output);
  if (!parsed.success) throw new AiFailedError(res.stop_reason ?? "no-output");
  return { data: parsed.data, model: res.model };
}

export function defaultAiClient(): AiClient {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiConfigError();
  const anthropic = new Anthropic({ apiKey });
  return { messages: { parse: (params) => anthropic.messages.parse(params) } };
}
