import { Suspense } from "react";
import Link from "next/link";
import { ClipboardList, Mic } from "lucide-react";
import { MINE_CARD, MineBadge } from "@/components/mine-mark";
import { PushSetup } from "@/components/push-setup";
import { ToneBadge } from "@/components/tone-badge";
import { buttonVariants } from "@/components/ui/button";
import { clientLabel } from "@/lib/client-label";
import { seoulMonthDay } from "@/lib/records/dates";
import { cn } from "@/lib/utils";
import { vapidPublicKey } from "@/lib/push/send";
import { getVisitCards } from "@/lib/visits/data";

export default function VisitsPage() {
  const pushKey = vapidPublicKey();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">오늘의 방문</h1>
        <p className="text-sm text-muted-foreground">
          방문 전에 상황을 보고, 다녀와서 기록을 남기세요 ·{" "}
          <Link href="/guide" className="font-medium text-primary underline underline-offset-2">
            사용 안내
          </Link>
        </p>
      </div>
      {pushKey && <PushSetup publicKey={pushKey} />}
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
        <ClientList />
      </Suspense>
    </div>
  );
}

async function ClientList() {
  const clients = await getVisitCards();
  if (clients.length === 0) {
    return <p className="rounded-xl border bg-card p-6 text-center text-sm">담당 대상자가 없습니다. 기관 담당자에게 문의해 주세요.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {clients.map((c) => {
        const label = clientLabel(c);
        return (
          <li
            key={c.id}
            className={cn(
              "rounded-xl border bg-card p-4 shadow-sm",
              c.myRecords > 0 && MINE_CARD,
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{label.title}</p>
              <div className="flex shrink-0 flex-col items-end gap-1">
                {c.myRecords > 0 && <MineBadge count={c.myRecords} />}
                {c.openSignals > 0 && <ToneBadge tone={c.caution ? "caution" : "observe"}>확인 필요 {c.openSignals}</ToneBadge>}
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {label.subtitle} · {c.lastVisitedAt ? `최근 방문 ${seoulMonthDay(c.lastVisitedAt)}` : "기록 없음"}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link href={`/visits/${c.id}`} className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-12 text-base")}>
                <ClipboardList aria-hidden="true" />
                상황 보기
              </Link>
              <Link href={`/record?client=${c.code}`} className={cn(buttonVariants({ size: "lg" }), "h-12 text-base")}>
                <Mic aria-hidden="true" />
                기록하기
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
