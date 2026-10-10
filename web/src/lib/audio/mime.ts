// 앞에서부터 지원되는 첫 형식을 쓴다. Groq Whisper는 네 형식 모두 받는다.
const CANDIDATES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

/** 녹음 형식을 고른다. 안드로이드는 보통 webm/opus, 아이폰은 mp4(AAC). 모두 안 되면 null(브라우저 기본값). */
export function pickMimeType(isSupported: (type: string) => boolean): string | null {
  return CANDIDATES.find((t) => isSupported(t)) ?? null;
}
