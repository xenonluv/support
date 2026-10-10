import { cn } from "@/lib/utils";
import { toBars, toLinePath } from "@/lib/sparkline";

const W = 112;
const H = 40;

/** 작은 추이 그래프. 장식용이라 화면낭독기에서는 숨긴다(수치는 옆 글자로 제공). */
export function Sparkline({
  values,
  kind = "line",
  className,
}: {
  values: readonly number[];
  kind?: "line" | "bar";
  className?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={cn("h-10 w-28", className)}
    >
      {kind === "line" ? (
        <path
          d={toLinePath(values, W, H)}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ) : (
        toBars(values, W, H, 4).map((b, i) => (
          <rect key={i} {...b} rx={1.5} fill="currentColor" opacity={0.35 + (0.65 * (i + 1)) / values.length} />
        ))
      )}
    </svg>
  );
}
