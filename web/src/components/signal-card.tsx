import type { Tone } from "@/lib/status";
import { ToneBadge } from "@/components/tone-badge";

export type SignalCardProps = {
  name: string;
  badge: { label: string; tone: Tone };
  detail: string;
};

export function SignalCard({ name, badge, detail }: SignalCardProps) {
  return (
    <article className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{name}</h3>
        <ToneBadge tone={badge.tone}>{badge.label}</ToneBadge>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </article>
  );
}
