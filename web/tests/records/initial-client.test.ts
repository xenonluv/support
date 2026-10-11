import { describe, expect, it } from "vitest";
import { pickInitialClient } from "@/lib/records/initial-client";

const codes = ["C-0012", "C-0101"];

describe("기록 화면에서 처음 고를 대상자", () => {
  it("주소에 대상자가 없으면 화면이 정한다(첫 대상자)", () => {
    expect(pickInitialClient(null, codes, null)).toEqual({ code: null, notice: null });
  });

  it("지금 목록에 있는 번호면 그대로", () => {
    expect(pickInitialClient("C-0012", codes, null)).toEqual({ code: "C-0012", notice: null });
  });

  it("번호가 바뀌었으면 새 번호로 고르고 알린다", () => {
    expect(pickInitialClient("C-0047", codes, "C-0101")).toEqual({ code: "C-0101", notice: expect.stringContaining("C-0101") });
  });

  it("목록에 없으면(종결 등) 다른 어르신을 대신 고르지 않고 직접 고르게 한다", () => {
    expect(pickInitialClient("C-0047", codes, null)).toEqual({ code: "", notice: expect.stringContaining("C-0047") });
    expect(pickInitialClient("C-0047", codes, "C-0999")).toEqual({ code: "", notice: expect.stringContaining("직접 골라") });
  });
});
