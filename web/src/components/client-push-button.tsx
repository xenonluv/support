"use client";

import { useState, useTransition } from "react";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { sendClientAlert } from "@/lib/push/actions";

/** 관리자 → 이 대상자와 연결된 모든 기관 현장인력의 휴대폰으로 "확인 필요" 알림 */
export function ClientPushButton({ clientId, lastSent }: { clientId: string; lastSent: string | null }) {
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function send() {
    if (!window.confirm("이 대상자를 함께 돌보는 모든 기관의 현장 인력에게 알림을 보낼까요?\n알림에는 이름·식별번호가 나가지 않아요.")) return;
    setMessage(null);
    startTransition(async () => {
      const result = await sendClientAlert(clientId);
      setMessage(result.ok ? { ok: true, text: result.message } : { ok: false, text: result.error });
    });
  }

  return (
    <section aria-labelledby="push-alert-heading" className="flex flex-col gap-2 rounded-xl border p-4 text-sm">
      <h2 id="push-alert-heading" className="font-semibold">
        현장 인력에게 알리기
      </h2>
      <p className="text-muted-foreground">
        휴대폰으로 &ldquo;확인이 필요한 대상자가 있습니다&rdquo; 알림이 가고, 누르면 이 대상자의 상황 화면이 열려요. 급한 일은 전화로 연락해 주세요.
      </p>
      <Button onClick={send} disabled={pending} className="h-11">
        <BellRing aria-hidden="true" />
        {pending ? "보내는 중…" : "현장 인력에게 알림"}
      </Button>
      {message && (
        <p role="status" className={message.ok ? "text-normal" : "text-caution"}>
          {message.text}
        </p>
      )}
      {lastSent && <p className="text-xs text-muted-foreground">최근 보낸 알림: {lastSent}</p>}
    </section>
  );
}
