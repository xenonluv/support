import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

export function AiNotice({ className }: { className?: string }) {
  return (
    <p className={cn("flex items-center justify-center gap-1.5 text-xs text-muted-foreground", className)}>
      <Info className="size-3.5 shrink-0" aria-hidden="true" />
      AI는 판정하지 않고, 담당자에게 확인을 요청합니다
    </p>
  );
}
