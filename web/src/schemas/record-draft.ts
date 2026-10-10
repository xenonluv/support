import { z } from "zod";
import { MAX_EVIDENCE_LENGTH, SignalSchema } from "@/schemas/signal";

// 기록 초안 서식 — 단일 출처. 「2026년 노인맞춤돌봄서비스 사업안내」 원문을 받으면 이 파일만 바꾼다.

export const SERVICE_TYPES = ["안전지원", "사회참여", "생활교육", "일상생활지원", "연계서비스"] as const;

export const RecordDraftSchema = z.object({
  summary: z.string().describe("방문 내용 한 줄 요약"),
  service_types: z.array(z.enum(SERVICE_TYPES)).describe("이번 방문에서 제공한 서비스 유형"),
  health: z.string().describe("건강 상태(통증·어지러움·혈압 등). 언급 없으면 빈 문자열"),
  medication: z.string().describe("복약 상황. 언급 없으면 빈 문자열"),
  meals: z.string().describe("식사 상황. 언급 없으면 빈 문자열"),
  mood: z.string().describe("정서·심리 상태. 언급 없으면 빈 문자열"),
  living: z.string().describe("주거·생활환경(청소·난방·위생 등). 언급 없으면 빈 문자열"),
  services_provided: z.string().describe("이번 방문에서 실제로 제공한 서비스 내용"),
  notes: z.string().describe("특이사항(낙상 위험, 방문 거부 등). 없으면 빈 문자열"),
  follow_up: z.string().describe("후속 조치가 필요한 일. 없으면 빈 문자열"),
});

export type RecordDraft = z.infer<typeof RecordDraftSchema>;

type TextField = Exclude<keyof RecordDraft, "service_types">;

/** 화면·복사글에 쓰는 항목 순서와 이름 */
export const RECORD_FIELDS: { key: TextField; label: string }[] = [
  { key: "summary", label: "요약" },
  { key: "health", label: "건강" },
  { key: "medication", label: "복약" },
  { key: "meals", label: "식사" },
  { key: "mood", label: "정서" },
  { key: "living", label: "생활환경" },
  { key: "services_provided", label: "제공 서비스" },
  { key: "notes", label: "특이사항" },
  { key: "follow_up", label: "후속 조치" },
];

/** POST /api/draft 입력 */
export const DraftRequestSchema = z.object({
  transcript: z.string().trim().min(5, "구술 내용이 너무 짧습니다").max(5000, "구술 내용이 너무 깁니다"),
  /** 알림 문안에 동 이름을 쓰려고 함께 보낸다 (서버가 권한 안에서 다시 찾는다) */
  clientCode: z.string().regex(/^C-\d{4}$/).optional(),
});

/** 저장할 때 한 항목의 최대 글자 수 (수정 비율 계산 부하·DB 크기 제한) */
export const MAX_FIELD_LENGTH = 2000;

// AI 출력 형식(RecordDraftSchema)은 그대로 두고, 저장 입력에만 글자 수 상한을 건다
const StoredDraftSchema = RecordDraftSchema.refine(
  (d) => RECORD_FIELDS.every(({ key }) => d[key].length <= MAX_FIELD_LENGTH),
  { message: `항목은 ${MAX_FIELD_LENGTH}자까지 쓸 수 있습니다` },
);

/** 작성시간 측정 상한: 하루 (방문이 길거나 화면을 오래 열어 둔 경우도 저장되도록) */
export const MAX_DURATION_MS = 24 * 60 * 60 * 1000;

/** 저장 서버 액션 입력 */
export const SaveRecordSchema = z.object({
  clientCode: z.string().regex(/^C-\d{4}$/),
  transcript: z.string().max(5000),
  draft: StoredDraftSchema,
  final: StoredDraftSchema,
  inputMode: z.enum(["voice", "text"]),
  sttEngine: z.string().max(100).nullable(),
  durationMs: z.number().int().min(0).max(MAX_DURATION_MS),
  /** 현장 인력이 확인하고 남긴 신호 (뺀 신호는 저장하지 않는다) */
  signals: z.array(SignalSchema.extend({ evidence_quote: z.string().max(MAX_EVIDENCE_LENGTH) })).max(5).default([]),
  alertDraft: z.string().max(MAX_FIELD_LENGTH).default(""),
});

export type SaveRecordInput = z.infer<typeof SaveRecordSchema>;

/** 복사·비교용 글. 비어 있는 항목은 뺀다. */
export function formatRecordText(draft: RecordDraft, header?: { clientCode: string; date: string }): string {
  const lines: string[] = [];
  if (header) lines.push(`[방문 기록] ${header.clientCode} · ${header.date}`);
  for (const { key, label } of RECORD_FIELDS) {
    if (key === "summary") {
      if (draft.summary.trim()) lines.push(`요약: ${draft.summary.trim()}`);
      if (draft.service_types.length) lines.push(`서비스 유형: ${draft.service_types.join(", ")}`);
      continue;
    }
    const value = draft[key].trim();
    if (value) lines.push(`${label}: ${value}`);
  }
  return lines.join("\n");
}
