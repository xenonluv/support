import type { RecordDraft } from "@/schemas/record-draft";

// Claude 기록 초안 응답 예시 (테스트에서 실제 API 대신 쓴다)
export const DRAFT_FIXTURE: RecordDraft = {
  summary: "혈압약 2일 미복용, 점심 절반 섭취, 문턱에서 휘청거림",
  service_types: ["안전지원", "일상생활지원"],
  health: "",
  medication: "고혈압약 2일째 미복용",
  meals: "점심 절반 섭취",
  mood: "",
  living: "",
  services_provided: "복약 확인, 식사 상황 확인",
  notes: "화장실 문턱에서 1회 휘청거림",
  follow_up: "",
};

// 기록 + 신호 + 알림 문안을 함께 받는 응답 예시 (7단계)
export const DRAFT_OUTPUT_FIXTURE = {
  record: DRAFT_FIXTURE,
  signals: [
    { type: "missed_medication", level: "caution", evidence_quote: "고혈압약을 이틀째 안 드셨어요" },
    // 구술에 없는 근거 — 버려져야 한다
    { type: "fall", level: "observe", evidence_quote: "계단에서 넘어지셨어요" },
  ],
  alert_draft: "화정1동 통합돌봄 담당자님, C-0012 어르신의 복약 누락이 확인되어 공유드립니다.",
};
