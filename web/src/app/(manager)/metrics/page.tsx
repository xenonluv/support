import { Suspense } from "react";
import { ToneBadge } from "@/components/tone-badge";
import type { Kpi } from "@/lib/metrics/compute";
import { getAgencyMetrics } from "@/lib/metrics/data";
import { MINOR_EDIT_MAX, TIME_OUTLIER_MINUTES } from "@/lib/metrics/targets";

export default function MetricsPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        돌봄이음 <span aria-hidden="true">/</span> <span className="font-medium text-primary">성과 지표</span>
      </p>
      <Suspense fallback={<p className="text-sm text-muted-foreground">지표를 계산하는 중…</p>}>
        <MetricsContent />
      </Suspense>
    </div>
  );
}

const MET = {
  true: { tone: "normal", label: "달성" },
  false: { tone: "caution", label: "미달" },
  null: { tone: "neutral", label: "판단 전" },
} as const;

function KpiCard({ kpi }: { kpi: Kpi }) {
  const met = MET[String(kpi.met) as keyof typeof MET];
  return (
    <article className="flex flex-col gap-2 rounded-xl border bg-card p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">{kpi.label}</h2>
        <ToneBadge tone={met.tone}>{met.label}</ToneBadge>
      </div>
      <p className="text-2xl font-bold break-keep">{kpi.value}</p>
      <p className="text-sm text-muted-foreground">목표: {kpi.target}</p>
    </article>
  );
}

async function MetricsContent() {
  const data = await getAgencyMetrics();
  if (!data) return <p className="text-sm text-muted-foreground">직원 정보를 찾지 못했습니다.</p>;
  const { metrics: m } = data;
  const percent = (n: number) => `${Math.round(n * 100)}%`;

  return (
    <>
      <header>
        <h1 className="text-2xl font-bold lg:text-3xl">성과 지표</h1>
        <p className="mt-1 text-sm text-muted-foreground break-keep">
          {data.agencyName} 파일럿 참여자 {data.pilotWorkers}명의 기록 기준
          {m.firstDay && m.lastDay && ` · ${m.firstDay} ~ ${m.lastDay}`}
        </p>
      </header>
      {data.pilotWorkers === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-sm leading-relaxed text-muted-foreground break-keep">
          아직 이 기관에 파일럿 참여자 계정이 없어요. 파일럿 계정을 발급하면 그분들이 남긴 기록부터 집계합니다. 시험 계정과 시연
          데이터는 세지 않습니다.
        </p>
      ) : m.records === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">파일럿 참여자의 기록이 아직 없어요.</p>
      ) : null}

      <section aria-label="성과지표" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {m.kpis.map((k) => (
          <KpiCard key={k.key} kpi={k} />
        ))}
      </section>

      <section aria-labelledby="acceptance-detail" className="rounded-xl border bg-card p-5 text-sm leading-relaxed">
        <h2 id="acceptance-detail" className="font-semibold">
          수용률 내역
        </h2>
        <p className="mt-2">
          AI 초안 기록 {m.acceptance.aiDrafted}건 중 그대로 저장 {m.acceptance.unchanged}건 · 경미 수정(글자 {percent(MINOR_EDIT_MAX)}{" "}
          이하) {m.acceptance.minor}건 · 많이 수정 {m.acceptance.major}건
        </p>
        <p className="mt-1 text-muted-foreground">
          &lsquo;AI 없이 직접 작성&rsquo;한 기록 {m.records - m.acceptance.aiDrafted}건은 수용률에서 뺐어요.
        </p>
      </section>

      <section aria-labelledby="time-detail" className="rounded-xl border bg-card p-5 text-sm leading-relaxed">
        <h2 id="time-detail" className="font-semibold">
          작성시간 내역
        </h2>
        <p className="mt-2">
          {m.writingTime.averageMinutes === null
            ? "작성시간이 기록된 기록이 없어요."
            : `평균 ${m.writingTime.averageMinutes.toFixed(1)}분 · 중앙값 ${m.writingTime.medianMinutes!.toFixed(1)}분 (${m.writingTime.counted}건)`}
        </p>
        <p className="mt-1 text-muted-foreground break-keep">
          녹음·입력을 시작해서 저장할 때까지의 시간입니다. {TIME_OUTLIER_MINUTES}분을 넘긴 {m.writingTime.excluded}건은 화면을 열어 둔
          경우로 보고 평균에서 뺐어요.{" "}
          {data.baselineMinutes === null ? "기존 작성시간(사전조사)이 아직 입력되지 않았어요." : `기존 작성시간 ${data.baselineMinutes}분과 비교합니다.`}
        </p>
      </section>
    </>
  );
}
