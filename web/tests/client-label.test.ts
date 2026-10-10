import { describe, expect, it } from "vitest";
import { clientLabel } from "@/lib/client-label";

describe("clientLabel", () => {
  it("식별번호와 연령대를 제목, 동을 부제로 쓴다", () => {
    expect(clientLabel({ code: "C-0012", ageBand: 70, dong: "서구 화정1동" })).toEqual({
      title: "C-0012 · 70대",
      subtitle: "서구 화정1동",
    });
  });

  it("연령대를 모르면 식별번호만 쓴다", () => {
    expect(clientLabel({ code: "C-0012", ageBand: null, dong: "서구 화정1동" }).title).toBe("C-0012");
  });

  it("100세 이상은 '100세 이상'으로 쓴다", () => {
    expect(clientLabel({ code: "C-0100", ageBand: 100, dong: "서구 농성1동" }).title).toBe(
      "C-0100 · 100세 이상",
    );
  });
});
