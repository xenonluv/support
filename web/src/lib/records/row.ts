import { maskPersonalInfo } from "@/lib/privacy/mask";
import { editRatio } from "@/lib/records/edit-ratio";
import type { Database } from "@/lib/supabase/types";
import { RECORD_FIELDS, formatRecordText, type RecordDraft, type SaveRecordInput } from "@/schemas/record-draft";

type VisitRecordInsert = Database["public"]["Tables"]["visit_records"]["Insert"];

/** 기록의 글 항목마다 개인정보를 가린다 (사람이 고치면서 이름을 적었을 수 있다) */
function maskDraft(draft: RecordDraft): RecordDraft {
  const out = { ...draft };
  for (const { key } of RECORD_FIELDS) out[key] = maskPersonalInfo(draft[key]).text;
  return out;
}

/** 저장할 방문 기록 행. 수용률 측정값(edited, edit_ratio)을 여기서 계산한다. */
export function buildRecordRow(
  input: SaveRecordInput,
  ctx: { workerId: string; agencyId: string; clientId: string },
): VisitRecordInsert {
  const draft = maskDraft(input.draft);
  const final = maskDraft(input.final);
  const ratio = editRatio(formatRecordText(draft), formatRecordText(final));
  const transcript = maskPersonalInfo(input.transcript.trim()).text;
  return {
    client_id: ctx.clientId,
    worker_id: ctx.workerId,
    agency_id: ctx.agencyId,
    transcript_text: transcript || null,
    draft_json: draft,
    final_json: final,
    edited: ratio > 0,
    edit_ratio: ratio,
    input_mode: input.inputMode,
    stt_engine: input.inputMode === "voice" ? input.sttEngine : null,
    duration_ms: input.durationMs,
  };
}
