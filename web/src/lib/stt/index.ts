import Groq from "groq-sdk";

// STT 호출은 이 파일의 transcribe()만 쓴다(CLAUDE.md). 엔진을 바꿀 때도 여기만 고친다.
export const STT_MODEL = "whisper-large-v3-turbo";

// 돌봄 용어 힌트: 자주 틀리는 낱말을 바르게 받아 적도록 돕는다
const CARE_PROMPT =
  "돌봄 방문 기록입니다. 어르신, 생활지원사, 복약, 혈압약, 당뇨약, 식사량, 낙상, 방문 거부, 정서, 행정복지센터, 통합돌봄";

type TranscriptionParams = {
  file: File;
  model: string;
  language: string;
  prompt: string;
  response_format: "json";
  temperature: number;
};

/** 테스트에서 가짜로 바꿀 수 있도록 필요한 부분만 정의한 클라이언트 모양 */
export type SttClient = {
  audio: { transcriptions: { create(params: TranscriptionParams): Promise<{ text: string }> } };
};

export type TranscribeResult = { text: string; engine: string };

export class SttConfigError extends Error {
  constructor() {
    super("GROQ_API_KEY is not set");
    this.name = "SttConfigError";
  }
}

/** 녹음 파일을 한국어 글자로 바꾼다. 음성과 글자는 저장하거나 로그에 남기지 않는다. */
export async function transcribe(file: File, client?: SttClient): Promise<TranscribeResult> {
  const stt = client ?? defaultClient();
  const res = await stt.audio.transcriptions.create({
    file,
    model: STT_MODEL,
    language: "ko",
    prompt: CARE_PROMPT,
    response_format: "json",
    temperature: 0,
  });
  return { text: res.text.trim(), engine: `groq/${STT_MODEL}` };
}

function defaultClient(): SttClient {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new SttConfigError();
  return new Groq({ apiKey });
}
