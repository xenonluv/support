import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mic } from "lucide-react";
import { AiNotice } from "@/components/ai-notice";
import { SignalSummary } from "@/components/signal-summary";
import { ToneBadge } from "@/components/tone-badge";
import { buttonVariants } from "@/components/ui/button";
import { clientLabel } from "@/lib/client-label";
import { seoulDate, seoulMonthDay } from "@/lib/records/dates";
import { cn } from "@/lib/utils";
import { getClientSituation } from "@/lib/visits/data";
import { formatRecordText } from "@/schemas/record-draft";

/** 대상자 상황(현장 인력, 읽기 전용): 해소 안 된 신호와 함께 돌보는 모든 기관의 최근 기록 */
export default function ClientSituationPage({ params }: PageProps<"/visits/[clientId]">) {
  return (
    <div className="flex flex-col gap-4">
      <Link href="/visits" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        오늘의 방문
      </Link>
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
        <Situation params={params} />
      </Suspense>
    </div>
  );
}

async function Situation({ params }: Pick<PageProps<"/visits/[clientId]">, "params">) {
  const { clientId } = await params;
  const data = await getClientSituation(clientId);
  if (!data) notFound();
  const label = clientLabel(data);

  return (
    <>
      <div>
        <h1 className="text-xl font-bold">{label.title}</h1>
        <p className="text-sm text-muted-foreground">{label.subtitle} · 함께 돌보는 기관의 기록을 모아 봐요</p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">아직 해결 안 된 이상징후</h2>
        {data.signals.length === 0 ? (
          <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">확인 중인 신호가 없어요.</p>
        ) : (
          <>
            {data.signals.map((s) => (
              <article key={s.type} className="rounded-xl border bg-card p-4">
                <SignalSummary signal={s} />
              </article>
            ))}
            <p className="text-xs text-muted-foreground">확인·해소 처리는 동 담당자가 해요. 방문 때 달라진 점이 있으면 기록에 남겨 주세요.</p>
          </>
        )}
        <AiNotice className="justify-start" />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-bold">최근 기록 (함께 돌보는 기관 모두)</h2>
        {data.records.length === 0 ? (
          <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">아직 기록이 없어요.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {data.records.map((r) => (
              <li key={r.id} className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">
                    {seoulMonthDay(r.visitedAt)} · <span className="font-normal text-muted-foreground">{r.agency}</span>
                  </p>
                  {r.mine && <ToneBadge tone="normal">내 기록</ToneBadge>}
                </div>
                <p className="text-sm leading-relaxed">{r.final.summary || "(요약 없음)"}</p>
                <details className="text-sm">
                  <summary className="cursor-pointer text-muted-foreground">전체 보기</summary>
                  <pre className="mt-2 font-sans leading-relaxed whitespace-pre-wrap">
                    {formatRecordText(r.final, { clientCode: data.code, date: seoulDate(r.visitedAt) })}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        )}
      </section>

      {data.closed ? (
        <p className="rounded-xl border bg-muted p-4 text-center text-sm">종결된 대상자예요. 새 기록은 남기지 않아요.</p>
      ) : (
        <Link href={`/record?client=${data.code}`} className={cn(buttonVariants({ size: "lg" }), "h-12 w-full text-base")}>
          <Mic aria-hidden="true" />
          기록하기
        </Link>
      )}
    </>
  );
}
