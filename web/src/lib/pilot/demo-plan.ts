import { editRatio } from "@/lib/records/edit-ratio";
import type { AgencyType } from "@/schemas/client";
import { formatRecordText, type RecordDraft, type SERVICE_TYPES } from "@/schemas/record-draft";
import type { SignalLevel, SignalType } from "@/schemas/signal";

// 파일럿 연습 데이터 계획(순수 함수). scripts/pilot-demo.mts가 DB에 넣고 지운다.
// 내용은 모두 지어낸 것이고 성명·주소·연락처는 없다.
// 실제 운영 전에 반드시 지운다 — 식별번호는 나중에 실제 어르신과 연결된다.

type ServiceType = (typeof SERVICE_TYPES)[number];
type FlagStatus = "unchecked" | "checked" | "acting" | "resolved";

export type DemoClient = { id: string; code: string; dong: string; ageBand: number | null; agencyIds: string[] };
export type DemoWorker = { id: string; agencyId: string; agencyType: AgencyType };
export type DemoFlag = { type: SignalType; level: SignalLevel; quote: string; status: FlagStatus; resolvedAt: string | null; outcome: "linked" | null };
export type DemoRecord = {
  clientId: string;
  workerId: string;
  agencyId: string;
  visitedAt: string;
  draft: RecordDraft;
  final: RecordDraft;
  editRatio: number;
  durationMs: number;
  flags: DemoFlag[];
  /** 첫 신호에 붙일 동 담당자 알림 문안 (주의 등급만) */
  alert: string | null;
};
export type DemoPlan = { records: DemoRecord[]; ageBands: { clientId: string; ageBand: number }[] };

const DAY = 24 * 60 * 60 * 1000;
const KST = 9 * 60 * 60 * 1000;
/** 기록을 배치하는 기간(일) */
export const DEMO_DAYS = 21;

function makeRng(seed: number) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    int: (min: number, max: number) => min + Math.floor(next() * (max - min + 1)),
    pick: <T>(items: readonly T[]): T => items[Math.floor(next() * items.length)],
    chance: (p: number) => next() < p,
    shuffle: <T>(items: readonly T[]): T[] => {
      const out = [...items];
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
  };
}
type Rng = ReturnType<typeof makeRng>;

/** 글(t)과 요약에 쓰는 짧은 말(s) */
type Item = { t: string; s: string };
const it = (t: string, s: string): Item => ({ t, s });

// ───────────────────────── 인물 유형 ─────────────────────────

type PersonaKey =
  | "hypertension"
  | "knee"
  | "cognitive"
  | "bereaved"
  | "couple"
  | "lung"
  | "active"
  | "dental"
  | "back"
  | "hearing";
type Persona = { ages: number[]; health: Item[]; medication: Item[]; meals?: Item[]; mood?: Item[]; living?: Item[] };

