"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { copyText } from "@/lib/clipboard";
import { cn } from "@/lib/utils";

type State = "idle" | "copied" | "failed";

export function CopyButton({ text, className, onCopied }: { text: string; className?: string; onCopied?: () => void }) {
  const [state, setState] = useState<State>("idle");

  async function handleClick() {
    if (await copyText(text)) {
      setState("copied");
      onCopied?.();
      setTimeout(() => setState("idle"), 2000);
    } else {
      // 실패 안내는 다음 시도 전까지 남겨 둔다
      setState("failed");
    }
  }

  return (
    <div className="flex flex-col gap-1">
      <Button size="lg" onClick={handleClick} className={cn("h-11 text-base", className)}>
        {state === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        {state === "copied" ? "복사됨" : "복사"}
      </Button>
      <p role="status" className="text-xs text-caution">
        {state === "failed" ? "복사하지 못했습니다. 문안을 길게 눌러 직접 복사하세요." : ""}
      </p>
    </div>
  );
}
