import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bell } from "lucide-react";
import { AiNotice } from "@/components/ai-notice";
import { AlertDraft } from "@/components/alert-draft";
import { SignalCard } from "@/components/signal-card";
import { ToneBadge } from "@/components/tone-badge";
import { clientLabel } from "@/lib/client-label";
import { DEMO_ALERTS, getDemoAlert } from "@/lib/demo";

export function generateStaticParams() {
  return Object.keys(DEMO_ALERTS).map((clientId) => ({ clientId }));
}

export default async function AlertDetailPage({ params }: PageProps<"/signals/[clientId]">) {
  const { clientId } = await params;
  const alert = getDemoAlert(clientId);
  if (!alert) notFound();
  const label = clientLabel(alert.client);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      <Link href="/signals" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        이상징후 현황
      </Link>
      <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
        <header className="flex items-start justify-between gap-3 bg-highlight px-5 pt-6 pb-8 text-highlight-foreground">
          <div>
            <h1 className="text-2xl font-bold">확인이 필요해요</h1>
            <p className="mt-1 text-sm text-highlight-foreground/80">
              {label.title} 어르신 · {alert.recordedAt}
            </p>
          </div>
          <Bell className="size-6 shrink-0" aria-hidden="true" />
        </header>
        <div className="-mt-4 flex flex-col gap-3 rounded-t-2xl bg-card p-4">
          {alert.overlap && (
            <section className="rounded-xl border border-caution/20 bg-caution-soft p-4">
              <div className="flex flex-wrap gap-2">
                <ToneBadge tone="caution">주의 필요</ToneBadge>
                <ToneBadge tone="neutral">신호 {alert.signals.length}건 동시</ToneBadge>
              </div>
              <h2 className="mt-2 font-bold text-caution">{alert.overlap.title}</h2>
              <p className="mt-1 text-sm leading-relaxed">{alert.overlap.body}</p>
            </section>
          )}
          {alert.signals.map((s) => (
            <SignalCard key={s.name} {...s} />
          ))}
          <AlertDraft initialText={alert.draft} />
          <AiNotice className="py-2" />
        </div>
      </div>
    </div>
  );
}
