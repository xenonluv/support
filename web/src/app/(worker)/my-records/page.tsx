import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function MyRecordsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">내 기록</h1>
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-8 text-center">
        <p className="font-medium">아직 작성한 기록이 없습니다</p>
        <p className="text-sm text-muted-foreground">방문 후 기록하면 여기에서 다시 보고 복사할 수 있어요</p>
        <Link href="/record" className={cn(buttonVariants({ size: "lg" }), "h-11 text-base")}>
          기록하기
        </Link>
      </div>
    </div>
  );
}
