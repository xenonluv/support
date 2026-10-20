import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PUSH_ENDPOINT_COOKIE } from "@/lib/push/payload";
import { createClient } from "@/lib/supabase/server";

/**
 * 로그아웃. 일반 폼 전송(POST)으로 받아 페이지를 통째로 새로 불러오게 한다.
 * 화면 전환 방식이면 이전 사용자가 쓰던 기록 화면 상태가 메모리에 남을 수 있기 때문이다.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  // 이 기기로 오던 알림을 끊는다 (로그아웃한 폰에 앞사람 대상자 알림이 오지 않게). 본인 기기만 지워진다(RLS)
  const jar = await cookies();
  const endpoint = jar.get(PUSH_ENDPOINT_COOKIE)?.value;
  if (endpoint) {
    await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
    jar.delete(PUSH_ENDPOINT_COOKIE);
  }
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
