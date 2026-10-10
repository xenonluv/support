import { describe, expect, it } from "vitest";
import { getDemoAlert } from "@/lib/demo";

describe("getDemoAlert", () => {
  it("있는 식별번호면 알림을 돌려준다", () => {
    expect(getDemoAlert("C-0012")?.client.code).toBe("C-0012");
  });

  // 일반 객체 조회는 "constructor" 같은 주소에서 내장 속성을 돌려줘 404 대신 오류 화면이 난다.
  it("객체 내장 속성 이름(constructor, __proto__, toString)은 없는 대상자로 본다", () => {
    for (const id of ["constructor", "__proto__", "toString", "C-9999"]) {
      expect(getDemoAlert(id), id).toBeUndefined();
    }
  });
});
