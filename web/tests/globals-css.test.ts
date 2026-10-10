import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

describe("globals.css", () => {
  // 자기 자신을 참조하는 CSS 변수는 무효가 되어, 그 변수를 쓰는 글꼴·색이 브라우저 기본값으로 떨어진다.
  it("CSS 변수가 자기 자신을 참조하지 않는다", () => {
    const selfRefs = [...css.matchAll(/(--[\w-]+)\s*:\s*var\(\s*\1\s*[,)]/g)].map((m) => m[0]);
    expect(selfRefs).toEqual([]);
  });

  it("상태색(주의·관찰·정상)과 강조 카드 색 토큰이 정의되고 Tailwind 색으로 연결된다", () => {
    const names = [
      "caution",
      "caution-soft",
      "observe",
      "observe-soft",
      "normal",
      "normal-soft",
      "highlight",
      "highlight-foreground",
    ];
    for (const name of names) {
      expect(css, name).toMatch(new RegExp(`\\n\\s*--${name}:\\s*oklch\\(`));
      expect(css, name).toContain(`--color-${name}: var(--${name});`);
    }
  });

  // 기본값(break-all 성격)에서는 "확인/되어"처럼 한국어 단어 중간에서 줄이 바뀐다.
  it("본문은 한국어 단어 단위로 줄바꿈하고(keep-all), 아주 긴 문자열만 강제로 끊는다", () => {
    const body = css.match(/\n\s*body\s*\{\s*@apply([^;]*);/)?.[1] ?? "";
    expect(body).toMatch(/\bbreak-keep\b/);
    expect(body).toMatch(/\bwrap-break-word\b/);
  });

  it("본문 글꼴은 Pretendard를 먼저 쓰고, 못 받으면 기기 고딕체(sans-serif)로 떨어진다", () => {
    const value = css.match(/--font-sans:\s*([^;]+);/)?.[1].trim() ?? "";
    expect(value.startsWith('"Pretendard Variable"')).toBe(true);
    expect(value.endsWith("sans-serif")).toBe(true);
  });
});
