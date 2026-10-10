import { describe, expect, it } from "vitest";
import { copyText } from "@/lib/clipboard";

describe("copyText", () => {
  it("클립보드에 쓰면 true", async () => {
    const written: string[] = [];
    const clipboard = { writeText: async (t: string) => void written.push(t) };
    expect(await copyText("알림 문안", clipboard)).toBe(true);
    expect(written).toEqual(["알림 문안"]);
  });

  it("브라우저가 거부하면 false", async () => {
    const clipboard = { writeText: async () => Promise.reject(new Error("NotAllowedError")) };
    expect(await copyText("알림 문안", clipboard)).toBe(false);
  });

  it("클립보드가 없는 환경이면 false", async () => {
    expect(await copyText("알림 문안", null)).toBe(false);
  });
});
