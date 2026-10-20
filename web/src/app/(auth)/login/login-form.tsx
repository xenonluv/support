"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { login, type LoginState } from "@/lib/auth/actions";
import { PUSH_RESAVED_KEY } from "@/lib/push/payload";

const INPUT = "h-12 rounded-lg border bg-card px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null });
  // 알림을 눌러 들어온 경우 로그인 뒤 그 화면으로 돌아간다 (서버가 안전한 주소인지 다시 확인한다)
  const next = useRef<HTMLInputElement>(null);
  useEffect(() => {
    // defaultValue로 넣어야 로그인 실패 뒤 React가 폼을 초기화해도 남는다
    if (next.current) next.current.defaultValue = new URLSearchParams(window.location.search).get("next") ?? "";
    // 로그인한 사람이 바뀔 수 있으니 이 기기 알림을 새 사람 기준으로 다시 저장하게 한다
    try {
      sessionStorage.removeItem(PUSH_RESAVED_KEY);
    } catch {
      // 저장소를 못 쓰면 표시도 없다
    }
  }, []);
  return (
    <form action={action} className="flex w-full flex-col gap-4">
      <input ref={next} type="hidden" name="next" defaultValue="" />
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        이메일
        <input name="email" type="email" inputMode="email" autoComplete="username" required className={INPUT} />
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        비밀번호
        <input name="password" type="password" autoComplete="current-password" required className={INPUT} />
      </label>
      <p role="alert" className="min-h-5 text-sm text-caution">
        {state.error}
      </p>
      <Button type="submit" size="lg" disabled={pending} className="h-12 text-base">
        {pending ? "확인 중…" : "로그인"}
      </Button>
    </form>
  );
}
