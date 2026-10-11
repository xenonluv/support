// RLS 검증: 실제 Supabase 프로젝트에 시험 계정으로 로그인해 무엇이 보이는지 확인한다.
// 실행: npm run test:rls (네트워크가 필요해 npm test와 분리)
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function need(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 환경변수가 없습니다 (.env.local 확인)`);
  return value;
}

const url = need("NEXT_PUBLIC_SUPABASE_URL");
const publishableKey = need("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
const secretKey = need("SUPABASE_SECRET_KEY");
const noSession = { auth: { persistSession: false, autoRefreshToken: false } };

let failures = 0;
function check(label: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✓" : "✗"} ${label}${detail ? ` — ${detail}` : ""}`);
}

async function signIn(prefix: string): Promise<SupabaseClient> {
  const client = createClient(url, publishableKey, noSession);
  const { error } = await client.auth.signInWithPassword({
    email: need(`TEST_${prefix}_EMAIL`),
    password: need(`TEST_${prefix}_PASSWORD`),
  });
  if (error) throw new Error(`${prefix} 로그인 실패: ${error.message}`);
  return client;
}

async function visibleClientCodes(client: SupabaseClient): Promise<string[]> {
  const { data, error } = await client.from("clients").select("code");
  if (error) return [`(오류 ${error.code})`];
  return data.map((r) => r.code as string).sort();
}

async function visibleWorkerCount(client: SupabaseClient): Promise<number> {
  const { data, error } = await client.from("workers").select("id");
  return error ? -1 : data.length;
}

const same = (a: string[], b: string[]) => JSON.stringify(a) === JSON.stringify(b);

// 1) 비로그인: 아무것도 보이지 않고, 가입도 막혀 있어야 한다
const anon = createClient(url, publishableKey, noSession);
const anonClients = await anon.from("clients").select("code");
check("비로그인은 대상자를 볼 수 없다", (anonClients.data ?? []).length === 0, anonClients.error?.code ?? "0건");
const signup = await anon.auth.signUp({ email: `probe-${Date.now()}@dolbomieum.kr`, password: "Probe-password-12345" });
check("공개 가입이 막혀 있다", Boolean(signup.error), signup.error?.message ?? "가입이 됐음");
// 무료 프로젝트 일시정지 방지용 깨우기 함수는 비로그인(크론)도 부를 수 있다. 시각만 돌려준다
const ping = await anon.rpc("keepalive");
check("비로그인은 깨우기 함수(keepalive)를 부를 수 있다", !ping.error && typeof ping.data === "string", ping.error?.code ?? "");

// 2) 기관별 계정: 내 기관과 연결된 대상자만 보인다
const workerA = await signIn("WORKER_A");
const workerB = await signIn("WORKER_B");
const managerA = await signIn("MANAGER_A");

const codesA = await visibleClientCodes(workerA);
check("A 현장은 C-0012·C-0047만 본다", same(codesA, ["C-0012", "C-0047"]), codesA.join(", "));
const codesB = await visibleClientCodes(workerB);
check("B 현장은 C-0012·C-0063만 본다", same(codesB, ["C-0012", "C-0063"]), codesB.join(", "));
const codesM = await visibleClientCodes(managerA);
check("A 관리자는 C-0012·C-0047만 본다", same(codesM, ["C-0012", "C-0047"]), codesM.join(", "));

// 3) 직원 목록: 현장은 본인만, 관리자는 같은 기관 직원만
check("A 현장은 직원 목록에서 본인만 본다", (await visibleWorkerCount(workerA)) === 1);
check("A 관리자는 A 기관 직원 2명만 본다", (await visibleWorkerCount(managerA)) === 2);

// 3-1) 파일럿 참여자 표시는 계정 발급 스크립트(비밀 키)만 바꾼다 — 본인이 바꾸면 성과지표가 오염된다
{
  const { data: me0 } = await workerA.auth.getUser();
  await workerA.from("workers").update({ pilot: true }).eq("id", me0.user?.id);
  const { data: row } = await createClient(url, secretKey, noSession).from("workers").select("pilot").eq("id", me0.user?.id).single();
  check("현장 인력은 자신을 파일럿 참여자로 바꿀 수 없다", row?.pilot === false, String(row?.pilot));
}

// 4) 다른 기관 대상자에 기록 쓰기는 거부된다
const admin = createClient(url, secretKey, noSession);
const { data: target } = await admin.from("clients").select("id").eq("code", "C-0063").single();
const { data: me } = await workerA.auth.getUser();
const { data: myRow } = await workerA.from("workers").select("agency_id").single();
const insert = await workerA.from("visit_records").insert({
  client_id: target?.id,
  worker_id: me.user?.id,
  agency_id: myRow?.agency_id,
  input_mode: "text",
});
// RLS 거부(42501)일 때만 통과로 본다 — 다른 오류(예: 필수 값 누락)로 실패한 것을 RLS 통과로 착각하지 않게
check("A 현장은 B 기관 대상자(C-0063)에 기록을 쓸 수 없다", insert.error?.code === "42501", insert.error?.code ?? "기록이 써졌음");
if (!insert.error) await admin.from("visit_records").delete().eq("client_id", target?.id).eq("worker_id", me.user?.id);

