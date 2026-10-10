import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { DRAFT_MODEL } from "@/lib/ai/models";
import { DRAFT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { maskPersonalInfo } from "@/lib/privacy/mask";
import { RecordDraftSchema, type RecordDraft } from "@/schemas/record-draft";

// LLM 호출은 lib/ai만 쓴다 (CLAUDE.md). 테스트에서는 가짜 클라이언트를 넣는다.
type ParseParams = Parameters<Anthropic["messages"]["parse"]>[0];

export type DraftClient = {
  messages: {
    parse(params: ParseParams): Promise<{
      stop_reason: string | null;
      stop_details: { category: string | null } | null;
      parsed_output: unknown;
      model: string;
    }>;
  };
};

export class DraftConfigError extends Error {
  constructor() {
    super("ANTHROPIC_API_KEY is not set");
    this.name = "DraftConfigError";
  }
}

export class DraftRefusedError extends Error {
  constructor(readonly category: string | null) {
    super(`draft refused (${category ?? "unknown"})`);
    this.name = "DraftRefusedError";
  }
}

export class DraftFailedError extends Error {
  constructor(reason: string) {
    super(`draft failed (${reason})`);
    this.name = "DraftFailedError";
  }
}

/** 구술 글 → 기록 초안. 개인정보를 가린 뒤 호출하고, 결과는 Zod로 다시 검사한다. */
export async function generateDraft(transcript: string, client?: DraftClient): Promise<{ draft: RecordDraft; model: string }> {
  const ai = client ?? defaultClient();
  const masked = maskPersonalInfo(transcript).text;
  const res = await ai.messages.parse({
    model: DRAFT_MODEL,
    max_tokens: 8000,
    system: [{ type: "text", text: DRAFT_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `<구술>\n${masked}\n</구술>` }],
    output_config: { effort: "low", format: zodOutputFormat(RecordDraftSchema) },
  });

  if (res.stop_reason === "refusal") throw new DraftRefusedError(res.stop_details?.category ?? null);
  const parsed = RecordDraftSchema.safeParse(res.parsed_output);
  if (!parsed.success) throw new DraftFailedError(res.stop_reason ?? "no-output");
  return { draft: parsed.data, model: res.model };
}

function defaultClient(): DraftClient {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new DraftConfigError();
  const anthropic = new Anthropic({ apiKey });
  return { messages: { parse: (params) => anthropic.messages.parse(params) } };
}
