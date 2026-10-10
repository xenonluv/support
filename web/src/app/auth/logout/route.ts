import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 로그아웃. 일반 폼 전송(POST)으로 받아 페이지를 통째로 새로 불러오게 한다.
 * 화면 전환 방식이면 이전 사용자가 쓰던 기록 화면 상태가 메모리에 남을 수 있기 때문이다.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), 303);
}
