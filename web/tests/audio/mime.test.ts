import { describe, expect, it } from "vitest";
import { audioFileName, pickMimeType } from "@/lib/audio/mime";

describe("pickMimeType", () => {
  it("webm/opus를 지원하면(안드로이드 크롬 등) 그것을 고른다", () => {
    expect(pickMimeType(() => true)).toBe("audio/webm;codecs=opus");
  });

  it("mp4만 지원하면(아이폰 사파리 등) mp4를 고른다", () => {
    expect(pickMimeType((t) => t === "audio/mp4")).toBe("audio/mp4");
  });

  it("아무것도 지원하지 않으면 null(브라우저 기본값 사용)", () => {
    expect(pickMimeType(() => false)).toBeNull();
  });
});

describe("audioFileName", () => {
  it("Groq가 형식을 알아보도록 녹음 형식에 맞는 확장자를 붙인다", () => {
    expect(audioFileName("audio/webm;codecs=opus")).toBe("recording.webm");
    expect(audioFileName("audio/mp4")).toBe("recording.m4a");
    expect(audioFileName("audio/ogg;codecs=opus")).toBe("recording.ogg");
    expect(audioFileName("")).toBe("recording.webm");
  });
});
