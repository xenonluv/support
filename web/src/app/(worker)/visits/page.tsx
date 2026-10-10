import Link from "next/link";
import { Mic } from "lucide-react";
import { ToneBadge } from "@/components/tone-badge";
import { buttonVariants } from "@/components/ui/button";
import { clientLabel } from "@/lib/client-label";
import { DEMO_TODAY, DEMO_VISITS } from "@/lib/demo";
import { cn } from "@/lib/utils";

export default function VisitsPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">오늘의 방문</h1>
        <p className="text-sm text-muted-foreground">
          {DEMO_TODAY} · {DEMO_VISITS.length}곳
        </p>
      </div>
      <ul className="flex flex-col gap-3">
        {DEMO_VISITS.map((v) => {
          const label = clientLabel(v.client);
          return (
            <li key={v.client.code} className="rounded-xl border bg-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{label.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {label.subtitle} · {v.time}
                  </p>
                </div>
                {v.done ? <ToneBadge tone="normal">기록 완료</ToneBadge> : <ToneBadge tone="neutral">방문 예정</ToneBadge>}
              </div>
              {v.note && <p className="mt-2 text-sm">{v.note}</p>}
              {!v.done && (
                <Link href="/record" className={cn(buttonVariants({ size: "lg" }), "mt-3 h-12 w-full text-base")}>
                  <Mic aria-hidden="true" />
                  기록하기
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
