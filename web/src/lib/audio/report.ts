import { describeBrowser } from "@/lib/audio/browser";
import { formatBytes, formatDuration } from "@/lib/audio/format";
import type { AudioEnvironment, Recording } from "@/lib/audio/types";

export type ReportInput = {
  env: AudioEnvironment;
  permission: string;
  recording: Recording | null;
  recorderError: string | null;
  playbackOk: boolean | null;
  /** 실시간 글자 결과. 결과에는 글자 수만 넣는다(구술 내용은 개인정보) */
  speechText: string;
  speechError: string | null;
};

const yes = (b: boolean) => (b ? "예" : "아니오");

/** 마이크 테스트 결과를 붙여 넣기 좋은 여러 줄 텍스트로 만든다. */
export function buildReport({ env, permission, recording, recorderError, playbackOk, speechText, speechError }: ReportInput): string {
  const recordLine = recording
    ? `녹음: 성공 · ${recording.mimeType} · ${formatBytes(recording.size)} · ${formatDuration(recording.durationMs)}${recording.autoStopped ? " (2분 자동 종료)" : ""}`
    : `녹음: ${recorderError ? `실패 (${recorderError})` : "안 함"}`;
  const playbackLine = `재생: ${playbackOk === null ? "확인 안 함" : playbackOk ? "소리 잘 들림" : "안 들림"}`;
  const speechLine = `실시간 글자: ${speechError ? `오류 (${speechError})` : speechText ? `${speechText.length}자 인식` : "안 함"}`;
  return [
    "[돌봄이음 마이크 테스트]",
    `기기·브라우저: ${describeBrowser(env.browser)}${env.standalone ? " (홈 화면 앱)" : ""}`,
    `HTTPS: ${yes(env.secureContext)} · 마이크 API: ${yes(env.getUserMedia)} · 녹음 API: ${yes(env.mediaRecorder)}`,
    `선택 형식: ${env.mimeType ?? "브라우저 기본값"} · 실시간 글자 API: ${yes(env.speechRecognition)} · 화면 꺼짐 방지 API: ${yes(env.wakeLock)}`,
    `마이크 권한: ${permission}`,
    recordLine,
    playbackLine,
    speechLine,
    `UA: ${env.userAgent}`,
  ].join("\n");
}
