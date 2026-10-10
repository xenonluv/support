import { cn } from "@/lib/utils";
import { STATUS_META, type SignalStatus, type Tone } from "@/lib/status";

const TONE_CLASS: Record<Tone, string> = {
  caution: "bg-caution-soft text-caution",
  observe: "bg-observe-soft text-observe",
  normal: "bg-normal-soft text-normal",
  neutral: "bg-secondary text-secondary-foreground",
};

export function ToneBadge({
  tone,
  children,
  className,
}: {
  tone: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md px-2 py-0.5 text-xs font-semibold whitespace-nowrap",
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: SignalStatus }) {
  const meta = STATUS_META[status];
  return <ToneBadge tone={meta.tone}>{meta.label}</ToneBadge>;
}