const PERSONAS: Record<PersonaKey, Persona> = {
  hypertension: {
    ages: [70, 80],
    health: [it("혈압 134/82로 안정적", "혈압 안정"), it("공복 혈당 128, 본인 측정 수첩 확인", "혈당 관리 양호"), it("발끝이 저리다고 하심", "발 저림 호소")],
    medication: [it("혈압약·당뇨약 아침저녁 정상 복용", "복약 양호"), it("약 달력에 맞춰 잘 드심", "복약 양호")],
  },
  knee: {
    ages: [80, 90],
    health: [it("오른쪽 무릎 통증 여전, 보행보조기 사용", "무릎 통증 지속"), it("날이 흐려 무릎이 더 쑤신다고 하심", "무릎 통증"), it("파스 붙이고 계심, 통증은 견딜 만하다고 하심", "통증 조절 중")],
    medication: [it("진통소염제 식후 복용 중", "복약 양호")],
    living: [it("거실 바닥 전선 정리, 이동 동선 확보", "이동 동선 정리")],
  },
  cognitive: {
    ages: [80, 90],
    health: [it("같은 질문을 두세 번 반복하심", "기억력 저하"), it("날짜와 요일은 정확히 말씀하심", "인지 상태 유지")],
    medication: [it("약통을 요일별로 정리해 드림, 오늘 분량 확인", "복약 확인"), it("아침 약 드신 것 확인", "복약 양호")],
    living: [it("가스레인지 사용 후 밸브 잠금 확인", "가스 안전 확인")],
  },
  bereaved: {
    ages: [70, 80],
    health: [it("잠을 깊이 못 주무신다고 하심", "수면 부족"), it("특별한 통증 호소 없음", "건강 양호")],
    medication: [it("수면제는 처방받아 필요할 때만 드심", "복약 확인")],
    mood: [it("먼저 떠난 배우자 이야기를 하며 눈시울을 붉히심", "그리움 표현"), it("대화하면서 조금씩 웃으심", "정서 회복 중")],
  },
  couple: {
    ages: [70, 80],
    health: [it("허리가 아프지만 배우자 돌봄을 계속하심", "허리 통증"), it("피곤하다는 말을 자주 하심", "피로 호소")],
    medication: [it("본인 혈압약과 배우자 약을 함께 챙기심", "복약 양호")],
    living: [it("배우자 돌봄 물품(기저귀·물티슈)이 떨어져 감", "돌봄 물품 부족")],
  },
  lung: {
    ages: [70, 80],
    health: [it("계단 오를 때 숨이 차다고 하심", "호흡 곤란"), it("기침이 조금 있으나 열은 없음", "가벼운 기침")],
    medication: [it("흡입기 아침저녁 사용 확인", "흡입기 사용")],
    living: [it("실내 환기 후 가습기 물 보충", "환기·가습")],
  },
  active: {
    ages: [60, 70],
    health: [it("특별한 불편 없다고 하심", "건강 양호"), it("매일 아침 공원을 산책하신다고 하심", "산책 지속")],
    medication: [it("고지혈증 약 하루 한 번 복용", "복약 양호")],
    mood: [it("경로당에서 친구들과 지내는 이야기를 즐겁게 하심", "사회활동 활발")],
  },
  dental: {
    ages: [80, 90],
    health: [it("틀니가 잘 맞지 않아 잇몸이 아프다고 하심", "틀니 불편"), it("치과 예약을 기다리는 중", "치과 대기")],
    medication: [it("복용하는 약 없음", "복약 없음")],
    meals: [it("부드러운 죽과 두부 위주로 드심", "연식 위주 식사"), it("반찬을 잘게 잘라 드림, 천천히 드심", "식사 보조")],
  },
  back: {
    ages: [70, 80],
    health: [it("허리 통증으로 오래 서 있기 힘들어하심", "허리 통증"), it("물리치료 받고 조금 나아졌다고 하심", "통증 호전")],
    medication: [it("근이완제와 진통제 복용 중", "복약 양호")],
  },
  hearing: {
    ages: [80, 90],
    health: [it("청력이 약해 크고 천천히 말씀드림", "청력 저하"), it("보청기 배터리 교체를 도와드림", "보청기 관리")],
    medication: [it("혈압약 아침 복용 확인", "복약 양호")],
    mood: [it("처음엔 경계하셨으나 곧 편하게 이야기하심", "정서 보통")],
  },
};

const MEALS = [
  it("세 끼 모두 드심", "식사 양호"),
  it("아침은 죽, 점심·저녁은 밥으로 잘 드심", "식사 양호"),
  it("지난번 전달한 반찬으로 식사하심", "식사 양호"),
  it("점심은 경로식당, 저녁은 직접 차려 드심", "식사 양호"),
  it("입맛은 보통, 한 끼에 반 공기 정도 드심", "식사 보통"),
];
const MOODS = [
  it("밝은 표정으로 대화에 잘 응하심", "정서 안정"),
  it("손주 이야기를 하시며 웃으심", "정서 안정"),
  it("옛날 이야기를 즐겁게 나누심", "정서 안정"),
  it("조금 무료해하시나 대화에는 잘 응하심", "정서 보통"),
];
const LIVING = [
  it("집 안 정돈 상태 양호", "주거 양호"),
  it("보일러 정상 작동, 실내 온도 적정", "난방 양호"),
  it("냉장고 안 유통기한 지난 음식을 함께 정리함", "냉장고 정리"),
  it("욕실 바닥 물기 없음, 미끄럼 방지 매트 사용 중", "욕실 안전"),
];

