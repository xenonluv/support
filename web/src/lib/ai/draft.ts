import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { DRAFT_MODEL } from "@/lib/ai/models";
import { clientLabel, type ClientDisplay } from "@/lib/client-label";
import { DRAFT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { maskPersonalInfo } from "@/lib/privacy/mask";
import { DraftOutputSchema } from "@/schemas/draft-output";
import type { RecordDraft } from "@/schemas/record-draft";
import { keepGroundedSignals, type Signal } from "@/schemas/signal";

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

export type DraftResult = { draft: RecordDraft; signals: Signal[]; alertDraft: string; model: string };

/**
 * 구술 글 → 기록 초안 + 이상징후 신호 + 알림 문안 (한 번 호출).
 * 개인정보를 가린 뒤 호출하고, 결과는 Zod로 다시 검사하며, 근거가 구술에 없는 신호는 버린다.
 */
export async function generateDraft(transcript: string, client?: DraftClient, subject?: ClientDisplay): Promise<DraftResult> {
  const ai = client ?? defaultClient();
  const masked = maskPersonalInfo(transcript).text;
  const label = subject ? clientLabel(subject) : null;
  const header = label ? `<대상자>${label.title} · ${label.subtitle}</대상자>\n` : "";
  const res = await ai.messages.parse({
    model: DRAFT_MODEL,
    max_tokens: 8000,
    system: [{ type: "text", text: DRAFT_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `${header}<구술>\n${masked}\n</구술>` }],
    output_config: { effort: "low", format: zodOutputFormat(DraftOutputSchema) },
  });

  if (res.stop_reason === "refusal") throw new DraftRefusedError(res.stop_details?.category ?? null);
  const parsed = DraftOutputSchema.safeParse(res.parsed_output);
  if (!parsed.success) throw new DraftFailedError(res.stop_reason ?? "no-output");
  const signals = keepGroundedSignals(parsed.data.signals, masked);
  const alertDraft = signals.length > 0 ? maskPersonalInfo(parsed.data.alert_draft).text.trim() : "";
  return { draft: parsed.data.record, signals, alertDraft, model: res.model };
}

function defaultClient(): DraftClient {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new DraftConfigError();
  const anthropic = new Anthropic({ apiKey });
  return { messages: { parse: (params) => anthropic.messages.parse(params) } };
}
