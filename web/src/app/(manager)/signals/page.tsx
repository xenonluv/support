import { CalendarDays } from "lucide-react";
import { AiNotice } from "@/components/ai-notice";
import { ClientRankRow } from "@/components/client-rank-row";
import { StatCard } from "@/components/stat-card";
import { ToneBadge } from "@/components/tone-badge";
import { Button } from "@/components/ui/button";
import { DEMO_PRIORITY, DEMO_STATS, DEMO_SUMMARY } from "@/lib/demo";

export default function SignalsPage() {
  const { totalClients, priorityCount, recordsToday, asOf } = DEMO_SUMMARY;
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        돌봄이음 <span aria-hidden="true">/</span> <span className="font-medium text-primary">이상징후 현황</span>
      </p>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">이상징후 현황</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {asOf} · 오늘 접수된 기록 {recordsToday}건
          </p>
          <p className="mt-3 text-lg font-semibold">
            오늘 {totalClients}명 중 먼저 볼 {priorityCount}명
          </p>
        </div>
        <Button variant="outline" size="lg" disabled>
          <CalendarDays aria-hidden="true" />
          기간 · 필터
        </Button>
      </header>
      <section aria-label="요약" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {DEMO_STATS.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </section>
      <section aria-labelledby="priority-heading" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="priority-heading" className="text-lg font-bold">
            먼저 확인할 어르신
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              위험 신호 개수 · 지속 기간 · 관찰 기관 수 기준 정렬
            </span>
          </h2>
          <ToneBadge tone="neutral">상위 {DEMO_PRIORITY.length}명</ToneBadge>
        </div>
        <ol className="flex flex-col gap-3">
          {DEMO_PRIORITY.map((p, i) => (
            <ClientRankRow key={p.client.code} rank={i + 1} href={`/signals/${p.client.code}`} {...p} />
          ))}
        </ol>
      </section>
      <AiNotice className="pt-2" />
    </div>
  );
}
