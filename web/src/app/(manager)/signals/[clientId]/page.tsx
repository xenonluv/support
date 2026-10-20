import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bell } from "lucide-react";
import { AiNotice } from "@/components/ai-notice";
import { AlertDraft } from "@/components/alert-draft";
import { ClientPushButton } from "@/components/client-push-button";
import { SignalStatusCard } from "@/components/signal-status-card";
import { ToneBadge } from "@/components/tone-badge";
import { clientLabel } from "@/lib/client-label";
import { getClientDetail } from "@/lib/dashboard/data";
import { vapidPublicKey } from "@/lib/push/send";
import { seoulDateTime } from "@/lib/records/dates";

const HEADLINE = { caution: "확인이 필요해요", observe: "지켜보는 중이에요", resolved: "해소됐어요" } as const;

export default function AlertDetailPage({ params }: PageProps<"/signals/[clientId]">) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      <Link href="/signals" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        이상징후 현황
      </Link>
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
        <Detail params={params} />
      </Suspense>
    </div>
  );
}

async function Detail({ params }: Pick<PageProps<"/signals/[clientId]">, "params">) {
  const { clientId } = await params;
  const detail = await getClientDetail(clientId);
  if (!detail) notFound();
  const label = clientLabel(detail);
  const item = detail.item;
  const active = item && item.status !== "resolved" ? item.signals : [];

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <header className="flex items-start justify-between gap-3 bg-highlight px-5 pt-6 pb-8 text-highlight-foreground">
        <div>
          <h1 className="text-2xl font-bold">{item ? HEADLINE[item.status] : "확인할 신호가 없어요"}</h1>
          <p className="mt-1 text-sm text-highlight-foreground/80">
            {label.title} 어르신 · {label.subtitle}
          </p>
        </div>
        <Bell className="size-6 shrink-0" aria-hidden="true" />
      </header>
      <div className="-mt-4 flex flex-col gap-3 rounded-t-2xl bg-card p-4">
        {active.length >= 2 && (
          <section className="rounded-xl border border-caution/20 bg-caution-soft p-4">
            <div className="flex flex-wrap gap-2">
              {item?.status === "caution" && <ToneBadge tone="caution">주의 필요</ToneBadge>}
              <ToneBadge tone="neutral">신호 {active.length}건 동시</ToneBadge>
            </div>
            <h2 className="mt-2 font-bold text-caution">여러 신호가 같은 시기에 겹칩니다</h2>
            <p className="mt-1 text-sm leading-relaxed">
              하나씩 보면 지나칠 수 있지만, 함께 보면 연계가 필요할 수 있어요.
              {item && item.agencyCount > 1 && ` ${item.agencyCount}개 기관의 기록에서 나왔어요.`}
            </p>
          </section>
        )}
        {item?.signals.map((s) => <SignalStatusCard key={s.type} clientCode={detail.code} signal={s} seenAt={detail.asOf} />)}
        {detail.alert && item && item.status !== "resolved" && (
          <AlertDraft initialText={detail.alert.body} alertId={detail.alert.id} copiedAt={detail.alert.copiedAt} />
        )}
        {vapidPublicKey() && (
          <ClientPushButton
            clientId={detail.id}
            lastSent={
              detail.lastPush
                ? `${seoulDateTime(detail.lastPush.createdAt)}${detail.lastPush.delivered !== null ? ` · 기기 ${detail.lastPush.delivered}대로 발송` : ""}`
                : null
            }
          />
        )}
        <AiNotice className="py-2" />
      </div>
    </div>
  );
}
