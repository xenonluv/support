import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { MicTest } from "./mic-test";

export const metadata: Metadata = { title: "마이크 테스트 · 돌봄이음" };

export default function MicTestPage() {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
      <header className="bg-sidebar px-4 py-3">
        <Brand className="text-white" />
      </header>
      <main className="flex flex-col gap-5 px-4 pt-6 pb-[calc(2.5rem+env(safe-area-inset-bottom))]">
        <div>
          <h1 className="text-xl font-bold">마이크 테스트</h1>
          <p className="text-sm text-muted-foreground">
            녹음은 이 휴대폰 안에서 재생됩니다. [글자로 변환]을 누를 때만 서버(Groq)로 보냅니다. 최대 2분까지 녹음됩니다.
          </p>
        </div>
        <MicTest />
      </main>
    </div>
  );
}
