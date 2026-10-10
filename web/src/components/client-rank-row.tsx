import Link from "next/link";
import { cn } from "@/lib/utils";
import { clientLabel, type ClientDisplay } from "@/lib/client-label";
import { STATUS_META, type SignalStatus } from "@/lib/status";
import { Button } from "@/components/ui/button";
import { StatusBadge, ToneBadge } from "@/components/tone-badge";

export type SummarySegment = { text: string; emphasis?: boolean };

export type PriorityItem = {
  client: ClientDisplay;
  summary: readonly SummarySegment[];
  status: SignalStatus;
  agencyCount: number;
};

const RANK_CLASS: Record<SignalStatus, string> = {
  caution: "bg-caution text-white",
  observe: "bg-observe-soft text-observe",
  resolved: "bg-normal-soft text-normal",
};

export function ClientRankRow({
  rank,
  href,
  client,
  summary,
  status,
  agencyCount,
}: PriorityItem & { rank: number; href: string }) {
  const label = clientLabel(client);
  return (
    <li
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card p-4",
        rank === 1 && STATUS_META[status].tone === "caution" && "border-caution/30 bg-caution-soft/50",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg text-base font-bold",
          RANK_CLASS[status],
        )}
      >
        {rank}
      </span>
      <Link href={href} className="min-w-0 shrink-0 rounded-md hover:underline lg:w-40">
        <p className="font-semibold">{label.title}</p>
        <p className="text-sm text-muted-foreground">{label.subtitle}</p>
      </Link>
      <p className="min-w-0 basis-full text-sm leading-relaxed break-keep lg:flex-1 lg:basis-0">
        {summary.map((s, i) =>
          s.emphasis ? (
            <strong key={i} className="font-semibold text-caution">
              {s.text}
            </strong>
          ) : (
            <span key={i}>{s.text}</span>
          ),
        )}
      </p>
      <div className="ml-auto flex items-center gap-2">
        <StatusBadge status={status} />
        <ToneBadge tone="neutral">{agencyCount}개 기관</ToneBadge>
        <Button variant="outline" size="sm" disabled title="인수인계 브리핑은 8단계에서 연결됩니다">
          브리핑
        </Button>
      </div>
    </li>
  );
}
