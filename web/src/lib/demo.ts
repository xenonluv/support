// 2단계 미리보기용 예시 데이터. 실제 사람·기관 정보가 아니다.
// 5단계(로그인·DB)와 7단계(이상징후)에서 실제 데이터로 바꾼다.
import type { ClientDisplay } from "@/lib/client-label";
import type { StatCardProps } from "@/components/stat-card";
import type { PriorityItem } from "@/components/client-rank-row";
import type { SignalCardProps } from "@/components/signal-card";
import type { CountKey } from "@/components/manager-nav";

const C0012: ClientDisplay = { code: "C-0012", ageBand: 70, dong: "서구 화정1동" };
const C0047: ClientDisplay = { code: "C-0047", ageBand: 80, dong: "서구 화정2동" };
const C0063: ClientDisplay = { code: "C-0063", ageBand: 80, dong: "서구 농성1동" };
const C0081: ClientDisplay = { code: "C-0081", ageBand: 70, dong: "서구 화정1동" };
const C0095: ClientDisplay = { code: "C-0095", ageBand: 70, dong: "서구 농성2동" };

export const DEMO_SUMMARY = {
  totalClients: 128,
  priorityCount: 3,
  recordsToday: 7,
  asOf: "2026년 10월 14일 수요일 09:45 기준",
};

export const DEMO_COUNTS: Record<CountKey, number> = { signals: 3, clients: 128, agencies: 12 };

export const DEMO_STATS: StatCardProps[] = [
  { label: "주의 필요", value: 3, caption: "즉시 확인 권장", tone: "caution", trend: [2, 3, 2, 4, 3, 5, 4, 6, 5, 7] },
  { label: "관찰 지속", value: 11, caption: "추이 모니터링", tone: "observe", trend: [6, 8, 7, 10, 9, 8, 11, 10, 9, 11] },
  { label: "특이사항 없음", value: 114, caption: "정상 범위", tone: "normal", trend: [108, 110, 109, 112, 111, 113, 112, 114, 113, 114] },
  { label: "이번 달 조기 발견", value: "9건", caption: "연계로 이어진 사례", tone: "highlight", trend: [1, 2, 2, 3, 4, 5, 6, 7, 9], trendKind: "bar" },
];

export const DEMO_PRIORITY: PriorityItem[] = [
  {
    client: C0012,
    summary: [
      { text: "복약 누락 2일 · " },
      { text: "낙상 위험 신규", emphasis: true },
      { text: " · 식사량 감소 6일째 — 3개 기관에서 동시 관찰" },
    ],
    status: "caution",
    agencyCount: 4,
  },
  {
    client: C0047,
    summary: [{ text: "3회 연속 " }, { text: "방문 거부", emphasis: true }, { text: " · 연락 두절 2일 — 안전 확인 필요" }],
    status: "caution",
    agencyCount: 2,
  },
  {
    client: C0063,
    summary: [{ text: "식사량 감소 4일째 · " }, { text: "복약 누락", emphasis: true }, { text: " 1일 — 2개 기관 관찰" }],
    status: "caution",
    agencyCount: 2,
  },
  {
    client: C0081,
    summary: [{ text: "정서 위축 관찰 4일째 — 지속 관찰 중, 즉시 조치는 불필요" }],
    status: "observe",
    agencyCount: 2,
  },
  {
    client: C0095,
    summary: [{ text: "지난주 표시된 식사량 감소 신호 해소 — 정상 범위로 회복" }],
    status: "resolved",
    agencyCount: 2,
  },
];

export type DemoAlert = {
  client: ClientDisplay;
  recordedAt: string;
  /** 여러 신호가 같은 시기에 겹칠 때만 */
  overlap?: { title: string; body: string };
  signals: SignalCardProps[];
  draft: string;
};