type Service = Item & { types: ServiceType[] };
const svc = (t: string, s: string, types: ServiceType[]): Service => ({ t, s, types });

const SERVICES: Record<AgencyType, Service[]> = {
  dong_center: [
    svc("안부 확인, 통합돌봄 서비스 욕구 상담", "욕구 상담", ["안전지원", "연계서비스"]),
    svc("안부 확인, 기초연금·에너지바우처 신청 안내", "복지 신청 안내", ["안전지원", "연계서비스"]),
    svc("주거환경 점검(문턱·조명·안전손잡이)", "주거환경 점검", ["안전지원"]),
    svc("방문 상담, 보건소 방문건강관리 연계 확인", "보건소 연계 확인", ["연계서비스"]),
  ],
  provider: [
    svc("안부 확인, 말벗", "안부 확인·말벗", ["안전지원", "사회참여"]),
    svc("청소 지원, 반찬 전달", "청소·반찬 전달", ["일상생활지원"]),
    svc("복약 확인, 혈압 측정, 말벗", "복약 확인", ["안전지원", "생활교육"]),
    svc("장보기 동행, 생필품 구입 도움", "장보기 동행", ["일상생활지원"]),
    svc("내과 정기 진료 동행", "병원 동행", ["일상생활지원"]),
  ],
  welfare_center: [
    svc("경로식당 도시락 전달, 안부 확인", "도시락 전달", ["연계서비스", "안전지원"]),
    svc("노래교실 프로그램 참여 동행", "프로그램 참여", ["사회참여"]),
    svc("정서지원 상담, 말벗 자원봉사자 연계", "정서지원 상담", ["사회참여", "연계서비스"]),
    svc("건강체조 교실 안내, 낙상 예방 생활교육", "생활교육", ["생활교육", "사회참여"]),
  ],
};

const FOLLOW_UPS: Record<AgencyType, string[]> = {
  dong_center: ["다음 달 정기 방문 때 서비스 만족도 확인", "에너지바우처 신청 결과 안내", "방문건강관리 간호사 방문 일정 확인"],
  provider: ["다음 주 같은 요일 방문", "다음 방문 때 반찬 추가 전달", "다음 진료 예약일 동행 일정 확인"],
  welfare_center: ["다음 주 프로그램 참여 여부 전화 확인", "도시락 배달 요일 조정 확인", "자원봉사자 말벗 방문 일정 안내"],
};
const EDIT_NOTES = ["보호자와 통화해 근황 공유함", "이웃 주민이 자주 들여다본다고 하심", "다음 방문 때 사진 자료로 안내 예정"];

// ───────────────────────── 신호 장면 ─────────────────────────

type Fields = Partial<Omit<RecordDraft, "summary" | "service_types">>;
type Episode = {
  daysAgo: number;
  /** 대상자와 연결된 기관 중 이 순서로 고른다 */
  prefer: AgencyType[];
  /** 앞 장면과 다른 기관이 쓴다 (두 기관이 함께 관찰) */
  otherAgency?: boolean;
  summary: string;
  fields: Fields;
  flags?: { type: SignalType; level: SignalLevel; quote: string }[];
};
type Scenario = {
  persona: PersonaKey;
  status: FlagStatus;
  resolved?: { daysAgo: number; linked: boolean };
  /** 주의 신호 알림 문안 ({dong}, {code}를 바꿔 넣는다) */
  alert?: string;
  episodes: Episode[];
};

