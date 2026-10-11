import { ToneBadge } from "@/components/tone-badge";
import type { ClientSignal } from "@/lib/dashboard/build";
import { FLAG_STATUS_LABEL } from "@/lib/status";
import { SIGNAL_LABEL } from "@/schemas/signal";

/** 신호 하나의 표시(종류·처리 상태·지속 일수·근거). 관리자 신호 카드와 현장 대상자 상황 화면이 함께 쓴다. */
export function SignalSummary({ signal }: { signal: ClientSignal }) {
  const resolved = signal.status === "resolved";
  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold">{SIGNAL_LABEL[signal.type]}</h3>
        <span className="flex gap-1.5">
          <ToneBadge tone="neutral">{FLAG_STATUS_LABEL[signal.status]}</ToneBadge>
          <ToneBadge tone={resolved ? "normal" : signal.level === "caution" ? "caution" : "observe"}>
            {resolved ? "해소" : signal.isNew ? "신규" : `${signal.days}일째`}
          </ToneBadge>
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">“{signal.evidence}”</p>
      {signal.agencyCount > 1 && <p className="mt-1 text-xs font-medium text-caution">{signal.agencyCount}개 기관에서 관찰</p>}
    </>
  );
}
