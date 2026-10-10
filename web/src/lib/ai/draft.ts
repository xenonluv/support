import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { defaultAiClient, requestStructured, type AiClient } from "@/lib/ai/client";
import { DRAFT_MODEL } from "@/lib/ai/models";
import { clientLabel, type ClientDisplay } from "@/lib/client-label";
import { DRAFT_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { maskPersonalInfo } from "@/lib/privacy/mask";
import { DraftOutputSchema } from "@/schemas/draft-output";
import type { RecordDraft } from "@/schemas/record-draft";
import { keepGroundedSignals, type Signal } from "@/schemas/signal";

export type DraftResult = { draft: RecordDraft; signals: Signal[]; alertDraft: string; model: string };

/**
 * 구술 글 → 기록 초안 + 이상징후 신호 + 알림 문안 (한 번 호출).
 * 개인정보를 가린 뒤 호출하고, 결과는 Zod로 다시 검사하며, 근거가 구술에 없는 신호는 버린다.
 */
export async function generateDraft(transcript: string, client?: AiClient, subject?: ClientDisplay): Promise<DraftResult> {
  const ai = client ?? defaultAiClient();
  const masked = maskPersonalInfo(transcript).text;
  const label = subject ? clientLabel(subject) : null;
  // 머리말(식별번호·연령대·동)도 가린 뒤 보낸다 — LLM 입력은 모두 마스킹을 거친다
  const header = label ? `<대상자>${maskPersonalInfo(`${label.title} · ${label.subtitle}`).text}</대상자>\n` : "";
  const { data, model } = await requestStructured(
    ai,
    {
      model: DRAFT_MODEL,
      max_tokens: 8000,
      system: [{ type: "text", text: DRAFT_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: `${header}<구술>\n${masked}\n</구술>` }],
      output_config: { effort: "low", format: zodOutputFormat(DraftOutputSchema) },
    },
    DraftOutputSchema,
  );
  const signals = keepGroundedSignals(data.signals, masked);
  const alertDraft = signals.length > 0 ? maskPersonalInfo(data.alert_draft).text.trim() : "";
  return { draft: data.record, signals, alertDraft, model };
}