// 5) 자기 기록의 대상자를 다른 기관 대상자로 바꿀 수 없다
const { data: own } = await workerA.from("visit_records").select("id, client_id").eq("worker_id", me.user?.id).limit(1).single();
if (!own) {
  check("A 현장 본인 기록이 있어야 수정 검사를 할 수 있다", false, "기록 없음 — 앱에서 기록 1건 저장 후 다시 실행");
} else {
  // 결과를 돌려받지 않는 수정(RETURNING 없음)이어야 수정 정책만 시험된다
  const moved = await workerA.from("visit_records").update({ client_id: target?.id }).eq("id", own.id);
  const { data: after } = await admin.from("visit_records").select("client_id").eq("id", own.id).single();
  const blocked = after?.client_id === own.client_id;
  check("A 현장은 자기 기록의 대상자를 B 기관 대상자로 바꿀 수 없다", blocked, moved.error?.code ?? (blocked ? "변경 없음" : "대상자가 바뀌었음"));
  if (!blocked) await admin.from("visit_records").update({ client_id: own.client_id }).eq("id", own.id); // 원래대로 되돌림
}

// 6) 신호 상태 변경: 현장 인력은 막히고, 관리자는 된다 (npm run seed:demo 데이터 사용)
const { data: c12 } = await admin.from("clients").select("id").eq("code", "C-0012").single();
const { data: flag } = await admin.from("flags").select("id, status").eq("client_id", c12?.id).neq("status", "resolved").limit(1).maybeSingle();
if (!flag) {
  check("C-0012에 미해소 신호가 있어야 상태 변경을 시험할 수 있다", false, "없음 — npm run seed:demo 후 다시 실행");
} else {
  await workerA.from("flags").update({ status: "checked" }).eq("id", flag.id);
  const afterWorker = (await admin.from("flags").select("status").eq("id", flag.id).single()).data?.status;
  check("현장 인력은 신호 상태를 바꿀 수 없다", afterWorker === flag.status, afterWorker ?? "");
  await managerA.from("flags").update({ status: "checked" }).eq("id", flag.id);
  const afterManager = (await admin.from("flags").select("status").eq("id", flag.id).single()).data?.status;
  check("A 관리자는 자기 기관 대상자의 신호 상태를 바꿀 수 있다", afterManager === "checked", afterManager ?? "");
  await admin.from("flags").update({ status: flag.status }).eq("id", flag.id); // 원래대로
}

// 7) 브리핑: 본인 이름으로, 볼 수 있는 대상자에게만 저장. 같은 대상자를 돌보는 다른 기관도 읽는다
const { data: managerMe } = await managerA.auth.getUser();
const { data: workerBMe } = await workerB.auth.getUser();
const period = { period_from: "2026-01-01", period_to: "2026-01-14", body: "RLS 검사용" };
const made = await managerA
  .from("briefings")
  .insert({ ...period, client_id: c12?.id, created_by: managerMe.user?.id })
  .select("id")
  .single();
check("A 관리자는 C-0012 브리핑을 저장할 수 있다", Boolean(made.data), made.error?.code ?? "");
const seenByB = made.data ? (await workerB.from("briefings").select("id").eq("id", made.data.id)).data ?? [] : [];
check("C-0012를 함께 돌보는 B 기관은 그 브리핑을 읽는다", seenByB.length === 1);
const otherClient = await managerA.from("briefings").insert({ ...period, client_id: target?.id, created_by: managerMe.user?.id });
check("A 관리자는 B 기관 대상자(C-0063) 브리핑을 저장할 수 없다", otherClient.error?.code === "42501", otherClient.error?.code ?? "저장됐음");
const spoofed = await managerA.from("briefings").insert({ ...period, client_id: c12?.id, created_by: me.user?.id });
check("다른 사람 이름으로 브리핑을 저장할 수 없다", spoofed.error?.code === "42501", spoofed.error?.code ?? "저장됐음");
const hidden = await admin
  .from("briefings")
  .insert({ ...period, client_id: target?.id, created_by: workerBMe.user?.id })
  .select("id")
  .single();
const seenByA = hidden.data ? (await workerA.from("briefings").select("id").eq("id", hidden.data.id)).data ?? [] : ["?"];
check("A 현장은 C-0063 브리핑을 읽을 수 없다", seenByA.length === 0);
await admin.from("briefings").delete().eq("body", "RLS 검사용"); // 검사용 행 정리

