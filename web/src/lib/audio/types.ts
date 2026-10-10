import type { BrowserInfo } from "@/lib/audio/browser";

/** 이 기기에서 녹음에 필요한 기능이 있는지 */
export type AudioEnvironment = {
  browser: BrowserInfo;
  userAgent: string;
  pageUrl: string;
  /** HTTPS 등 보안 연결 (마이크 권한의 필수 조건) */
  secureContext: boolean;
  getUserMedia: boolean;
  mediaRecorder: boolean;
  /** 고른 녹음 형식. null이면 브라우저 기본값 */
  mimeType: string | null;
  speechRecognition: boolean;
  wakeLock: boolean;
  /** 홈 화면에 추가한 앱으로 실행 중 */
  standalone: boolean;
};

/** 브라우저 메모리에만 있는 녹음 결과 (서버로 보내지 않음) */
export type Recording = {
  url: string;
  mimeType: string;
  size: number;
  durationMs: number;
  autoStopped: boolean;
};
