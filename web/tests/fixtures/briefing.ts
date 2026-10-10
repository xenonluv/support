import type { BriefingContent } from "@/schemas/briefing";

// 브리핑 Claude 응답 예시 (실제 API를 부르지 않는 테스트용)
export const BRIEFING_FIXTURE: BriefingContent = {
  overview: "같은 주에 혈압약 미복용과 화장실 문턱 휘청임이 있었다. 수행기관 방문에서는 점심 절반 섭취와 무릎 통증 진료가 있었다.",
  changes: ["10월 5일 — 점심 절반 섭취", "10월 7일 — 오른쪽 무릎 통증으로 정형외과 진료", "10월 9일 — 혈압약 2일째 미복용"],
  by_agency: [
    { agency: "서구 노인맞춤돌봄 수행기관", summary: "목욕 지원·반찬 전달, 병원 동행" },
    { agency: "화정1동 행정복지센터", summary: "복약 확인 중 혈압약 미복용 발견, 화장실 문턱 휘청임 관찰" },
  ],
  follow_ups: ["복약 달력 설치 검토", "물리치료 예약일 동행"],
};
