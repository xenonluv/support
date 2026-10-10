import { beforeEach, describe, expect, it, vi } from "vitest";

const transcribeMock = vi.fn();
vi.mock("@/lib/stt", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/stt")>()),
  transcribe: (...args: unknown[]) => transcribeMock(...args),
}));

const { POST } = await import("@/app/api/transcribe/route");

function request(opts: { origin?: string | null; file?: File | null }) {
  const form = new FormData();
  if (opts.file) form.append("audio", opts.file);
  const headers: Record<string, string> = { host: "dolbomieum.kr" };
  if (opts.origin !== null) headers.origin = opts.origin ?? "https://dolbomieum.kr";
  return new Request("https://dolbomieum.kr/api/transcribe", { method: "POST", headers, body: form });
}

const audio = new File([new Uint8Array(2000)], "recording.webm", { type: "audio/webm" });

describe("POST /api/transcribe", () => {
  // 중괄호로 감싼다: 함수를 반환하면 Vitest가 그 함수를 테스트 뒤 정리 함수로 실행한다
  beforeEach(() => {
    transcribeMock.mockReset();
  });

  it("변환한 글자와 엔진 이름을 돌려준다", async () => {
    transcribeMock.mockResolvedValue({ text: "식사를 절반만 드셨어요", engine: "groq/whisper-large-v3-turbo" });
    const res = await POST(request({ file: audio }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ text: "식사를 절반만 드셨어요", engine: "groq/whisper-large-v3-turbo" });
  });

  it("다른 사이트에서 온 요청은 403 (무료 한도 남용 방지)", async () => {
    const res = await POST(request({ origin: "https://evil.example", file: audio }));
    expect(res.status).toBe(403);
    expect(transcribeMock).not.toHaveBeenCalled();
  });

  it("음성 파일이 없으면 400, 너무 크면 413", async () => {
    expect((await POST(request({ file: null }))).status).toBe(400);
    const big = new File([new Uint8Array(4 * 1024 * 1024 + 1)], "big.webm", { type: "audio/webm" });
    expect((await POST(request({ file: big }))).status).toBe(413);
    expect(transcribeMock).not.toHaveBeenCalled();
  });

  it("Groq 오류는 502로 알리고, 응답에 오류 종류만 담는다", async () => {
    transcribeMock.mockRejectedValue(new Error("upstream down"));
    const res = await POST(request({ file: audio }));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "stt-failed" });
  });
});
