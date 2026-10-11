"use server";

import { refresh } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { z } from "zod";
import { ClientClosedSchema, ClientRegisterSchema, ClientUpdateSchema } from "@/schemas/client";

export type ClientActionResult = { ok: true } | { ok: false; error: string };

// DB 함수(register_client 등)가 내는 오류 코드 → 화면 문구
const ERROR_TEXT: Record<string, string> = {
  "42501": "대상자 등록·수정은 대상자와 연결된 동 행정복지센터 담당자만 할 수 있어요.",
  "23505": "이미 쓰고 있거나 예전에 쓴 식별번호예요. 다른 번호를 넣거나 비워 두세요.",
  "22023": "입력 내용을 확인해 주세요.",
  "23514": "입력 내용을 확인해 주세요.",
  "23503": "입력 내용을 확인해 주세요.",
};

/** 입력 검사 실패 → 어느 칸이 틀렸는지 알려 준다 */
function invalid(error: z.ZodError): { ok: false; error: string } {
  const fields = new Set(error.issues.map((i) => i.path[0]));
  if (fields.has("dong")) return { ok: false, error: "동 칸에는 동 이름만 적어 주세요 (예: 서구 화정1동). 주소·연락처·성명은 적지 않습니다." };
  if (fields.has("code")) return { ok: false, error: "식별번호는 C-숫자4자리로 적어 주세요 (예: C-2021). 등록할 때는 비워 둬도 됩니다." };
  return { ok: false, error: "입력 내용을 확인해 주세요." };
}

function failed(label: string, error: { code?: string }): { ok: false; error: string } {
  const text = error.code ? ERROR_TEXT[error.code] : undefined;
  if (!text) console.error(`[${label}] ${error.code ?? "unknown"}`); // 입력 내용은 남기지 않는다
  return { ok: false, error: text ?? "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
}

/** 대상자 등록 (동 담당자). 붙은 식별번호를 돌려준다. */
export async function registerClient(input: unknown): Promise<{ ok: true; code: string } | { ok: false; error: string }> {
  const parsed = ClientRegisterSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { code, ageBand, dong, partnerAgencyIds } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_client", {
    p_code: code,
    p_age_band: ageBand as number, // 미입력(null)도 넘긴다 — 생성 타입은 함수 인자의 null을 표현하지 못한다
    p_dong: dong,
    p_partner_ids: partnerAgencyIds,
  });
  if (error || !data) return failed("client-register", error ?? {});
  refresh();
  return { ok: true, code: data };
}

/** 식별번호·연령대·동·함께 돌볼 기관 수정 (동 담당자). 번호를 바꾸면 DB가 이력을 남긴다. */
export async function updateClient(input: unknown): Promise<ClientActionResult> {
  const parsed = ClientUpdateSchema.safeParse(input);
  if (!parsed.success) return invalid(parsed.error);
  const { clientId, code, ageBand, dong, partnerAgencyIds } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("update_client", {
    p_client_id: clientId,
    p_code: code,
    p_age_band: ageBand as number,
    p_dong: dong,
    p_partner_ids: partnerAgencyIds,
  });
  if (error) return failed("client-update", error);
  refresh();
  return { ok: true };
}

/** 종결(목록에서 숨김, 기록은 그대로) 또는 다시 진행 */
export async function setClientClosed(input: unknown): Promise<ClientActionResult> {
  const parsed = ClientClosedSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "요청을 확인해 주세요." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_client_closed", { p_client_id: parsed.data.clientId, p_closed: parsed.data.closed });
  if (error) return failed("client-closed", error);
  refresh();
  return { ok: true };
}
