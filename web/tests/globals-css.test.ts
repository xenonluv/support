import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8");

describe("globals.css", () => {
  // 자기 자신을 참조하는 CSS 변수는 무효가 되어, 그 변수를 쓰는 글꼴·색이 브라우저 기본값으로 떨어진다.
  it("CSS 변수가 자기 자신을 참조하지 않는다", () => {
    const selfRefs = [...css.matchAll(/(--[\w-]+)\s*:\s*var\(\s*\1\s*[,)]/g)].map((m) => m[0]);
    expect(selfRefs).toEqual([]);
  });
});
