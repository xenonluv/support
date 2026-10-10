/** Vercel 함수 요청 한도(4.5MB) 안쪽. 2분 녹음(약 1.6MB)도 충분히 들어간다. */
export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;

export type UploadProblem = "missing" | "empty" | "too-large" | "not-audio";

const AUDIO_TYPE = /^(audio\/|video\/webm|video\/mp4)/;

export function checkAudioUpload(file: { type: string; size: number } | null): UploadProblem | null {
  if (!file) return "missing";
  if (file.size === 0) return "empty";
  if (file.size > MAX_UPLOAD_BYTES) return "too-large";
  if (!AUDIO_TYPE.test(file.type)) return "not-audio";
  return null;
}

/** 우리 사이트 화면에서 보낸 요청인지 (다른 사이트가 무료 변환 한도를 쓰지 못하게) */
export function isSameOrigin(origin: string | null, host: string | null): boolean {
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
