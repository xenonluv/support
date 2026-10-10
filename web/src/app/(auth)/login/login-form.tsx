"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { login, type LoginState } from "@/lib/auth/actions";

const INPUT = "h-12 rounded-lg border bg-card px-3 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { error: null });
  return (
    <form action={action} className="flex w-full flex-col gap-4">
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
