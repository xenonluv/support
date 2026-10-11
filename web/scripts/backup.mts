// DB 백업: Supabase 무료 요금제는 자동 백업이 없어 직접 내보낸다. 실행: npm run backup
// - public 테이블 전부와 로그인 계정(id·이메일·역할·기관, 비밀번호 제외)을 JSON으로 web/backups/<서울 시각>/에 쓴다.
// - 돌봄 기록이 들어 있으므로 git에서 빠지는 폴더에만 두고, 이 컴퓨터 밖으로 옮길 때는 암호화한다.
// - 복원 순서: auth_users → agencies → clients → client_agencies → workers → visit_records → flags → alert_drafts → briefings
//   (계정은 관리 API createUser에 같은 id로 만들고, 비밀번호는 npm run pilot:accounts -- ... --reset-passwords로 새로 발급)
import { mkdirSync, writeFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { readAll } from "@/lib/metrics/rows";

function need(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 환경변수가 없습니다 (.env.local 확인)`);
  return value;
}

const admin = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

// 복원 순서대로, 나눠 읽을 때 쓸 정렬 기준
const TABLES = [
  ["agencies", "id"],
  ["clients", "id"],
  ["client_agencies", "client_id,agency_id"],
  ["workers", "id"],
  ["visit_records", "id"],
  ["flags", "id"],
  ["alert_drafts", "id"],
  ["briefings", "id"],
] as const;

const stamp = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 16).replace(/[-:T]/g, ""); // 서울 시각
const dir = new URL(`../backups/${stamp}/`, import.meta.url);
mkdirSync(dir, { recursive: true, mode: 0o700 });
const save = (name: string, rows: unknown[]) => writeFileSync(new URL(`${name}.json`, dir), JSON.stringify(rows, null, 1), { mode: 0o600 });

const counts: Record<string, number> = {};
for (const [table, orderBy] of TABLES) {
  const rows = await readAll<Record<string, unknown>>((from, to) => {
    let q = admin.from(table).select("*");
    for (const col of orderBy.split(",")) q = q.order(col);
    return q.range(from, to);
  });
  save(table, rows);
  counts[table] = rows.length;
}

const users = [];
for (let page = 1; ; page++) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw new Error(`계정 목록: ${error.message}`);
  users.push(...data.users.map((u) => ({ id: u.id, email: u.email, app_metadata: u.app_metadata, created_at: u.created_at })));
  if (data.users.length < 1000) break;
}
save("auth_users", users);
counts.auth_users = users.length;
save("manifest", [{ created_at: new Date().toISOString(), counts }]);

console.log(`✓ 백업 → ${dir.pathname}`);
console.log(`  ${Object.entries(counts).map(([t, n]) => `${t} ${n}`).join(", ")}`);
