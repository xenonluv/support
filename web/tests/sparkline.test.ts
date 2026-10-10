import { describe, expect, it } from "vitest";
import { toBars, toLinePath } from "@/lib/sparkline";

describe("toLinePath", () => {
  it("값이 없으면 빈 경로", () => {
    expect(toLinePath([], 100, 20)).toBe("");
  });

  it("가장 작은 값은 아래(여백 2), 가장 큰 값은 위(여백 2)에 놓는다", () => {
    expect(toLinePath([0, 5, 10], 100, 20)).toBe("M0 18 L50 10 L100 2");
  });

  it("값이 모두 같으면 가운데 수평선", () => {
    expect(toLinePath([5, 5, 5], 100, 20)).toBe("M0 10 L50 10 L100 10");
  });

  it("값이 하나면 가운데 수평선을 끝까지 긋는다", () => {
    expect(toLinePath([7], 100, 20)).toBe("M0 10 L100 10");
  });
});

describe("toBars", () => {
  it("값이 없으면 막대도 없다", () => {
    expect(toBars([], 10, 20)).toEqual([]);
  });

  it("가장 큰 값이 상자 높이를 채우고 막대 사이에 간격을 둔다", () => {
    expect(toBars([1, 2], 10, 20, 2)).toEqual([
      { x: 0, y: 10, width: 4, height: 10 },
      { x: 6, y: 0, width: 4, height: 20 },
    ]);
  });

  it("값이 모두 0이면 높이 0 막대", () => {
    expect(toBars([0, 0], 10, 20, 2).map((b) => b.height)).toEqual([0, 0]);
  });
});
