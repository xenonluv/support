"use client";

import { useState, useTransition } from "react";
import { SignalSummary } from "@/components/signal-summary";
import type { ClientSignal } from "@/lib/dashboard/build";
import { updateSignalStatus } from "@/lib/dashboard/actions";
import { cn } from "@/lib/utils";
import type { SignalType } from "@/schemas/signal";

type Next = { status: "checked" | "acting" | "resolved"; linked?: boolean; label: string };
const ACTIONS: Next[] = [
  { status: "checked", label: "확인함" },
  { status: "acting", label: "조치 중" },
  { status: "resolved", label: "해소" },
  { status: "resolved", linked: true, label: "연계 후 해소" },
];

/** 알림 상세의 신호 카드. 관리자가 상태를 바꾼다(현장 인력은 RLS로 막힘). */
export function SignalStatusCard({ clientCode, signal, seenAt }: { clientCode: string; signal: ClientSignal; seenAt: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const resolved = signal.status === "resolved";

  function change(next: Next) {
    setError(null);
    startTransition(async () => {
      const result = await updateSignalStatus({ clientCode, type: signal.type as SignalType, status: next.status, linked: next.linked, seenAt });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <article className={cn("rounded-xl border bg-card p-4", resolved && "opacity-70")}>
      <SignalSummary signal={signal} />
      {!resolved && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {ACTIONS.filter((a) => a.status !== signal.status || a.status === "resolved").map((a) => (
            <button
              key={a.label}
              type="button"
              disabled={pending}
              onClick={() => change(a)}
              className="h-10 rounded-lg border bg-card text-sm font-medium hover:bg-muted disabled:opacity-50"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-caution">{error}</p>}
    </article>
  );
}
