import { afterEach, describe, expect, it } from "vitest";
import { STT_MODEL, SttConfigError, transcribe, type SttClient } from "@/lib/stt";

function fakeClient(text: string) {
  const calls: Parameters<SttClient["audio"]["transcriptions"]["create"]>[0][] = [];
  const client: SttClient = {
    audio: {
      transcriptions: {
        create: async (params) => {
          calls.push(params);
          return { text };
        },
      },
    },
  };
  return { client, calls };
}

const file = new File([new Uint8Array([1, 2, 3])], "recording.webm", { type: "audio/webm" });

describe("transcribe", () => {
  const saved = process.env.GROQ_API_KEY;
  afterEach(() => {
    process.env.GROQ_API_KEY = saved;
  });

  it("한국어·돌봄 용어 힌트·고정 온도로 변환을 요청하고 앞뒤 공백을 지운다", async () => {
    const { client, calls } = fakeClient("  어르신이 혈압약을 안 드셨어요. ");
    const result = await transcribe(file, client);
    expect(result).toEqual({ text: "어르신이 혈압약을 안 드셨어요.", engine: `groq/${STT_MODEL}` });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ file, model: "whisper-large-v3-turbo", language: "ko", temperature: 0 });
    expect(calls[0].prompt).toContain("복약");
  });

  it("GROQ_API_KEY가 없으면 설정 오류를 낸다", async () => {
    delete process.env.GROQ_API_KEY;
    await expect(transcribe(file)).rejects.toBeInstanceOf(SttConfigError);
  });
});
