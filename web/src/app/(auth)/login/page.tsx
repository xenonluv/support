import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "로그인 · 돌봄이음" };

export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <Brand className="text-2xl" />
        <p className="text-sm text-muted-foreground">방문 직후 30초 구술로 돌봄기록 초안을 만듭니다.</p>
      </div>
      <LoginForm />
      <p className="text-center text-xs text-muted-foreground">계정은 기관 담당자가 만들어 드립니다.</p>
    </main>
  );
}
