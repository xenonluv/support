import { detectBrowser } from "@/lib/audio/browser";
import { pickMimeType } from "@/lib/audio/mime";
import type { AudioEnvironment } from "@/lib/audio/types";
import { getSpeechRecognition } from "@/lib/audio/use-speech-preview";

let cached: AudioEnvironment | null = null;

/**
 * 이 기기의 녹음 관련 기능 지원 여부. 브라우저에서만 호출한다.
 * useSyncExternalStore가 같은 값을 받도록 처음 계산한 객체를 계속 돌려준다.
 */
export function readAudioEnvironment(): AudioEnvironment {
  if (cached) return cached;
  const hasRecorder = typeof MediaRecorder !== "undefined";
  cached = {
    browser: detectBrowser(navigator.userAgent),
    userAgent: navigator.userAgent,
    pageUrl: location.href,
    secureContext: window.isSecureContext,
    getUserMedia: Boolean(navigator.mediaDevices?.getUserMedia),
    mediaRecorder: hasRecorder,
    mimeType: hasRecorder ? pickMimeType((t) => MediaRecorder.isTypeSupported(t)) : null,
    speechRecognition: getSpeechRecognition() !== null,
    wakeLock: "wakeLock" in navigator,
    standalone:
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
  };
  return cached;
}
