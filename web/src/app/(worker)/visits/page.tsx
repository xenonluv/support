import { Suspense } from "react";
import Link from "next/link";
import { Mic } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { clientLabel } from "@/lib/client-label";
import { getMyClients } from "@/lib/records/data";
import { seoulMonthDay } from "@/lib/records/dates";
import { cn } from "@/lib/utils";

export default function VisitsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">오늘의 방문</h1>
        <p className="text-sm text-muted-foreground">
          담당 대상자를 골라 방문 기록을 남기세요 ·{" "}
          <Link href="/guide" className="font-medium text-primary underline underline-offset-2">
            사용 안내
          </Link>
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
        <ClientList />
      </Suspense>
    </div>
  );
}

async function ClientList() {
  const clients = await getMyClients();
  if (clients.length === 0) {
    return <p className="rounded-xl border bg-card p-6 text-center text-sm">담당 대상자가 없습니다. 기관 담당자에게 문의해 주세요.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {clients.map((c) => {
        const label = clientLabel(c);
        return (
          <li key={c.code} className="rounded-xl border bg-card p-4 shadow-sm">
            <p className="font-semibold">{label.title}</p>
            <p className="text-sm text-muted-foreground">
              {label.subtitle} · 마지막 기록 {c.lastVisitedAt ? seoulMonthDay(c.lastVisitedAt) : "없음"}
            </p>
            <Link href={`/record?client=${c.code}`} className={cn(buttonVariants({ size: "lg" }), "mt-3 h-12 w-full text-base")}>
              <Mic aria-hidden="true" />
              기록하기
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
