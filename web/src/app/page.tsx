import Link from "next/link";
import { Brand } from "@/components/brand";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <Brand className="text-2xl" />
      <p className="text-muted-foreground">방문 직후 30초 구술로 돌봄기록 초안을 만듭니다.</p>
      <div className="flex w-full max-w-xs flex-col gap-3">
        <Link href="/visits" className={cn(buttonVariants({ size: "lg" }), "h-12 text-base")}>
          현장 기록 화면 미리보기
        </Link>
        <Link href="/signals" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-12 text-base")}>
          관리자 대시보드 미리보기
        </Link>
      </div>
      <p className="text-sm text-muted-foreground">로그인은 5단계에서 연결됩니다.</p>
    </main>
  );
}
