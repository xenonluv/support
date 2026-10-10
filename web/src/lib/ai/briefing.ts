import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { AiFailedError, defaultAiClient, requestStructured, type AiClient } from "@/lib/ai/client";
import { BRIEFING_MODEL } from "@/lib/ai/models";
import { BRIEFING_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { buildBriefingInput } from "@/lib/briefing/input";
import { maskPersonalInfo } from "@/lib/privacy/mask";
import { BriefingContentSchema, MAX_CHANGES, MAX_FOLLOW_UPS, type BriefingContent } from "@/schemas/briefing";

export type BriefingResult = { content: BriefingContent; model: string };

const clean = (s: string) => maskPersonalInfo(s).text.trim();
const cleanList = (items: string[], max: number) => items.map(clean).filter(Boolean).slice(0, max);

/**
 * 여러 기관의 기록 → 인수인계 브리핑. 입력 전체를 가린 뒤 호출한다.
 * 받은 글도 다시 가리고, 입력에 없던 기관 이름은 버린다.
 */
export async function generateBriefing(input: Parameters<typeof buildBriefingInput>[0], client?: AiClient): Promise<BriefingResult> {
  const ai = client ?? defaultAiClient();
  const { text, agencies } = buildBriefingInput(input);
  const { data, model } = await requestStructured(
    ai,
    {
      model: BRIEFING_MODEL,
      max_tokens: 4000,
      system: [{ type: "text", text: BRIEFING_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: text }],
      output_config: { effort: "low", format: zodOutputFormat(BriefingContentSchema) },
    },
    BriefingContentSchema,
  );

  const overview = clean(data.overview);
  if (!overview) throw new AiFailedError("empty-overview");
  const byAgency = new Map<string, string>();
  for (const a of data.by_agency) {
    const agency = a.agency.trim();
    const summary = clean(a.summary);
    if (agencies.includes(agency) && summary && !byAgency.has(agency)) byAgency.set(agency, summary);
  }
  return {
    content: {
      overview,
      changes: cleanList(data.changes, MAX_CHANGES),
      by_agency: agencies.filter((a) => byAgency.has(a)).map((agency) => ({ agency, summary: byAgency.get(agency)! })),
      follow_ups: cleanList(data.follow_ups, MAX_FOLLOW_UPS),
    },
    model,
  };
}
