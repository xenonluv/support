import type { SummarySegment } from "@/components/client-rank-row";
import type { ClientSignal, ClientStatus } from "@/lib/dashboard/build";
import { SIGNAL_LABEL } from "@/schemas/signal";

/** "먼저 확인할 어르신" 한 줄 요약. 주의 신호와 새 신호는 강조한다. */
export function signalSummary(signals: readonly ClientSignal[], status: ClientStatus): SummarySegment[] {
  if (status === "resolved") {
    return [{ text: `${signals.map((s) => SIGNAL_LABEL[s.type]).join(", ")} 해소 — 정상 범위로 돌아옴` }];
  }
  const segments: SummarySegment[] = [];
  signals.forEach((s, i) => {
    if (i > 0) segments.push({ text: " · " });
    const text = `${SIGNAL_LABEL[s.type]} ${s.isNew ? "신규" : `${s.days}일째`}`;
    segments.push(s.level === "caution" || s.isNew ? { text, emphasis: true } : { text });
  });
  return segments;
}
