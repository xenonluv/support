import { describe, expect, it } from "vitest";
import { MAX_UPLOAD_BYTES, checkAudioUpload, isSameOrigin } from "@/lib/stt/upload";

describe("checkAudioUpload", () => {
  it("정상 녹음 파일은 통과", () => {
    expect(checkAudioUpload({ type: "audio/webm;codecs=opus", size: 95_700 })).toBeNull();
    expect(checkAudioUpload({ type: "audio/mp4", size: 50_000 })).toBeNull();
  });

  it("파일이 없거나 비어 있으면 거부", () => {
    expect(checkAudioUpload(null)).toBe("missing");
    expect(checkAudioUpload({ type: "audio/webm", size: 0 })).toBe("empty");
  });

  it("4MB를 넘으면 거부 (Vercel 요청 한도 4.5MB 안쪽)", () => {
    expect(checkAudioUpload({ type: "audio/webm", size: MAX_UPLOAD_BYTES + 1 })).toBe("too-large");
  });

  it("음성이 아닌 파일은 거부", () => {
    expect(checkAudioUpload({ type: "image/png", size: 1000 })).toBe("not-audio");
  });
});

describe("isSameOrigin", () => {
  it("같은 사이트에서 보낸 요청만 허용", () => {
    expect(isSameOrigin("https://dolbomieum.kr", "dolbomieum.kr")).toBe(true);
    expect(isSameOrigin("http://localhost:3100", "localhost:3100")).toBe(true);
  });

  it("다른 사이트이거나 출처가 없으면 거부", () => {
    expect(isSameOrigin("https://evil.example", "dolbomieum.kr")).toBe(false);
    expect(isSameOrigin(null, "dolbomieum.kr")).toBe(false);
    expect(isSameOrigin("not a url", "dolbomieum.kr")).toBe(false);
  });
});
