// 중간발표용 시연 데이터: 시험 대상자에게 여러 날짜의 방문 기록·이상징후를 넣는다.
// 다시 실행하면 이전 시연 데이터(stt_engine='seed-demo')를 지우고 새로 넣는다. 실행: npm run seed:demo
import { createClient } from "@supabase/supabase-js";

function need(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 환경변수가 없습니다 (.env.local 확인)`);
  return value;
}

const admin = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const MARK = "seed-demo";
const DAY = 24 * 60 * 60 * 1000;
const KST = 9 * 60 * 60 * 1000;
/** 서울 기준 n일 전 hour시. 미래 시각이면(새벽에 '오늘 9시' 등) 지금보다 10분 전으로 */
const ago = (days: number, hour = 10) => {
  const seoul = new Date(Date.now() + KST - days * DAY);
  seoul.setUTCHours(hour, 0, 0, 0);
  const at = Math.min(seoul.getTime() - KST, Date.now() - 10 * 60 * 1000);
  return new Date(at).toISOString();
};

async function rows<T>(label: string, p: PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await p;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data ?? [];
}

// 이전 시연 데이터 삭제 (플래그·알림 문안은 FK cascade로 함께 지워짐)
const { error: delError } = await admin.from("visit_records").delete().eq("stt_engine", MARK);
if (delError) throw new Error(`삭제: ${delError.message}`);

const users = (await admin.auth.admin.listUsers({ perPage: 1000 })).data.users;
const workerId = (envName: string) => {
  const user = users.find((u) => u.email === need(envName));
  if (!user) throw new Error(`${envName} 계정이 없습니다 — 먼저 npm run seed`);
  return user.id;
};
const workers = await rows("직원", admin.from("workers").select("id, agency_id"));
const agencyOf = (id: string) => workers.find((w) => w.id === id)!.agency_id as string;
const clients = await rows("대상자", admin.from("clients").select("id, code"));
const clientId = (code: string) => clients.find((c) => c.code === code)!.id as string;

const WA = workerId("TEST_WORKER_A_EMAIL");
const WB = workerId("TEST_WORKER_B_EMAIL");
const MA = workerId("TEST_MANAGER_A_EMAIL");

type Flag = {
  type: string;
  level: "observe" | "caution";
  quote: string;
  resolved?: { daysAgo: number; linked: boolean };
};
type Visit = { code: string; worker: string; daysAgo: number; hour?: number; summary: string; flags?: Flag[]; alert?: string };

const visits: Visit[] = [
  // C-0012: 두 기관이 함께 돌봄 — 여러 신호가 겹치는 사례
  { code: "C-0012", worker: WA, daysAgo: 9, summary: "식사·복약 양호, 산책 동행" },
  { code: "C-0012", worker: WB, daysAgo: 6, summary: "점심 절반 섭취", flags: [{ type: "reduced_meal", level: "observe", quote: "점심을 절반만 드셨어요" }] },
  {
    code: "C-0012",
    worker: WA,
    daysAgo: 2,
    summary: "혈압약 2일째 미복용",
    flags: [{ type: "missed_medication", level: "caution", quote: "혈압약을 이틀째 안 드셨다고 하셨어요" }],
  },
  {
    code: "C-0012",
    worker: WA,
    daysAgo: 0,
    hour: 9,
    summary: "화장실 문턱에서 휘청거림",
    flags: [{ type: "fall", level: "observe", quote: "화장실 문턱에서 한 번 휘청하셨어요" }],
    alert:
      "화정1동 통합돌봄 담당자님, C-0012 어르신께서 혈압약을 이틀째 드시지 않았고 오늘 화장실 문턱에서 휘청하신 일이 있어 확인이 필요해 공유드립니다. 복약 확인과 주거 안전 점검 연계를 검토해 주세요.",
  },
  // C-0047: A 기관 — 방문 거부(주의), 지난주 식사량 감소는 연계 후 해소
  {
    code: "C-0047",
    worker: WA,
    daysAgo: 8,
    summary: "식사량 감소",
    flags: [{ type: "reduced_meal", level: "observe", quote: "하루 한 끼만 드신다고 하셨어요", resolved: { daysAgo: 5, linked: true } }],
  },
  { code: "C-0047", worker: WA, daysAgo: 4, summary: "말벗, 청소 지원" },
  {
    code: "C-0047",
    worker: WA,
    daysAgo: 3,
    summary: "방문 거부 3회째",
    flags: [{ type: "visit_refusal", level: "caution", quote: "오늘도 문을 열어 주지 않으셔서 세 번째로 못 뵈었어요" }],
    alert:
      "화정2동 통합돌봄 담당자님, C-0047 어르신께서 세 번째로 방문을 받지 않으셔서 안전 확인이 필요해 공유드립니다. 동 방문이나 보호자 연락을 검토해 주세요.",
  },
  { code: "C-0047", worker: WA, daysAgo: 1, summary: "전화 안부 확인" },
  // C-0063: B 기관만 — 정서적 위축 관찰
  {
    code: "C-0063",
    worker: WB,
    daysAgo: 5,
    summary: "정서 위축",
    flags: [{ type: "emotional_withdrawal", level: "observe", quote: "요즘 아무것도 하기 싫다고 하시고 누워만 계세요" }],
  },
];

const record = (summary: string) => ({
  summary,
  service_types: ["안전지원"],
  health: "",
  medication: "",
  meals: "",
  mood: "",
  living: "",
  services_provided: "안부 확인",
  notes: "",
  follow_up: "",
});

let flagCount = 0;
for (const v of visits) {
  const at = ago(v.daysAgo, v.hour);
  const [rec] = await rows(
    "기록",
    admin
      .from("visit_records")
      .insert({
        client_id: clientId(v.code),
        worker_id: v.worker,
        agency_id: agencyOf(v.worker),
        visited_at: at,
        created_at: at,
        transcript_text: null,
        draft_json: record(v.summary),
        final_json: record(v.summary),
        edited: false,
        edit_ratio: 0,
        input_mode: "voice",
        stt_engine: MARK,
        duration_ms: 90_000,
      })
      .select("id"),
  );
  if (!v.flags) continue;
  const flags = await rows(
    "신호",
    admin
      .from("flags")
      .insert(
        v.flags.map((f) => ({
          record_id: rec.id,
          client_id: clientId(v.code),
          type: f.type,
          level: f.level,
          evidence_quote: f.quote,
          status: f.resolved ? "resolved" : "unchecked",
          first_seen_at: at,
          created_at: at,
          resolved_by: f.resolved ? MA : null,
          resolved_at: f.resolved ? ago(f.resolved.daysAgo, 15) : null,
          outcome: f.resolved?.linked ? "linked" : null,
        })),
      )
      .select("id"),
  );
  flagCount += flags.length;
  if (v.alert) await rows("알림 문안", admin.from("alert_drafts").insert({ flag_id: flags[0].id, target: "dong_manager", body: v.alert, created_at: at }).select("id"));
}

console.log(`✓ 시연 기록 ${visits.length}건, 신호 ${flagCount}건 (이전 시연 데이터는 지우고 다시 넣음)`);