const SCENARIOS: Scenario[] = [
  {
    persona: "cognitive",
    status: "unchecked",
    alert: "{dong} 통합돌봄 담당자님, {code} 어르신께서 혈압약을 사흘째 드시지 않았고 어지럼증을 호소하셔서 확인이 필요해 공유드립니다. 보호자 연락과 복약 지원 연계를 검토해 주세요.",
    episodes: [
      {
        daysAgo: 4,
        prefer: ["provider", "welfare_center"],
        summary: "아침 약 미복용 확인",
        fields: { medication: "아침 약이 약통에 그대로 남아 있음, 드셨는지 모르겠다고 하심", follow_up: "다음 방문 때 약통 다시 확인" },
        flags: [{ type: "missed_medication", level: "observe", quote: "아침 약을 드셨는지 모르겠다고 하셨어요" }],
      },
      {
        daysAgo: 1,
        prefer: ["provider", "welfare_center"],
        summary: "혈압약 사흘째 미복용, 어지럼증",
        fields: { medication: "혈압약을 사흘째 드시지 않음, 약 봉투가 그대로 있음", health: "어지럽다고 하심, 혈압 162/98", follow_up: "보호자 연락, 복약 알림 서비스 연계 검토" },
        flags: [{ type: "missed_medication", level: "caution", quote: "혈압약을 사흘째 안 드셨다고 하셨어요" }],
      },
    ],
  },
  {
    persona: "knee",
    status: "unchecked",
    alert: "{dong} 통합돌봄 담당자님, {code} 어르신께서 어젯밤 화장실에서 넘어지셨고 최근 식사량도 줄어 확인이 필요해 공유드립니다. 진료 동행과 욕실 안전손잡이 설치 연계를 검토해 주세요.",
    episodes: [
      {
        daysAgo: 5,
        prefer: ["welfare_center", "provider"],
        summary: "점심 식사량 감소",
        fields: { meals: "입맛이 없다며 점심을 반 공기만 드심", mood: "기운이 없어 보이심" },
        flags: [{ type: "reduced_meal", level: "observe", quote: "입맛이 없어서 점심을 반 공기만 드셨어요" }],
      },
      {
        daysAgo: 2,
        prefer: ["provider", "welfare_center"],
        otherAgency: true,
        summary: "야간 화장실 낙상, 식사량 감소 지속",
        fields: {
          health: "오른쪽 팔꿈치에 멍, 무릎 통증이 심해짐",
          meals: "요즘 하루 한 끼 정도만 드심",
          notes: "어젯밤 화장실에 가다 미끄러져 넘어지심",
          follow_up: "정형외과 진료 동행, 욕실 안전손잡이 설치 연계",
        },
        flags: [
          { type: "fall", level: "caution", quote: "어젯밤에 화장실 가다가 미끄러져 넘어지셨대요" },
          { type: "reduced_meal", level: "observe", quote: "요즘은 하루 한 끼 정도만 드신대요" },
        ],
      },
    ],
  },
  {
    persona: "bereaved",
    status: "checked",
    episodes: [
      {
        daysAgo: 6,
        prefer: ["welfare_center", "dong_center"],
        summary: "프로그램 참여 거부, 말수 줄어듦",
        fields: { mood: "노래교실에 더는 안 나오시겠다고 하심, 말수가 눈에 띄게 줄어드심" },
        flags: [{ type: "emotional_withdrawal", level: "observe", quote: "이제 사람 만나는 게 귀찮아서 노래교실도 안 나가신대요" }],
      },
      {
        daysAgo: 2,
        prefer: ["provider", "dong_center"],
        otherAgency: true,
        summary: "종일 누워 지내심",
        fields: { mood: "하루 종일 텔레비전만 켜 두고 누워 계신다고 하심", meals: "끼니를 대충 때우신다고 하심", follow_up: "정신건강복지센터 상담 연계 검토" },
        flags: [{ type: "emotional_withdrawal", level: "observe", quote: "하루 종일 누워만 계신다고 하셨어요" }],
      },
    ],
  },
  {
    persona: "dental",
    status: "acting",
    episodes: [
      {
        daysAgo: 8,
        prefer: ["provider", "welfare_center"],
        summary: "틀니 불편으로 식사 어려움",
        fields: { health: "틀니가 맞지 않아 잇몸이 헐어 있음", meals: "밥을 거의 못 드시고 죽만 조금 드심" },
        flags: [{ type: "reduced_meal", level: "observe", quote: "틀니 때문에 밥을 거의 못 드신대요" }],
      },
      {
        daysAgo: 3,
        prefer: ["welfare_center", "dong_center"],
        otherAgency: true,
        summary: "죽 반 그릇 섭취, 치과 연계 진행 중",
        fields: { meals: "도시락 죽을 반 그릇만 드심", follow_up: "치과 진료 일정 확인, 영양 보충 음료 지원 연계 중" },
        flags: [{ type: "reduced_meal", level: "observe", quote: "죽도 반 그릇만 드셨어요" }],
      },
    ],
  },
  {
    persona: "hearing",
    status: "unchecked",
    alert: "{dong} 통합돌봄 담당자님, {code} 어르신께서 두 번 연속 방문을 받지 않으셔서 안전 확인이 필요해 공유드립니다. 함께 재방문하거나 보호자 연락을 검토해 주세요.",
    episodes: [
      {
        daysAgo: 6,
        prefer: ["provider", "welfare_center"],
        summary: "초인종 응답 없어 전화로 안부 확인",
        fields: { notes: "초인종에 응답이 없어 전화로 안부 확인, 목소리는 평소와 같음" },
        flags: [{ type: "visit_refusal", level: "observe", quote: "초인종을 눌러도 문을 열어 주지 않으셨어요" }],
      },
      {
        daysAgo: 1,
        prefer: ["provider", "welfare_center"],
        summary: "방문 거부 2회째",
        fields: { notes: "문 너머로 오지 말라고 하셔서 두 번째로 뵙지 못함", follow_up: "동 담당자와 함께 재방문, 보호자 연락" },
        flags: [{ type: "visit_refusal", level: "caution", quote: "문 너머로 오늘은 오지 말라고 하셔서 또 못 뵈었어요" }],
      },
    ],
  },
  {
    persona: "back",
    status: "unchecked",
    episodes: [
      {
        daysAgo: 0,
        prefer: ["provider", "welfare_center"],
        summary: "일어서실 때 휘청거림",
        fields: {
          health: "허리 통증으로 다리에 힘이 빠진다고 하심",
          notes: "의자에서 일어서실 때 한 번 휘청하심, 다친 곳 없음",
          follow_up: "지팡이 사용 권유, 낙상 예방 교육",
        },
        flags: [{ type: "fall", level: "observe", quote: "의자에서 일어서실 때 다리에 힘이 빠져 휘청하셨어요" }],
      },
    ],
  },
  {
    persona: "hypertension",
    status: "checked",
    episodes: [
      {
        daysAgo: 4,
        prefer: ["dong_center", "provider"],
        summary: "저녁 당뇨약을 가끔 잊으심",
        fields: { medication: "저녁 당뇨약을 일주일에 두세 번 잊으신다고 하심", follow_up: "요일별 약 달력 설치" },
        flags: [{ type: "missed_medication", level: "observe", quote: "저녁 당뇨약을 가끔 잊으신대요" }],
      },
    ],
  },
  {
    persona: "couple",
    status: "resolved",
    resolved: { daysAgo: 9, linked: true },
    episodes: [
      {
        daysAgo: 14,
        prefer: ["dong_center", "provider"],
        summary: "배우자 돌봄으로 끼니 거름",
        fields: { meals: "배우자를 돌보느라 하루 한두 끼만 드심", mood: "많이 지쳐 보이심", follow_up: "반찬 지원 연계" },
        flags: [{ type: "reduced_meal", level: "observe", quote: "배우자 돌보느라 끼니를 자주 거르신대요" }],
      },
      {
        daysAgo: 5,
        prefer: ["provider", "welfare_center"],
        summary: "반찬 지원 후 식사 회복",
        fields: { meals: "반찬 지원을 받은 뒤로 끼니를 잘 챙기심" },
      },
    ],
  },
  {
    persona: "hypertension",
    status: "resolved",
    resolved: { daysAgo: 10, linked: true },
    episodes: [
      {
        daysAgo: 16,
        prefer: ["provider", "welfare_center"],
        summary: "현관 문턱에 걸려 넘어질 뻔함",
        fields: { living: "현관 문턱이 높고 조명이 어두움", notes: "현관 문턱에 걸려 넘어질 뻔하심, 다친 곳 없음", follow_up: "주거환경 개선(문턱 경사로) 연계" },
        flags: [{ type: "fall", level: "observe", quote: "현관 문턱에 걸려서 넘어질 뻔하셨어요" }],
      },
      {
        daysAgo: 7,
        prefer: ["dong_center"],
        summary: "현관 경사로 설치 확인",
        fields: { living: "현관 경사로와 센서등 설치 완료, 드나들기 편해졌다고 하심" },
      },
    ],
  },
  {
    persona: "lung",
    status: "resolved",
    resolved: { daysAgo: 8, linked: false },
    episodes: [
      {
        daysAgo: 15,
        prefer: ["welfare_center", "provider"],
        summary: "기운 없고 의욕 저하",
        fields: { mood: "요즘 기운이 없고 아무것도 하기 싫다고 하심" },
        flags: [{ type: "emotional_withdrawal", level: "observe", quote: "요즘 기운이 없고 아무것도 하기 싫다고 하셨어요" }],
      },
      {
        daysAgo: 6,
        prefer: ["welfare_center", "provider"],
        summary: "정서 회복, 프로그램 다시 참여",
        fields: { mood: "손주가 다녀간 뒤로 기분이 많이 좋아지심, 건강체조 교실에 다시 나오심" },
      },
    ],
  },
  {
    persona: "cognitive",
    status: "resolved",
    resolved: { daysAgo: 7, linked: true },
    episodes: [
      {
        daysAgo: 13,
        prefer: ["provider", "welfare_center"],
        summary: "약 복용 여부를 기억 못 하심",
        fields: { medication: "약을 드셨는지 기억 못 하심, 약통 정리 상태가 불규칙함" },
        flags: [{ type: "missed_medication", level: "observe", quote: "약을 드셨는지 기억이 안 난다고 하셨어요" }],
      },
      {
        daysAgo: 3,
        prefer: ["provider", "dong_center"],
        summary: "복약 알림 기기 사용 후 복약 양호",
        fields: { medication: "복약 알림 기기를 쓰신 뒤로 빠짐없이 드심" },
      },
    ],
  },
];

