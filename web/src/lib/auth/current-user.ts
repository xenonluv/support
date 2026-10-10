import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/auth/routes";

export type CurrentUser = { id: string; role: Role; displayName: string; agencyName: string };

/** 화면에 보여 줄 로그인 사용자 정보. 세션을 읽으므로 <Suspense> 안에서만 쓴다. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  // Supabase 인증이 내부에서 Date.now()를 쓰므로, 미리 그리기(prefetch) 단계가 아니라 요청 시점에만 실행한다
  await connection();
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const id = auth?.claims?.sub;
  if (!id) return null;
  const { data } = await supabase.from("workers").select("role, display_name, agencies(name)").eq("id", id).single();
  if (!data) return null;
  return {
    id,
    role: data.role as Role,
    displayName: data.display_name,
    agencyName: data.agencies?.name ?? "",
  };
}