// 8) 대상자 관리: 등록·수정·종결은 동 담당자(동 행정복지센터 관리자)만, 함수로만 한다
{
  const agencyOf = async (c: SupabaseClient) => {
    const { data: u } = await c.auth.getUser();
    return ((await c.from("workers").select("agency_id").eq("id", u.user?.id).single()).data?.agency_id as string) ?? "";
  };
  const agencyA = await agencyOf(managerA);
  const agencyB = await agencyOf(workerB);
  const err = (r: { error: { code?: string } | null }) => r.error?.code ?? "성공함";

  // 수행기관(B) 관리자 — 임시 계정 (검사 뒤 삭제)
  const tempEmail = `rls-provider-${Date.now()}@dolbomieum.kr`;
  const tempPassword = `Rls-${crypto.randomUUID()}`;
  const { data: temp } = await admin.auth.admin.createUser({
    email: tempEmail,
    password: tempPassword,
    email_confirm: true,
    app_metadata: { role: "manager", agency_id: agencyB },
  });
  await admin.from("workers").insert({ id: temp.user!.id, agency_id: agencyB, role: "manager", display_name: "RLS 검사 B 관리자" });
  const providerManager = createClient(url, publishableKey, noSession);
  await providerManager.auth.signInWithPassword({ email: tempEmail, password: tempPassword });

  let testId: string | null = null;
  try {
    const anonReg = await anon.rpc("register_client", { p_code: null, p_age_band: 80, p_dong: "서구 화정1동", p_partner_ids: [] });
    check("비로그인은 대상자를 등록할 수 없다", Boolean(anonReg.error), err(anonReg));
    const workerReg = await workerB.rpc("register_client", { p_code: null, p_age_band: 80, p_dong: "서구 화정1동", p_partner_ids: [] });
    check("현장 인력은 대상자를 등록할 수 없다", workerReg.error?.code === "42501", err(workerReg));
    const providerReg = await providerManager.rpc("register_client", { p_code: null, p_age_band: 80, p_dong: "서구 화정1동", p_partner_ids: [] });
    check("동 센터가 아닌 기관의 관리자는 대상자를 등록할 수 없다", providerReg.error?.code === "42501", err(providerReg));

    const reg = await managerA.rpc("register_client", { p_code: null, p_age_band: 80, p_dong: "서구 화정1동", p_partner_ids: [agencyB] });
    const code = reg.data as string | null;
    check("동 담당자는 번호 없이 등록하면 다음 번호가 붙는다", typeof code === "string" && /^C-\d{4}$/.test(code), err(reg));
    testId = code ? ((await admin.from("clients").select("id").eq("code", code).single()).data?.id ?? null) : null;
    const links = testId ? ((await admin.from("client_agencies").select("agency_id").eq("client_id", testId)).data ?? []).map((l) => l.agency_id).sort() : [];
    check("등록하면 내 기관과 함께 돌볼 기관이 연결된다", JSON.stringify(links) === JSON.stringify([agencyA, agencyB].sort()), String(links.length));
    check("함께 돌볼 기관(B) 현장도 새 대상자를 본다", code !== null && (await visibleClientCodes(workerB)).includes(code));

    const update = (c: SupabaseClient, id: string | null, p_code: string, partners: string[]) =>
      c.rpc("update_client", { p_client_id: id, p_code, p_age_band: 70, p_dong: "서구 화정1동", p_partner_ids: partners });
    const providerUpd = await update(providerManager, testId, code ?? "", [agencyB]);
    check("동 센터가 아닌 기관의 관리자는 함께 돌보는 대상자도 고칠 수 없다", providerUpd.error?.code === "42501", err(providerUpd));
    const workerUpd = await update(workerB, testId, code ?? "", [agencyB]);
    check("현장 인력은 대상자를 고칠 수 없다", workerUpd.error?.code === "42501", err(workerUpd));
    const providerClose = await providerManager.rpc("set_client_closed", { p_client_id: testId, p_closed: true });
    check("동 센터가 아닌 기관의 관리자는 종결할 수 없다", providerClose.error?.code === "42501", err(providerClose));

    // 자동 번호(가장 큰 번호 + 1)를 끌어올리지 않게 낮은 번호로 바꿔 본다
    const newCode = `C-000${(Date.now() % 9) + 1}`;
    const upd = await update(managerA, testId, newCode, []);
    const after = testId ? (await admin.from("clients").select("code, age_band").eq("id", testId).single()).data : null;
    check("동 담당자는 식별번호·연령대를 고칠 수 있다", !upd.error && after?.code === newCode && after?.age_band === 70, err(upd));
    const history = testId ? (await workerA.from("client_code_history").select("old_code, new_code").eq("client_id", testId)).data ?? [] : [];
    check("번호를 바꾸면 이력이 남고, 같은 기관 현장도 이력을 본다", history.length === 1 && history[0].old_code === code && history[0].new_code === newCode, String(history.length));
    check("기관 연결을 해제하면 B 현장은 더 이상 보지 못한다", !(await visibleClientCodes(workerB)).includes(newCode));
    const reuse = await managerA.rpc("register_client", { p_code: code, p_age_band: null, p_dong: "서구 화정1동", p_partner_ids: [] });
    check("예전에 쓴 번호는 다른 대상자에게 다시 줄 수 없다", reuse.error?.code === "23505", err(reuse));
    if (!reuse.error) await admin.from("clients").delete().eq("code", code!);
    const taken = await update(managerA, testId, "C-0012", []);
    check("다른 대상자가 쓰는 번호로 바꿀 수 없다", taken.error?.code === "23505", err(taken));
    const otherAgency = await update(managerA, target?.id ?? null, "C-0063", []);
    check("동 담당자도 자기 기관과 연결되지 않은 대상자(C-0063)는 고칠 수 없다", otherAgency.error?.code === "42501", err(otherAgency));

    const close = await managerA.rpc("set_client_closed", { p_client_id: testId, p_closed: true });
    const closedAt = testId ? (await admin.from("clients").select("closed_at").eq("id", testId).single()).data?.closed_at : null;
    const reopen = await managerA.rpc("set_client_closed", { p_client_id: testId, p_closed: false });
    const reopenedAt = testId ? (await admin.from("clients").select("closed_at").eq("id", testId).single()).data?.closed_at : "?";
    check("동 담당자는 종결하고 다시 진행으로 되돌릴 수 있다", !close.error && Boolean(closedAt) && !reopen.error && reopenedAt === null, err(close));

    const badDong = await managerA.rpc("register_client", { p_code: null, p_age_band: 80, p_dong: "서구 화정1동 운천로 12 010-1234-5678", p_partner_ids: [] });
    check("동 칸에 주소·전화번호를 섞어 넣으면 거부된다", Boolean(badDong.error), err(badDong));
    if (badDong.data) await admin.from("clients").delete().eq("code", badDong.data as string);

    // 9999를 쓴 뒤에도 번호 없이 등록할 수 있다 (빈 번호를 찾아 붙인다)
    const top = await managerA.rpc("register_client", { p_code: "C-9999", p_age_band: null, p_dong: "서구 화정1동", p_partner_ids: [] });
    const blank = () => managerA.rpc("register_client", { p_code: null, p_age_band: null, p_dong: "서구 화정1동", p_partner_ids: [] });
    const next1 = await blank();
    const next2 = await blank();
    check(
      "C-9999를 쓴 뒤에도 번호 없이 계속 등록할 수 있다 (빈 번호를 찾아 붙인다)",
      !top.error && !next1.error && !next2.error && next1.data !== next2.data,
      `${err(next1)} / ${err(next2)}`,
    );
    for (const c of [top.data, next1.data, next2.data]) if (typeof c === "string") await admin.from("clients").delete().eq("code", c);

    const directInsert = await managerA.from("clients").insert({ code: "C-9998", dong: "서구 화정1동" });
    check("관리자도 대상자 표에 직접 쓸 수는 없다 (함수로만)", directInsert.error?.code === "42501", err(directInsert));
    if (!directInsert.error) await admin.from("clients").delete().eq("code", "C-9998");
    const before12 = (await admin.from("clients").select("dong").eq("code", "C-0012").single()).data?.dong;
    await managerA.from("clients").update({ dong: "RLS 검사" }).eq("code", "C-0012");
    const after12 = (await admin.from("clients").select("dong").eq("code", "C-0012").single()).data?.dong;
    check("관리자도 대상자 표를 직접 고칠 수는 없다", after12 === before12, after12 ?? "");
    if (after12 !== before12) await admin.from("clients").update({ dong: before12 }).eq("code", "C-0012");

    const agencyList = await managerA.rpc("list_agencies");
    check("관리자는 함께 돌볼 기관 목록을 본다", Array.isArray(agencyList.data) && agencyList.data.some((a: { id: string }) => a.id === agencyB), err(agencyList));
    const workerList = await workerA.rpc("list_agencies");
    check("현장 인력은 기관 목록 함수를 쓸 수 없다", Boolean(workerList.error) || (workerList.data ?? []).length === 0, err(workerList));
  } finally {
    if (testId) await admin.from("clients").delete().eq("id", testId); // 연결·이력은 함께 지워진다
    await admin.auth.admin.deleteUser(temp.user!.id); // workers 행도 함께 지워진다
  }
}

console.log(failures === 0 ? "\n모든 RLS 검사 통과" : `\n실패 ${failures}건`);
process.exit(failures === 0 ? 0 : 1);
