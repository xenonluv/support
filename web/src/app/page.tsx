import Link from "next/link";
import { Brand } from "@/components/brand";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// 보통은 proxy가 로그인 화면이나 역할 홈으로 보내므로 보이지 않는다(예비 화면).
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <Brand className="text-2xl" />
      <Link href="/login" className={cn(buttonVariants({ size: "lg" }), "h-12 w-full max-w-xs text-base")}>
        로그인
      </Link>
    </main>
  );
}
