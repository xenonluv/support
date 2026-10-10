import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/status";
import { Sparkline } from "@/components/sparkline";

export type StatCardProps = {
  label: string;
  value: number | string;
  caption: string;
  tone: Tone | "highlight";
  trend: readonly number[];
  trendKind?: "line" | "bar";
};

const TONE_TEXT: Record<StatCardProps["tone"], string> = {
  caution: "text-caution",
  observe: "text-observe",
  normal: "text-normal",
  neutral: "text-foreground",
  highlight: "text-highlight-foreground",
};

export function StatCard({ label, value, caption, tone, trend, trendKind = "line" }: StatCardProps) {
  const highlight = tone === "highlight";
  return (
    <section
      className={cn(
        "flex items-end justify-between gap-3 rounded-xl border p-5 shadow-sm",
        highlight ? "border-transparent bg-highlight text-highlight-foreground" : "bg-card",
      )}
    >
      <div className="min-w-0">
        <h3 className={cn("text-sm font-semibold", TONE_TEXT[tone])}>{label}</h3>
        <p className={cn("mt-2 text-4xl font-bold tabular-nums", TONE_TEXT[tone])}>{value}</p>
        <p className={cn("mt-1 text-sm", highlight ? "text-highlight-foreground/80" : "text-muted-foreground")}>
          {caption}
        </p>
      </div>
      <Sparkline values={trend} kind={trendKind} className={cn("shrink-0", TONE_TEXT[tone])} />
    </section>
  );
}
