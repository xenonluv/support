import { describe, expect, it } from "vitest";
import { formatBytes, formatDuration } from "@/lib/audio/format";

describe("formatDuration", () => {
  it("분:초로 쓴다", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(65_400)).toBe("1:05");
    expect(formatDuration(120_000)).toBe("2:00");
  });
});

describe("formatBytes", () => {
  it("B·KB·MB로 쓴다", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1_572_864)).toBe("1.5 MB");
  });
});
