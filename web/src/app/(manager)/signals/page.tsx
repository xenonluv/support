import { Suspense } from "react";
import Link from "next/link";
import { AiNotice } from "@/components/ai-notice";
import { ClientRankRow } from "@/components/client-rank-row";
import { StatCard } from "@/components/stat-card";
import { ToneBadge } from "@/components/tone-badge";
import { getDashboard } from "@/lib/dashboard/data";
import { parseDays, PERIOD_OPTIONS } from "@/lib/dashboard/period";
import { signalSummary } from "@/lib/dashboard/summary";
import { seoulDateTime } from "@/lib/records/dates";
import { cn } from "@/lib/utils";

export default function SignalsPage({ searchParams }: PageProps<"/signals">) {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        돌봄이음 <span aria-hidden="true">/</span> <span className="font-medium text-primary">이상징후 현황</span>
      </p>
      <Suspense fallback={<p className="text-sm text-muted-foreground">이상징후 현황을 불러오는 중…</p>}>
        <SignalsContent searchParams={searchParams} />
      </Suspense>
      <AiNotice className="pt-2" />
    </div>
  );
}

async function SignalsContent({ searchParams }: Pick<PageProps<"/signals">, "searchParams">) {
  const { days: raw } = await searchParams;
  const days = parseDays(raw);
  const dash = await getDashboard(days);
  const { stats } = dash;
  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">이상징후 현황</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {seoulDateTime(dash.asOf.toISOString())} 기준 · 오늘 접수된 기록 {dash.recordsToday}건
          </p>
          <p className="mt-3 text-lg font-semibold">
            오늘 {dash.totalClients}명 중 먼저 볼 {dash.priorityCount}명
          </p>
        </div>
        <nav aria-label="기간" className="flex gap-1 rounded-lg border bg-card p-1">
          {PERIOD_OPTIONS.map((d) => (
            <Link
              key={d}
              href={`/signals?days=${d}`}
              aria-current={d === days ? "page" : undefined}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                d === days ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              최근 {d}일
            </Link>
          ))}
        </nav>
      </header>
      <section aria-label="요약" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="주의 필요" value={stats.caution.value} caption="먼저 확인 권장" tone="caution" trend={stats.caution.trend} />
        <StatCard label="관찰 지속" value={stats.observe.value} caption="추이 지켜보기" tone="observe" trend={stats.observe.trend} />
        <StatCard label="특이사항 없음" value={stats.normal.value} caption="확인할 신호 없음" tone="normal" trend={stats.normal.trend} />
        <StatCard
          label="이번 달 조기 발견"
          value={`${stats.earlyDetected.value}건`}
          caption="연계로 이어진 사례"
          tone="highlight"
          trend={stats.earlyDetected.trend}
          trendKind="bar"
        />
      </section>
      <section aria-labelledby="priority-heading" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="priority-heading" className="text-lg font-bold">
            먼저 확인할 어르신
            <span className="ml-2 text-sm font-normal text-muted-foreground">신호 수 · 지속 기간 · 관찰 기관 수 기준 정렬</span>
          </h2>
          <ToneBadge tone="neutral">{dash.priority.length}명</ToneBadge>
        </div>
        {dash.priority.length === 0 ? (
          <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">확인할 신호가 있는 어르신이 없습니다.</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {dash.priority.map((p, i) => (
              <ClientRankRow
                key={p.client.code}
                rank={i + 1}
                href={`/signals/${p.client.code}`}
                client={p.client}
                summary={signalSummary(p.signals, p.status)}
                status={p.status}
                agencyCount={p.agencyCount}
              />
            ))}
          </ol>
        )}
      </section>
    </>
  );
}
