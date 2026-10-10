import { describe, expect, it } from "vitest";
import { buildReport } from "@/lib/audio/report";
import type { AudioEnvironment } from "@/lib/audio/types";

const env: AudioEnvironment = {
  browser: { os: "ios", browser: "safari", inApp: null },
  userAgent: "UA-TEST",
  pageUrl: "https://dolbomieum.kr/mic-test",
  secureContext: true,
  getUserMedia: true,
  mediaRecorder: true,
  mimeType: "audio/mp4",
  speechRecognition: true,
  wakeLock: false,
  standalone: true,
};

describe("buildReport", () => {
  const success = buildReport({
    env,
    permission: "허용됨",
    recording: { url: "blob:x", mimeType: "audio/mp4", size: 1536, durationMs: 65_400, autoStopped: false },
    recorderError: null,
    playbackOk: true,
    speechText: "안녕하세요",
    speechError: null,
  });

  it("성공한 녹음은 기기·형식·크기·길이·재생 여부를 적는다", () => {
    expect(success).toContain("기기·브라우저: 아이폰 · 사파리 (홈 화면 앱)");
    expect(success).toContain("녹음: 성공 · audio/mp4 · 1.5 KB · 1:05");
    expect(success).toContain("재생: 소리 잘 들림");
    expect(success).toContain("실시간 글자: 5자 인식");
    expect(success).toContain("UA: UA-TEST");
  });

  it("구술 내용 자체는 결과에 넣지 않는다 (개인정보)", () => {
    expect(success).not.toContain("안녕하세요");
  });

  it("녹음이 실패하면 오류 이름을 적고, 재생은 '확인 안 함'", () => {
    const failed = buildReport({
      env,
      permission: "거부됨",
      recording: null,
      recorderError: "NotAllowedError",
      playbackOk: null,
      speechText: "",
      speechError: null,
    });
    expect(failed).toContain("녹음: 실패 (NotAllowedError)");
    expect(failed).toContain("재생: 확인 안 함");
    expect(failed).toContain("실시간 글자: 안 함");
  });

  it("2분 자동 종료는 따로 표시한다", () => {
    const auto = buildReport({
      env,
      permission: "허용됨",
      recording: { url: "blob:x", mimeType: "audio/mp4", size: 512, durationMs: 120_000, autoStopped: true },
      recorderError: null,
      playbackOk: null,
      speechText: "",
      speechError: "not-allowed",
    });
    expect(auto).toContain("(2분 자동 종료)");
    expect(auto).toContain("실시간 글자: 오류 (not-allowed)");
  });
});
