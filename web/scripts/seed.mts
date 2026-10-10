// 시험 데이터: 기관 2곳, 대상자 3명, 계정 3개를 만든다(여러 번 실행해도 같은 결과).
// 실행: npm run seed — 비밀 키(SUPABASE_SECRET_KEY)로 RLS를 우회하므로 로컬에서만 쓴다.
import { createClient } from "@supabase/supabase-js";

function need(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} 환경변수가 없습니다 (.env.local 확인)`);
  return value;
}

const admin = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function must<T>(
  label: string,
  p: PromiseLike<{ data: T | null; error: { message: string } | null }>,
): Promise<T | null> {
  const { data, error } = await p;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

async function mustRows<T>(label: string, p: PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows = await must(label, p);
  if (!rows || rows.length === 0) throw new Error(`${label}: 결과가 비어 있습니다`);
  return rows;
}

// 기관
const agencies = await mustRows(
  "기관",
  admin
    .from("agencies")
    .upsert(
      [
        { name: "화정1동 행정복지센터", type: "dong_center" },
        { name: "서구 노인맞춤돌봄 수행기관", type: "provider" },
      ],
      { onConflict: "name" },
    )
    .select("id, name"),
);
const agencyId = (name: string) => agencies.find((a) => a.name === name)!.id as string;
const A = agencyId("화정1동 행정복지센터");
const B = agencyId("서구 노인맞춤돌봄 수행기관");

// 대상자 (성명·주소·연락처 없음)
const clients = await mustRows(
  "대상자",
  admin
    .from("clients")
    .upsert(
      [
        { code: "C-0012", age_band: 70, dong: "서구 화정1동" },
        { code: "C-0047", age_band: 80, dong: "서구 화정2동" },
        { code: "C-0063", age_band: 80, dong: "서구 농성1동" },
      ],
      { onConflict: "code" },
    )
    .select("id, code"),
);
const clientId = (code: string) => clients.find((c) => c.code === code)!.id as string;

// 대상자-기관 연결: C-0012는 두 기관이 함께 돌봄
await must(
  "대상자-기관 연결",
  admin.from("client_agencies").upsert(
    [
      { client_id: clientId("C-0012"), agency_id: A },
      { client_id: clientId("C-0012"), agency_id: B },
      { client_id: clientId("C-0047"), agency_id: A },
      { client_id: clientId("C-0063"), agency_id: B },
    ],
    { onConflict: "client_id,agency_id" },
  ),
);

// 계정: app_metadata(role, agency_id)는 비밀 키로만 바꿀 수 있어 화면 분기에 쓴다
const accounts = [
  { prefix: "MANAGER_A", role: "manager", agency: A, displayName: "시험 관리자 A" },
  { prefix: "WORKER_A", role: "worker", agency: A, displayName: "시험 현장 A" },
  { prefix: "WORKER_B", role: "worker", agency: B, displayName: "시험 현장 B" },
] as const;

const { data: existing, error: listError } = await admin.auth.admin.listUsers({ perPage: 1000 });
if (listError) throw new Error(`계정 목록: ${listError.message}`);

for (const acc of accounts) {
  const email = need(`TEST_${acc.prefix}_EMAIL`);
  const password = need(`TEST_${acc.prefix}_PASSWORD`);
  const app_metadata = { role: acc.role, agency_id: acc.agency };
  const found = existing.users.find((u) => u.email === email);
  const user = found
    ? (await admin.auth.admin.updateUserById(found.id, { password, app_metadata })).data.user
    : (await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata })).data.user;
  if (!user) throw new Error(`${email} 계정을 만들지 못했습니다`);
  await must(
    `직원 ${email}`,
    admin
      .from("workers")
      .upsert({ id: user.id, agency_id: acc.agency, role: acc.role, display_name: acc.displayName }, { onConflict: "id" }),
  );
  console.log(`✓ ${acc.displayName} (${email}) ${found ? "갱신" : "생성"}`);
}

console.log(`✓ 기관 ${agencies.length}곳, 대상자 ${clients.length}명, 연결 4건`);
