import { createClient } from "@/lib/supabase/server";

/** 로그인한 사용자 id (JWT 서명 확인). 없으면 null */
export async function getAuthUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}
