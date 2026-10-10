/**
 * 초안이 얼마나 고쳐졌는지(0=그대로, 1=전부 바뀜). 수용률 측정에 쓴다.
 * 편집 거리(레벤슈타인)를 긴 쪽 글자 수로 나누고 소수 셋째 자리로 반올림한다.
 */
export function editRatio(before: string, after: string): number {
  const a = [...before];
  const b = [...after];
  const longest = Math.max(a.length, b.length);
  if (longest === 0) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const curr = [i];
    for (let j = 1; j <= b.length; j++) {
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = curr;
  }
  return Math.round((prev[b.length] / longest) * 1000) / 1000;
}