// ───────────────────────── 계획 만들기 ─────────────────────────

/** 서울 기준 n일 전 hour:minute. 아직 오지 않은 시각이면 지금보다 조금 전으로 */
function visitAt(now: Date, daysAgo: number, hour: number, minute: number): string {
  const seoul = new Date(now.getTime() + KST - daysAgo * DAY);
  seoul.setUTCHours(hour, minute, 0, 0);
  return new Date(Math.min(seoul.getTime() - KST, now.getTime() - (10 + minute) * 60 * 1000)).toISOString();
}

const EMPTY: Omit<RecordDraft, "summary" | "service_types" | "services_provided"> = {
  health: "",
  medication: "",
  meals: "",
  mood: "",
  living: "",
  notes: "",
  follow_up: "",
};

/** 평소 방문 기록: 기관 종류에 맞는 서비스 + 인물 유형에 맞는 상태 몇 가지 */
function routineDraft(rng: Rng, persona: Persona, type: AgencyType): RecordDraft {
  const service = rng.pick(SERVICES[type]);
  const health = rng.chance(0.7) ? rng.pick(persona.health) : null;
  const medication = rng.chance(type === "provider" ? 0.7 : 0.4) ? rng.pick(persona.medication) : null;
  const meals = rng.chance(0.6) ? rng.pick(persona.meals ?? MEALS) : null;
  const mood = rng.chance(0.6) ? rng.pick([...(persona.mood ?? []), ...MOODS]) : null;
  const living = rng.chance(0.4) ? rng.pick([...(persona.living ?? []), ...LIVING]) : null;
  const notable = [health, meals, mood].filter((x): x is Item => x !== null);
  return {
    summary: notable.length > 0 ? `${service.s}, ${rng.pick(notable).s}` : service.s,
    service_types: service.types,
    services_provided: service.t,
    ...EMPTY,
    health: health?.t ?? "",
    medication: medication?.t ?? "",
    meals: meals?.t ?? "",
    mood: mood?.t ?? "",
    living: living?.t ?? "",
    follow_up: rng.chance(0.3) ? rng.pick(FOLLOW_UPS[type]) : "",
  };
}

