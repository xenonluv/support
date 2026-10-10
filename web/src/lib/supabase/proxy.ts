import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { roleFromMetadata, type Role } from "@/lib/auth/routes";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

/** 요청마다 세션을 갱신하고(쿠키 재발급), 로그인 상태와 역할을 돌려준다. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  let session: { role: Role | null } | null = null;
  try {
    const { data } = await supabase.auth.getClaims();
    if (data?.claims) session = { role: roleFromMetadata(data.claims.app_metadata) };
  } catch {
    // 인증 서버에 닿지 못하면 비로그인으로 본다(로그인 화면으로 보냄)
  }
  return { response, session };
}
