export type Bar = { x: number; y: number; width: number; height: number };

// 선 굵기만큼 위아래 여백을 둬 선이 잘리지 않게 한다
const PAD = 2;

/** 값 목록을 width×height 상자 안의 꺾은선 SVG path로 바꾼다. */
export function toLinePath(values: readonly number[], width: number, height: number): string {
  if (values.length === 0) return "";
  const ys = scaleY(values, height);
  if (values.length === 1) return `M0 ${ys[0]} L${width} ${ys[0]}`;
  const step = width / (values.length - 1);
  return ys.map((y, i) => `${i === 0 ? "M" : "L"}${round(i * step)} ${y}`).join(" ");
}

/** 값 목록을 막대 좌표로 바꾼다. 가장 큰 값이 상자 높이를 채운다. */
export function toBars(values: readonly number[], width: number, height: number, gap = 2): Bar[] {
  if (values.length === 0) return [];
  const max = Math.max(...values, 0);
  const barWidth = (width - gap * (values.length - 1)) / values.length;
  return values.map((v, i) => {
    const h = max === 0 ? 0 : round((Math.max(v, 0) / max) * height);
    return { x: round(i * (barWidth + gap)), y: round(height - h), width: round(barWidth), height: h };
  });
}

function scaleY(values: readonly number[], height: number): number[] {
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) return values.map(() => round(height / 2));
  const usable = height - PAD * 2;
  return values.map((v) => round(PAD + (1 - (v - min) / (max - min)) * usable));
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