/** 신호 장면 기록: 안부 확인 방문에 장면에 적힌 항목만 쓴다(평소 상태와 섞여 앞뒤가 맞지 않게 되지 않도록) */
function episodeDraft(ep: Episode, type: AgencyType): RecordDraft {
  const service = SERVICES[type][0];
  return { summary: ep.summary, service_types: service.types, services_provided: service.t, ...EMPTY, ...ep.fields };
}

/** 일부 기록은 현장 인력이 초안을 조금 고친 것으로 둔다 */
function finalOf(rng: Rng, draft: RecordDraft, type: AgencyType): RecordDraft {
  if (!rng.chance(0.3)) return draft;
  return draft.follow_up ? { ...draft, notes: [draft.notes, rng.pick(EDIT_NOTES)].filter(Boolean).join(", ") } : { ...draft, follow_up: rng.pick(FOLLOW_UPS[type]) };
}

function chooseType(prefer: AgencyType[], available: AgencyType[], avoid: AgencyType | null): AgencyType {
  const ok = (t: AgencyType) => available.includes(t) && t !== avoid;
  return prefer.find(ok) ?? available.find(ok) ?? available[0];
}

/**
 * 대상자마다 기록 3~7건을 최근 3주에 배치한다. 같은 seed면 같은 결과.
 * 작성자는 대상자와 연결된 기관의 현장 인력이다(해소 처리자는 넣는 스크립트가 정한다).
 */
