"use client";

import { useState, useTransition } from "react";
import { LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createBriefing } from "@/lib/briefing/actions";

/** [브리핑 만들기]·[다시 만들기]. 누를 때만 Claude를 부른다. 저장되면 서버가 화면을 새로 그린다. */
export function BriefingGenerator({
  clientCode,
  days,
  recordCount,
  again,
}: {
  clientCode: string;
  days: number;
  recordCount: number;
  again: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function generate() {
    setError(null);
    startTransition(async () => {
      const result = await createBriefing({ clientCode, days });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button size="lg" variant={again ? "outline" : "default"} className="h-11 text-base" disabled={pending} onClick={generate}>
        {pending ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Sparkles aria-hidden="true" />}
        {pending ? `기록 ${recordCount}건을 읽는 중…` : again ? "다시 만들기" : "브리핑 만들기"}
      </Button>
      <p role="status" className="text-sm text-caution">
        {error ?? ""}
      </p>
    </div>
  );
}
