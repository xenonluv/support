import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { ToneBadge } from "@/components/tone-badge";
import { getBriefingClients } from "@/lib/briefing/data";
import { clientLabel } from "@/lib/client-label";
import { seoulMonthDay } from "@/lib/records/dates";

export default function BriefingListPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        돌봄이음 <span aria-hidden="true">/</span> <span className="font-medium text-primary">인수인계 브리핑</span>
      </p>
      <header>
        <h1 className="text-2xl font-bold lg:text-3xl">인수인계 브리핑</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground break-keep">
          어르신을 고르면 여러 기관의 기록을 시간순으로 모아, 그동안 무슨 일이 있었는지 한 장으로 요약합니다.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-muted-foreground">대상자를 불러오는 중…</p>}>
        <ClientList />
      </Suspense>
    </div>
  );
}

async function ClientList() {
  const rows = await getBriefingClients();
  if (rows.length === 0) {
    return <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">볼 수 있는 대상자가 없습니다.</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {rows.map((r) => {
        const label = clientLabel(r.client);
        return (
          <li key={r.client.code}>
            <Link
              href={`/briefing/${r.client.code}`}
              className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{label.title}</p>
                <p className="text-sm text-muted-foreground">{label.subtitle}</p>
                <p className="mt-1 text-sm">
                  최근 14일 기록 {r.recordCount}건 · 기관 {r.agencyCount}곳
                  {r.lastVisitedAt && ` · 마지막 방문 ${seoulMonthDay(r.lastVisitedAt)}`}
                </p>
              </div>
              {r.activeSignals > 0 && <ToneBadge tone="caution">미해결 신호 {r.activeSignals}</ToneBadge>}
              <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
