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

const noSpeech = { mode: null, textLength: 0, error: null } as const;
const noStt = { status: "idle", ms: null, textLength: 0, error: null } as const;

describe("buildReport", () => {
  it("성공한 녹음은 기기·형식·크기·길이·재생 여부를 적는다", () => {
    const text = buildReport({
      env,
      permission: "허용됨",
      recording: { url: "blob:x", mimeType: "audio/mp4", size: 1536, durationMs: 65_400, autoStopped: false },
      recorderError: null,
      playbackOk: true,
      speech: { mode: "with-recording", textLength: 5, error: null },
      transcription: { status: "ok", ms: 1234, textLength: 35, error: null },
    });
    expect(text).toContain("글자 변환: 성공 · 1.2초 · 35자");
    expect(text).toContain("기기·브라우저: 아이폰 · 사파리 (홈 화면 앱)");
    expect(text).toContain("녹음: 성공 · audio/mp4 · 1.5 KB · 1:05");
    expect(text).toContain("재생: 소리 잘 들림");
    expect(text).toContain("실시간 글자(녹음과 동시): 5자 인식");
    expect(text).toContain("UA: UA-TEST");
  });

  it("녹음이 실패하면 오류 이름을 적고, 재생은 '확인 안 함'", () => {
    const text = buildReport({
      env,
      permission: "거부됨",
      recording: null,
      recorderError: "NotAllowedError",
      playbackOk: null,
      speech: noSpeech,
      transcription: noStt,
    });
    expect(text).toContain("글자 변환: 안 함");
    expect(text).toContain("녹음: 실패 (NotAllowedError)");
    expect(text).toContain("재생: 확인 안 함");
    expect(text).toContain("실시간 글자: 안 함");
  });

  it("2분 자동 종료와 실시간 글자 오류를 따로 표시한다", () => {
    const text = buildReport({
      env,
      permission: "허용됨",
      recording: { url: "blob:x", mimeType: "audio/mp4", size: 512, durationMs: 120_000, autoStopped: true },
      recorderError: null,
      playbackOk: null,
      speech: { mode: "alone", textLength: 0, error: "not-allowed" },
      transcription: { status: "error", ms: null, textLength: 0, error: "stt-failed" },
    });
    expect(text).toContain("글자 변환: 실패 (stt-failed)");
    expect(text).toContain("(2분 자동 종료)");
    expect(text).toContain("실시간 글자(단독): 오류 (not-allowed)");
  });

  // 시도했는데 글자도 오류도 없으면 "안 함"과 구분해야 원인을 알 수 있다
  it("실시간 글자를 시도했지만 아무것도 인식되지 않으면 그렇게 적는다", () => {
    const text = buildReport({
      env,
      permission: "허용됨",
      recording: null,
      recorderError: null,
      playbackOk: null,
      speech: { mode: "with-recording", textLength: 0, error: null },
      transcription: noStt,
    });
    expect(text).toContain("실시간 글자(녹음과 동시): 인식된 글자 없음");
  });
});
