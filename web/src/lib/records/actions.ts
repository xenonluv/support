"use server";

import { buildRecordRow } from "@/lib/records/row";
import { createClient } from "@/lib/supabase/server";
import { SaveRecordSchema } from "@/schemas/record-draft";

export type SaveResult = { ok: true; id: string; visitedAt: string } | { ok: false; error: string };

/** 방문 기록 저장. 로그인 사용자 권한으로 insert하므로 RLS가 본인·내 기관 대상자만 허용한다. */
export async function saveRecord(input: unknown): Promise<SaveResult> {
  const parsed = SaveRecordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "입력 내용을 확인해 주세요." };

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) return { ok: false, error: "로그인이 필요합니다." };

  const [{ data: me }, { data: client }] = await Promise.all([
    supabase.from("workers").select("agency_id").eq("id", userId).single(),
    supabase.from("clients").select("id").eq("code", parsed.data.clientCode).single(),
  ]);
  if (!me) return { ok: false, error: "직원 정보가 없습니다. 기관 담당자에게 문의해 주세요." };
  if (!client) return { ok: false, error: "담당 대상자가 아닙니다." };

  const row = buildRecordRow(parsed.data, { workerId: userId, agencyId: me.agency_id, clientId: client.id });
  const { data, error } = await supabase.from("visit_records").insert(row).select("id, visited_at").single();
  if (error || !data) {
    console.error(`[save] ${error?.code ?? "unknown"}`); // 기록 내용은 남기지 않는다
    return { ok: false, error: "저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  }
  return { ok: true, id: data.id, visitedAt: data.visited_at };
}
