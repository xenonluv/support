import { ToneBadge } from "@/components/tone-badge";

/** 내가 쓴 기록(또는 내가 기록을 남긴 대상자) 카드에 더하는 표시. 왼쪽 띠는 안쪽 그림자라 내용 위치가 그대로다 */
export const MINE_CARD = "border-primary/40 bg-accent shadow-[inset_4px_0_0_var(--color-primary)]";

export function MineBadge({ count }: { count?: number }) {
  return (
    <ToneBadge tone="neutral" className="bg-card text-primary ring-1 ring-primary/30">
      내가 쓴 기록{count ? ` ${count}건` : ""}
    </ToneBadge>
  );
}
