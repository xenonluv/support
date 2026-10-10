import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { AiNotice } from "@/components/ai-notice";
import { BriefingGenerator } from "@/components/briefing-generator";
import { CopyButton } from "@/components/copy-button";
import { ToneBadge } from "@/components/tone-badge";
import { formatBriefingText } from "@/lib/briefing/format";
import { getBriefingPage, type BriefingPageData } from "@/lib/briefing/data";
import { clientLabel } from "@/lib/client-label";
import { parseDays, PERIOD_OPTIONS } from "@/lib/dashboard/period";
import { seoulDateTime, seoulMonthDay } from "@/lib/records/dates";
import { FLAG_STATUS_LABEL } from "@/lib/status";
import { cn } from "@/lib/utils";
import type { BriefingContent } from "@/schemas/briefing";
import { SIGNAL_LABEL, SIGNAL_LEVEL_LABEL } from "@/schemas/signal";

type Props = PageProps<"/briefing/[clientId]">;

export default function BriefingPage({ params, searchParams }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
      <Link href="/briefing" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        브리핑 대상자
      </Link>
      <Suspense fallback={<p className="text-sm text-muted-foreground">기록을 모으는 중…</p>}>
        <Briefing params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Briefing({ params, searchParams }: Props) {
  const [{ clientId }, { days: raw }] = await Promise.all([params, searchParams]);
  const days = parseDays(raw);
  const data = await getBriefingPage(clientId, days);
  if (!data) notFound();
  const label = clientLabel(data.subject);
  const code = data.subject.code;

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <header className="flex items-start justify-between gap-3 bg-highlight px-5 pt-6 pb-8 text-highlight-foreground">
        <div>
          <h1 className="text-2xl font-bold">인수인계 브리핑</h1>
          <p className="mt-1 text-sm text-highlight-foreground/80">
            {label.title} 어르신 · {label.subtitle}
          </p>
        </div>
        <ClipboardList className="size-6 shrink-0" aria-hidden="true" />
      </header>
      <div className="-mt-4 flex flex-col gap-4 rounded-t-2xl bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium">{data.period.label}</p>
          <nav aria-label="기간" className="flex gap-1 rounded-lg border bg-card p-1">
            {PERIOD_OPTIONS.map((d) => (
              <Link
                key={d}
                href={`/briefing/${code}?days=${d}`}
                aria-current={d === days ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium",
                  d === days ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
                )}
              >
                {d}일
              </Link>
            ))}
          </nav>
        </div>

        <RecordFacts data={data} />
        <OpenSignals data={data} />

        <section aria-labelledby="ai-briefing" className="flex flex-col gap-3 rounded-xl bg-muted p-4">
          <h2 id="ai-briefing" className="font-semibold">
            AI 브리핑
          </h2>
          {data.recordCount === 0 ? (
            <p className="text-sm text-muted-foreground">이 기간에는 기록이 없어요. 기간을 늘려 보세요.</p>
          ) : (
            <>
              {data.latest ? (
                <>
                  <p className="text-xs text-muted-foreground">{seoulDateTime(data.latest.createdAt)}에 만듦</p>
                  {data.latest.newerRecords > 0 && (
                    <p className="rounded-lg border border-observe/30 bg-observe-soft px-3 py-2 text-sm text-observe">
                      만든 뒤 새 기록이 {data.latest.newerRecords}건 들어왔어요. 다시 만들면 반영돼요.
                    </p>
                  )}
                  {data.latest.content ? (
                    <BriefingBody content={data.latest.content} />
                  ) : (
                    <p className="rounded-lg border bg-card p-3 text-sm leading-relaxed whitespace-pre-wrap">{data.latest.raw}</p>
                  )}
                </>
              ) : (
                <p className="text-sm leading-relaxed text-muted-foreground break-keep">
                  기록 {data.recordCount}건을 기관 구분 없이 모아 요약해요. 10초 안팎 걸려요.
                </p>
              )}
              <div className={cn("grid items-start gap-2", data.latest?.content && "grid-cols-2")}>
                <BriefingGenerator clientCode={code} days={days} recordCount={data.recordCount} again={Boolean(data.latest)} />
                {data.latest?.content && (
                  <CopyButton
                    text={formatBriefingText({ subject: data.subject, period: data.period, content: data.latest.content, signals: data.signals })}
                  />
                )}
              </div>
            </>
          )}
        </section>
        <AiNotice className="py-2" />
      </div>
    </div>
  );
}

function RecordFacts({ data }: { data: BriefingPageData }) {
  return (
    <section aria-label="기록 현황" className="rounded-xl border p-4">
      <p className="font-semibold">
        기록 {data.recordCount}건 · 기관 {data.agencies.length}곳
        {data.lastVisitedAt && <span className="font-normal text-muted-foreground"> · 마지막 방문 {seoulMonthDay(data.lastVisitedAt)}</span>}
      </p>
      {data.agencies.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-2">
          {data.agencies.map((a) => (
            <li key={a.name}>
              <ToneBadge tone="neutral">
                {a.name} {a.count}건
              </ToneBadge>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function OpenSignals({ data }: { data: BriefingPageData }) {
  return (
    <section aria-labelledby="open-signals" className="rounded-xl border p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 id="open-signals" className="font-semibold">
          미해결 이상징후
        </h2>
        {data.signals.length > 0 && (
          <Link href={`/signals/${data.subject.code}`} className="text-sm font-medium text-primary hover:underline">
            상태 바꾸기
          </Link>
        )}
      </div>
      {data.signals.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">해소되지 않은 신호가 없어요.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-2">
          {data.signals.map((s) => (
            <li key={s.type} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{SIGNAL_LABEL[s.type]}</span>
              <ToneBadge tone={s.level === "caution" ? "caution" : "observe"}>{SIGNAL_LEVEL_LABEL[s.level]}</ToneBadge>
              <span className="text-muted-foreground">
                {s.isNew ? "신규" : `${s.days}일째`} · {FLAG_STATUS_LABEL[s.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function BriefingBody({ content }: { content: BriefingContent }) {
  return (
    <div className="flex flex-col gap-4 rounded-lg border bg-card p-4 text-sm leading-relaxed">
      <p className="text-base break-keep">{content.overview}</p>
      {content.changes.length > 0 && (
        <div>
          <h3 className="font-semibold">주요 변화</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {content.changes.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}
      {content.by_agency.length > 0 && (
        <div>
          <h3 className="font-semibold">기관별 내용</h3>
          <dl className="mt-1 flex flex-col gap-2">
            {content.by_agency.map((a) => (
              <div key={a.agency}>
                <dt className="font-medium text-primary">{a.agency}</dt>
                <dd>{a.summary}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
      {content.follow_ups.length > 0 && (
        <div>
          <h3 className="font-semibold">이어서 확인할 일</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5">
            {content.follow_ups.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