export function planPilotDemo(input: { clients: DemoClient[]; workers: DemoWorker[]; now: Date; seed: number }): DemoPlan {
  const rng = makeRng(input.seed);
  const typeOf = new Map(input.workers.map((w) => [w.agencyId, w.agencyType]));
  const clients = rng.shuffle(input.clients.filter((c) => c.agencyIds.some((a) => typeOf.has(a))));
  const routinePersonas = rng.shuffle(Object.keys(PERSONAS) as PersonaKey[]);
  const records: DemoRecord[] = [];
  const ageBands: DemoPlan["ageBands"] = [];

  clients.forEach((client, index) => {
    const scenario = index < SCENARIOS.length ? SCENARIOS[index] : null;
    const persona = PERSONAS[scenario?.persona ?? routinePersonas[index % routinePersonas.length]];
    if (client.ageBand === null) ageBands.push({ clientId: client.id, ageBand: rng.pick(persona.ages) });

    // 기관 종류별 담당자 1명(가끔 같은 기관 동료가 대신 방문)
    const linked = client.agencyIds.filter((a) => typeOf.has(a));
    const agencyByType = new Map(linked.map((a) => [typeOf.get(a) as AgencyType, a]));
    const types = [...agencyByType.keys()];
    const primary = new Map(types.map((t) => [t, rng.pick(input.workers.filter((w) => w.agencyId === agencyByType.get(t)))]));
    const author = (t: AgencyType) => {
      const pool = input.workers.filter((w) => w.agencyId === agencyByType.get(t));
      return rng.chance(0.2) ? rng.pick(pool) : (primary.get(t) as DemoWorker);
    };
    const push = (daysAgo: number, type: AgencyType, draft: RecordDraft, flags: DemoFlag[], alert: string | null) => {
      const w = author(type);
      const final = finalOf(rng, draft, type);
      records.push({
        clientId: client.id,
        workerId: w.id,
        agencyId: w.agencyId,
        visitedAt: visitAt(input.now, daysAgo, rng.int(9, 17), rng.int(0, 59)),
        draft,
        final,
        editRatio: editRatio(formatRecordText(draft), formatRecordText(final)),
        durationMs: rng.int(60, 240) * 1000,
        flags,
        alert,
      });
    };

    // 신호 장면
    const busy: number[] = [];
    const used = new Set<AgencyType>();
    let prev: AgencyType | null = null;
    for (const ep of scenario?.episodes ?? []) {
      const type = chooseType(ep.prefer, types, ep.otherAgency ? prev : null);
      prev = type;
      used.add(type);
      busy.push(ep.daysAgo);
      const flags: DemoFlag[] = (ep.flags ?? []).map((f) => ({
        ...f,
        status: scenario?.status ?? "unchecked",
        resolvedAt: scenario?.resolved ? visitAt(input.now, scenario.resolved.daysAgo, 15, 0) : null,
        outcome: scenario?.resolved?.linked ? "linked" : null,
      }));
      const caution = flags.some((f) => f.level === "caution");
      const alert = caution && scenario?.alert ? scenario.alert.replace("{dong}", client.dong).replace("{code}", client.code) : null;
      push(ep.daysAgo, type, episodeDraft(ep, type), flags, alert);
    }

    // 평소 방문: 생활지원(수행기관)이 가장 잦고, 동 센터는 가끔. 연결된 기관이 둘 이상이면 둘 이상이 쓰게 한다.
    const plan: AgencyType[] = [];
    for (const t of types) {
      const n = t === "provider" ? rng.int(1, 3) : t === "welfare_center" ? rng.int(1, 2) : rng.chance(0.7) ? 1 : 0;
      for (let i = 0; i < n; i++) plan.push(t);
    }
    for (const t of plan) used.add(t);
    if (used.size < Math.min(2, types.length)) {
      const missing = types.find((t) => !used.has(t)) as AgencyType;
      plan.push(missing);
      used.add(missing);
    }
    // 기관마다 한 번은 남기고, 나머지 반복 방문만 잘라 7건을 넘지 않게 한다
    const firsts = [...new Set(plan)];
    const repeats = plan.slice();
    for (const t of firsts) repeats.splice(repeats.indexOf(t), 1);
    const routine = [...firsts, ...rng.shuffle(repeats)].slice(0, 7 - busy.length);
    while (busy.length + routine.length < 3) routine.push(rng.pick(types));
    // 평소 방문 날짜: 신호 이야기 사이에 끼어 "식사 양호" 같은 말이 앞뒤를 흐리지 않게 한다.
    // 해소 안 된 이야기는 첫 신호 전에만, 해소된 이야기는 이야기 기간 밖에만 둔다.
    const epDays = (scenario?.episodes ?? []).map((e) => e.daysAgo);
    const [first, last] = epDays.length > 0 ? [Math.max(...epDays), Math.min(...epDays)] : [-1, -1];
    const allowed = (day: number) =>
      !busy.some((d) => Math.abs(d - day) <= 1) &&
      (epDays.length === 0 || (scenario?.status === "resolved" ? day > first + 1 || day < last - 1 : day > first + 1));
    for (const type of routine) {
      let day = rng.int(0, DEMO_DAYS - 1);
      for (let tries = 0; tries < 50 && !allowed(day); tries++) day = rng.int(0, DEMO_DAYS - 1);
      busy.push(day);
      push(day, type, routineDraft(rng, persona, type), [], null);
    }
  });

  records.sort((a, b) => a.visitedAt.localeCompare(b.visitedAt));
  return { records, ageBands };
}