export const DEMO_ALERTS: Record<string, DemoAlert> = {
  "C-0012": {
    client: C0012,
    recordedAt: "방금 남긴 기록",
    overlap: {
      title: "여러 징후가 같은 시기에 겹칩니다",
      body: "단독으로는 지나칠 수 있지만, 최근 2주간 다른 기관 기록과 함께 보면 연계가 필요할 수 있어요.",
    },
    signals: [
      { name: "복약 누락", badge: { label: "2일", tone: "caution" }, detail: "고혈압약 2일분 미복용 · 10/12 타 기관에서도 관찰" },
      { name: "낙상 위험", badge: { label: "신규", tone: "caution" }, detail: "화장실 문턱에서 휘청거림 1회" },
      { name: "식사량 감소", badge: { label: "6일째", tone: "observe" }, detail: "점심 미섭취 · 10/08부터 지속" },
    ],
    draft:
      "화정1동 통합돌봄 담당자님, C-0012 어르신(70대)께서 복약 누락 2일 및 낙상 위험 징후가 확인되어 공유드립니다. 주거관리 및 식사지원 연계 검토를 요청드립니다.",
  },
  "C-0047": {
    client: C0047,
    recordedAt: "오늘 오전 기록",
    signals: [{ name: "방문 거부", badge: { label: "3회 연속", tone: "caution" }, detail: "문을 열지 않음 · 전화 연락 두절 2일" }],
    draft:
      "화정2동 통합돌봄 담당자님, C-0047 어르신(80대)께서 3회 연속 방문을 거부하셨고 2일째 연락이 닿지 않습니다. 안전 확인 방문을 요청드립니다.",
  },
  "C-0063": {
    client: C0063,
    recordedAt: "어제 오후 기록",
    overlap: {
      title: "두 가지 징후가 함께 나타납니다",
      body: "식사량 감소와 복약 누락이 같은 주에 기록되었어요. 건강 상태 확인이 필요할 수 있어요.",
    },
    signals: [
      { name: "식사량 감소", badge: { label: "4일째", tone: "observe" }, detail: "저녁 절반 이상 남김" },
      { name: "복약 누락", badge: { label: "1일", tone: "caution" }, detail: "아침 약 미복용" },
    ],
    draft:
      "농성1동 통합돌봄 담당자님, C-0063 어르신(80대)께서 식사량 감소 4일째와 복약 누락이 함께 관찰되어 공유드립니다. 방문건강관리 연계 검토를 요청드립니다.",
  },
  "C-0081": {
    client: C0081,
    recordedAt: "오늘 오전 기록",
    signals: [{ name: "정서적 위축", badge: { label: "4일째", tone: "observe" }, detail: "대화 시간이 짧아지고 외출을 꺼리심" }],
    draft:
      "화정1동 통합돌봄 담당자님, C-0081 어르신(70대)께서 4일째 정서적 위축이 관찰되고 있어 공유드립니다. 지속 관찰 중이며 필요 시 정서지원 연계를 검토하겠습니다.",
  },
  "C-0095": {
    client: C0095,
    recordedAt: "오늘 오전 기록",
    signals: [{ name: "식사량 감소", badge: { label: "해소", tone: "normal" }, detail: "세 끼 모두 평소 양으로 회복" }],
    draft:
      "농성2동 통합돌봄 담당자님, C-0095 어르신(70대)의 지난주 식사량 감소 신호가 해소되어 공유드립니다. 현재 정상 범위입니다.",
  },
};

/** 주소의 식별번호로 알림을 찾는다. "constructor" 같은 객체 내장 속성 이름은 없는 대상자로 본다. */
export function getDemoAlert(clientId: string): DemoAlert | undefined {
  return Object.hasOwn(DEMO_ALERTS, clientId) ? DEMO_ALERTS[clientId] : undefined;
}

export const DEMO_TODAY = "10월 14일 (수)";

export type DemoVisit = { client: ClientDisplay; time: string; done: boolean; note?: string };

export const DEMO_VISITS: DemoVisit[] = [
  { client: C0012, time: "09:30", done: true, note: "지난 방문: 식사량 감소 관찰" },
  { client: C0081, time: "11:00", done: false, note: "지난 방문: 정서적 위축 관찰" },
  { client: C0095, time: "14:00", done: false },
];
