import { NextResponse, type NextRequest } from "next/server";
import { decideRoute, loginPath } from "@/lib/auth/routes";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { response, session } = await updateSession(request);
  const target = decideRoute(request.nextUrl.pathname, session);
  if (!target) return response;

  const destination = target === "/login" ? loginPath(request.nextUrl.pathname) : target;
  const redirect = NextResponse.redirect(new URL(destination, request.url));
  // 갱신된 세션 쿠키를 이동 응답에도 실어 보낸다
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: [
    // API·정적 파일·아이콘·매니페스트·서비스 워커는 제외 (API는 핸들러가 직접 로그인 확인)
    "/((?!api|_next/static|_next/image|favicon.ico|icon.png|apple-icon.png|manifest.webmanifest|sw.js|icons/|robots.txt).*)",
  ],
};
