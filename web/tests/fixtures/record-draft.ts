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
