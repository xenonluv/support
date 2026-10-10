import { createClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";
import type { Database } from "@/lib/supabase/types";

/**
 * 무료 Supabase는 7일 동안 사용이 적으면 일시정지된다. Vercel 크론이 하루 한 번 불러 DB에 작은 쓰기를 남긴다.
 * Vercel이 CRON_SECRET을 Authorization 헤더로 보내므로 그 값이 맞을 때만 실행한다.
 * 깨우기 함수(public.keepalive)는 한 행짜리 시각만 갱신하고 개인정보를 읽지 않는다.
 */
export async function GET(request: Request) {
  // 요청 헤더를 먼저 읽어 빌드 때 미리 만들어지지 않고 요청마다 실행되게 한다
  const authorization = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[keepalive] not-configured");
    return Response.json({ error: "not-configured" }, { status: 500 });
  }
  if (authorization !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createClient<Database>(supabaseUrl(), supabasePublishableKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.rpc("keepalive");
  if (error) {
    console.error(`[keepalive] db-failed ${error.code}`);
    return Response.json({ error: "db-failed" }, { status: 502 });
  }
  return Response.json({ ok: true, pingedAt: data });
}
