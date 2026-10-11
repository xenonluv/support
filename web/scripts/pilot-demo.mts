// 파일럿 연습 데이터: 파일럿 대상자에게 지어낸 방문 기록·신호를 넣거나(기본) 지운다(--clear).
// 실행: npm run pilot:demo [-- --seed=숫자]  /  npm run pilot:demo -- --clear
// - 실제 운영(종이 대응표에 실제 어르신을 적는 날) 전에 반드시 --clear로 지운다. 번호가 실제 어르신과 연결되면
//   지어낸 '낙상·약 미복용'을 실제 상태로 오해할 수 있다.
// - 연습 기록은 stt_engine='pilot-demo'로 표시하고, 성과지표는 이 기록을 뺀다.
// - 다시 실행하면 이전 연습 데이터를 지우고 새로 넣는다.
import { randomInt, randomUUID } from "node:crypto";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { planPilotDemo, type DemoClient, type DemoWorker } from "@/lib/pilot/demo-plan";
import type { Database } from "@/lib/supabase/types";
import type { AgencyType } from "@/schemas/client";

function need(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 환경변수가 없습니다 (.env.local 확인)`);
  return value;
}

const MARK = "pilot-demo";
/** 채운 시각·대상자·연령대 기록 (git 제외 폴더). --clear가 이것을 보고 되돌린다 */
const STATE_FILE = "pilot/pilot-demo-state.json";
type State = { filledAt: string; seed: number; clientIds: string[]; ageBands: { clientId: string; ageBand: number }[] };

const args = process.argv.slice(2);
const clearOnly = args.includes("--clear");
const seedArg = args.find((a) => a.startsWith("--seed="));
const seed = seedArg ? Number(seedArg.slice("--seed=".length)) : randomInt(1, 2 ** 31);
if (!Number.isInteger(seed)) throw new Error("--seed는 정수로 주세요");

const admin = createClient<Database>(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function rows<T>(label: string, p: PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await p;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data ?? [];
}
async function run(label: string, p: PromiseLike<{ error: { message: string } | null; count?: number | null }>): Promise<number> {
  const { error, count } = await p;
  if (error) throw new Error(`${label}: ${error.message}`);
  return count ?? 0;
}

/** 이전 연습 데이터 지우기: 기록(신호·알림 문안은 함께 지워짐), 채운 뒤 만든 브리핑, 채운 연령대(그대로일 때만) */
async function clear(): Promise<void> {
  const records = await run("연습 기록 삭제", admin.from("visit_records").delete({ count: "exact" }).eq("stt_engine", MARK));
  let briefings = 0;
  let ages = 0;
  if (existsSync(STATE_FILE)) {
    const state = JSON.parse(readFileSync(STATE_FILE, "utf8")) as State;
    if (state.clientIds.length > 0) {
      briefings = await run(
        "연습 브리핑 삭제",
        admin.from("briefings").delete({ count: "exact" }).in("client_id", state.clientIds).gte("created_at", state.filledAt),
      );
    }
    for (const a of state.ageBands) {
      ages += await run(
        "연령대 되돌리기",
        admin.from("clients").update({ age_band: null }, { count: "exact" }).eq("id", a.clientId).eq("age_band", a.ageBand),
      );
    }
    unlinkSync(STATE_FILE);
  }
  console.log(`✓ 연습 데이터 삭제: 기록 ${records}건(신호·알림 문안 포함), 브리핑 ${briefings}건, 연령대 되돌림 ${ages}명`);
}

await clear();
if (clearOnly) process.exit(0);

// 대상: 파일럿 현장 인력의 기관과 연결된, 종결 안 된 대상자
const pilots = await rows("파일럿 참여자", admin.from("workers").select("id, role, agency_id, agencies(type)").eq("pilot", true));
const workers: DemoWorker[] = pilots
  .filter((w) => w.role === "worker" && w.agencies)
  .map((w) => ({ id: w.id, agencyId: w.agency_id, agencyType: w.agencies?.type as AgencyType }));
if (workers.length === 0) throw new Error("파일럿 현장 인력이 없습니다 — 먼저 npm run pilot:accounts");
// 해소 처리는 동 담당자(파일럿 관리자) 이름으로 둔다
const managerId = pilots.find((w) => w.role === "manager" && w.agencies?.type === "dong_center")?.id ?? null;

const pilotAgencies = [...new Set(workers.map((w) => w.agencyId))];
const targetIds = [...new Set((await rows("연결", admin.from("client_agencies").select("client_id, agency_id").in("agency_id", pilotAgencies))).map((l) => l.client_id))];
const clientRows = await rows("대상자", admin.from("clients").select("id, code, dong, age_band, closed_at").in("id", targetIds).is("closed_at", null));
const links = await rows("대상자 연결", admin.from("client_agencies").select("client_id, agency_id").in("client_id", clientRows.map((c) => c.id)));
const clients: DemoClient[] = clientRows.map((c) => ({
  id: c.id,
  code: c.code,
  dong: c.dong,
  ageBand: c.age_band,
  agencyIds: links.filter((l) => l.client_id === c.id).map((l) => l.agency_id),
}));

// 같은 seed면 같은 결과가 나오게 순서를 고정한다 (DB가 돌려주는 순서는 일정하지 않다)
clients.sort((a, b) => a.code.localeCompare(b.code));
workers.sort((a, b) => a.id.localeCompare(b.id));
for (const c of clients) c.agencyIds.sort();
const now = new Date();
const plan = planPilotDemo({ clients, workers, now, seed });

// id를 미리 만들어 기록 → 신호 → 알림 문안을 한 번씩에 넣는다
const recordRows = [];
const flagRows = [];
const alertRows = [];
for (const r of plan.records) {
  const recordId = randomUUID();
  recordRows.push({
    id: recordId,
    client_id: r.clientId,
    worker_id: r.workerId,
    agency_id: r.agencyId,
    visited_at: r.visitedAt,
    created_at: r.visitedAt,
    transcript_text: null,
    draft_json: r.draft,
    final_json: r.final,
    edited: r.editRatio > 0,
    edit_ratio: r.editRatio,
    input_mode: "voice",
    stt_engine: MARK,
    duration_ms: r.durationMs,
  });
  let alertFlag: string | null = null;
  for (const f of r.flags) {
    const flagId = randomUUID();
    if (f.level === "caution" && !alertFlag) alertFlag = flagId;
    flagRows.push({
      id: flagId,
      record_id: recordId,
      client_id: r.clientId,
      type: f.type,
      level: f.level,
      evidence_quote: f.quote,
      status: f.status,
      first_seen_at: r.visitedAt,
      created_at: r.visitedAt,
      resolved_by: f.status === "resolved" ? managerId : null,
      resolved_at: f.resolvedAt,
      outcome: f.outcome,
    });
  }
  if (r.alert && alertFlag) alertRows.push({ flag_id: alertFlag, target: "dong_manager", body: r.alert, created_at: r.visitedAt });
}

// 넣는 도중 실패하면 지금까지 넣은 연습 데이터를 지우고 멈춘다(반쯤 들어간 상태를 남기지 않게)
const state: State = { filledAt: now.toISOString(), seed, clientIds: clients.map((c) => c.id), ageBands: [] };
writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
try {
  await run("기록", admin.from("visit_records").insert(recordRows));
  if (flagRows.length > 0) await run("신호", admin.from("flags").insert(flagRows));
  if (alertRows.length > 0) await run("알림 문안", admin.from("alert_drafts").insert(alertRows));
  for (const a of plan.ageBands) {
    const n = await run("연령대", admin.from("clients").update({ age_band: a.ageBand }, { count: "exact" }).eq("id", a.clientId).is("age_band", null));
    if (n > 0) state.ageBands.push(a);
  }
} catch (error) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  console.error(`✗ 넣는 중 실패 — 넣은 것을 지웁니다: ${(error as Error).message}`);
  await clear();
  process.exit(1);
}
writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

const openClients = new Set(plan.records.filter((r) => r.flags.some((f) => f.status !== "resolved")).map((r) => r.clientId)).size;
console.log(
  `✓ 연습 데이터: 대상자 ${clients.length}명, 기록 ${recordRows.length}건, 신호 ${flagRows.length}건(해소 안 된 신호 대상자 ${openClients}명), ` +
    `알림 문안 ${alertRows.length}건, 연령대 채움 ${state.ageBands.length}명 (seed ${seed})`,
);
console.log("  실제 운영 전에 반드시 지우세요: npm run pilot:demo -- --clear");
