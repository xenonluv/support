import { describe, expect, it } from "vitest";
import { editRatio } from "@/lib/records/edit-ratio";

describe("editRatio", () => {
  it("그대로면 0, 완전히 다르면 1", () => {
    expect(editRatio("점심을 드셨음", "점심을 드셨음")).toBe(0);
    expect(editRatio("abc", "xyz")).toBe(1);
    expect(editRatio("", "")).toBe(0);
  });

  it("고친 글자 수를 긴 쪽 길이로 나눈다 (소수 셋째 자리)", () => {
    expect(editRatio("점심을 드셨음", "점심을 다 드셨음")).toBe(0.222); // 2글자 추가 / 9
    expect(editRatio("abcd", "abce")).toBe(0.25);
  });
});
