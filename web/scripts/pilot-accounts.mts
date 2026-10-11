// 파일럿 계정 일괄 발급: 기관·대상자(식별번호만)·참여자 계정을 만들고 파일럿 참여자로 표시한다.
// 실행: npm run pilot:accounts -- pilot/pilot.json [--reset-passwords]
// - 설정 파일과 결과 파일(임시 비밀번호)은 개인정보라 git에 넣지 않는다(web/pilot/, 예시 파일만 커밋).
// - 다시 실행해도 안전하다: 있는 계정의 비밀번호는 그대로 둔다(--reset-passwords를 주면 새로 만든다).
import { randomInt } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { describePilotIssues, PilotConfigSchema } from "@/schemas/pilot";

function need(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 환경변수가 없습니다 (.env.local 확인)`);
  return value;
}

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const resetPasswords = args.includes("--reset-passwords");
if (!file) throw new Error("설정 파일 경로를 주세요: npm run pilot:accounts -- pilot/pilot.json");

// 1) 설정 검사 — 하나라도 틀리면 아무것도 만들지 않는다
const parsed = PilotConfigSchema.safeParse(JSON.parse(readFileSync(file, "utf8")));
if (!parsed.success) {
  console.error("설정 파일을 고쳐 주세요 (아무것도 만들지 않았습니다):");
  for (const line of describePilotIssues(parsed.error)) console.error(`  - ${line}`);
  process.exit(1);
}
const config = parsed.data;

const admin = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function rows<T>(label: string, p: PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const { data, error } = await p;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data ?? [];
}

// 휴대폰에서 치기 쉽게 헷갈리는 글자(0·o·1·l·i)를 뺀 4자리 3묶음 (약 60비트)
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
const newPassword = () =>
  Array.from({ length: 3 }, () => Array.from({ length: 4 }, () => ALPHABET[randomInt(ALPHABET.length)]).join("")).join("-");

// 2) 기관·대상자(새 번호만)·연결
const agencies = await rows(
  "기관",
  admin.from("agencies").upsert(config.agencies, { onConflict: "name" }).select("id, name"),
);
const agencyId = (name: string) => agencies.find((a) => a.name === name)!.id as string;

// 대상자는 새 번호만 넣는다. 이미 있는 번호·예전에 쓴 번호는 앱(대상자 관리)에서 동 담당자가 관리하므로 건드리지 않는다
// (덮어쓰면 앱에서 고친 연령대·기관이 되돌아가고, 바뀐 번호가 새 대상자로 다시 생긴다)
const codes = config.clients.map((c) => c.code);
const [present, retired] = codes.length
  ? await Promise.all([
      rows("대상자", admin.from("clients").select("code").in("code", codes)),
      rows("번호 이력", admin.from("client_code_history").select("old_code").in("old_code", codes)),
    ])
  : [[], []];
const skip = new Set([...present.map((c) => c.code), ...retired.map((h) => h.old_code)]);
const fresh = config.clients.filter((c) => !skip.has(c.code));
const clients = fresh.length
  ? await rows("대상자", admin.from("clients").insert(fresh.map((c) => ({ code: c.code, age_band: c.ageBand, dong: c.dong }))).select("id, code"))
  : [];
const clientId = (code: string) => clients.find((c) => c.code === code)!.id as string;
const links = fresh.flatMap((c) => c.agencies.map((a) => ({ client_id: clientId(c.code), agency_id: agencyId(a) })));
if (links.length) await rows("대상자-기관 연결", admin.from("client_agencies").insert(links).select("client_id"));

// 3) 참여자 계정 (역할·기관은 비밀 키로만 바꿀 수 있는 app_metadata에 둔다)
const existing = [];
for (let page = 1; ; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw new Error(`계정 목록: ${error.message}`);
  existing.push(...data.users);
  if (data.users.length < 1000) break;
}

const issued: string[][] = [];
let created = 0;
let updated = 0;
for (const w of config.workers) {
  const email = w.email.toLowerCase();
  const app_metadata = { role: w.role, agency_id: agencyId(w.agency) };
  const found = existing.find((u) => u.email?.toLowerCase() === email);
  const password = !found || resetPasswords ? newPassword() : null;
  const { data, error } = found
    ? await admin.auth.admin.updateUserById(found.id, password ? { app_metadata, password } : { app_metadata })
    : await admin.auth.admin.createUser({ email, password: password!, email_confirm: true, app_metadata });
  if (error || !data.user) throw new Error(`${email} 계정: ${error?.message ?? "알 수 없음"}`);
  await rows(
    `직원 ${email}`,
    admin
      .from("workers")
      .upsert({ id: data.user.id, agency_id: app_metadata.agency_id, role: w.role, display_name: w.name, pilot: true }, { onConflict: "id" })
      .select("id"),
  );
  if (found) updated++;
  else created++;
  if (password) issued.push([w.name, email, w.role === "manager" ? "관리자" : "현장", w.agency, password]);
}

// 4) 결과: 비밀번호는 화면에 찍지 않고, git에서 빠지는 파일에만 쓴다
console.log(`✓ 기관 ${agencies.length}곳, 대상자 새로 ${clients.length}명 (이미 있거나 예전에 쓴 번호 ${skip.size}개는 그대로), 연결 ${links.length}건`);
console.log(`✓ 참여자 계정 새로 ${created}명, 갱신 ${updated}명 (모두 파일럿 참여자로 표시)`);
if (issued.length) {
  const stamp = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 16).replace(/[-:T]/g, ""); // 서울 시각
  const out = new URL(`../pilot/accounts-${stamp}.csv`, import.meta.url);
  const csv = [["이름", "이메일", "역할", "기관", "임시 비밀번호"], ...issued].map((r) => r.map((v) => `"${v.replaceAll('"', '""')}"`).join(",")).join("\n");
  writeFileSync(out, `﻿${csv}\n`, { mode: 0o600 });
  console.log(`✓ 새 비밀번호 ${issued.length}건 → ${out.pathname} (전달 후 지우세요)`);
} else {
  console.log("  새로 만든 비밀번호 없음 (있는 계정은 비밀번호를 그대로 두었습니다)");
}
