"use server";

import { refresh } from "next/cache";
import { AiConfigError, AiRefusedError } from "@/lib/ai/client";
import { generateBriefing } from "@/lib/ai/briefing";
import { roleFromMetadata } from "@/lib/auth/routes";
import { loadBriefingSource } from "@/lib/briefing/data";
import { briefingPeriod } from "@/lib/briefing/period";
import { createClient } from "@/lib/supabase/server";
import { BriefingRequestSchema } from "@/schemas/briefing";

export type BriefingActionResult = { ok: true } | { ok: false; error: string };

/**
 * 대상자·기간의 기록(모든 기관)을 모아 브리핑을 만들고 저장한다. 관리자만.
 * 기록이 없으면 Claude를 부르지 않는다. 로그에는 오류 종류만 남긴다.
 */
export async function createBriefing(input: unknown): Promise<BriefingActionResult> {
  const parsed = BriefingRequestSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "요청을 확인해 주세요." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return { ok: false, error: "다시 로그인해 주세요." };
  if (roleFromMetadata(auth.claims.app_metadata) !== "manager") return { ok: false, error: "브리핑은 관리자만 만들 수 있어요." };

  const now = new Date();
  const period = briefingPeriod(now, parsed.data.days);
  const source = await loadBriefingSource(supabase, parsed.data.clientCode, period, now);
  if (!source) return { ok: false, error: "볼 수 없는 대상자예요." };
  if (source.records.length === 0) return { ok: false, error: "이 기간에는 기록이 없어 만들 수 없어요." };

  let body: string;
  try {
    const { content } = await generateBriefing({ subject: source.subject, period, records: source.records, signals: source.signals });
    body = JSON.stringify(content);
  } catch (e) {
    if (e instanceof AiConfigError) {
      console.error("[briefing] not-configured");
      return { ok: false, error: "AI 설정이 없어 만들 수 없어요. 운영 담당자에게 알려 주세요." };
    }
    console.error(`[briefing] ${e instanceof AiRefusedError ? `refused (${e.category ?? "unknown"})` : "failed"}`);
    return { ok: false, error: "브리핑을 만들지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  }

  const { error } = await supabase.from("briefings").insert({
    client_id: source.clientId,
    period_from: period.from,
    period_to: period.to,
    body,
    created_by: userId,
  });
  if (error) {
    console.error(`[briefing] save-failed ${error.code}`);
    return { ok: false, error: "브리핑을 저장하지 못했어요. 다시 시도해 주세요." };
  }
  refresh();
  return { ok: true };
}
