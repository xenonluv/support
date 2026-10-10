import { HeartPulse } from "lucide-react";
import { cn } from "@/lib/utils";

export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("flex items-center gap-2 text-lg font-bold", className)}>
      <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-white">
        <HeartPulse className="size-5" aria-hidden="true" />
      </span>
      돌봄이음
    </span>
  );
}
