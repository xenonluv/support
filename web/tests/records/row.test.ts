import { describe, expect, it } from "vitest";
import { buildRecordRow } from "@/lib/records/row";
import type { RecordDraft, SaveRecordInput } from "@/schemas/record-draft";

const draft: RecordDraft = {
  summary: "점심 절반 섭취",
  service_types: ["안전지원"],
  health: "",
  medication: "혈압약 복용함",
  meals: "점심 절반 섭취",
  mood: "",
  living: "",
  services_provided: "말벗",
  notes: "",
  follow_up: "",
};
const ctx = { workerId: "w-1", agencyId: "a-1", clientId: "c-1" };
const base: SaveRecordInput = {
  clientCode: "C-0012",
  transcript: "김영희 어르신 점심 절반 드심",
  draft,
  final: draft,
  inputMode: "voice",
  sttEngine: "groq/whisper-large-v3-turbo",
  durationMs: 95_000,
  signals: [],
  alertDraft: "",
};

describe("buildRecordRow", () => {
  it("초안을 그대로 저장하면 edited=false, edit_ratio=0", () => {
    const row = buildRecordRow(base, ctx);
    expect(row).toMatchObject({
      client_id: "c-1",
      worker_id: "w-1",
      agency_id: "a-1",
      edited: false,
      edit_ratio: 0,
      input_mode: "voice",
      stt_engine: "groq/whisper-large-v3-turbo",
      duration_ms: 95_000,
    });
  });

  it("고쳐서 저장하면 edited=true, edit_ratio>0", () => {
    const row = buildRecordRow({ ...base, final: { ...draft, notes: "다음 방문 때 복약 재확인" } }, ctx);
    expect(row.edited).toBe(true);
    expect(row.edit_ratio).toBeGreaterThan(0);
  });

  it("구술 글과 최종 기록의 개인정보를 다시 가린다", () => {
    const row = buildRecordRow({ ...base, final: { ...draft, notes: "아드님 010-1234-5678 통화" } }, ctx);
    expect(row.transcript_text).toBe("[이름] 어르신 점심 절반 드심");
    expect((row.final_json as RecordDraft).notes).toBe("아드님 [전화번호] 통화");
  });

  it("글 입력이면 STT 엔진은 비우고, 빈 구술은 null로 둔다", () => {
    const row = buildRecordRow({ ...base, inputMode: "text", sttEngine: null, transcript: "  " }, ctx);
    expect(row.stt_engine).toBeNull();
    expect(row.transcript_text).toBeNull();
  });
});
