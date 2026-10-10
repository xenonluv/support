import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("뒤에 오는 Tailwind 클래스가 충돌하는 앞 클래스를 덮어쓴다", () => {
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });

  it("거짓 값은 무시한다", () => {
    expect(cn("text-sm", false, undefined, "font-bold")).toBe("text-sm font-bold");
  });
});
