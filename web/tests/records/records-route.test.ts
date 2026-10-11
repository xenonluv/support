import { beforeEach, describe, expect, it, vi } from "vitest";

const saveMock = vi.fn();
vi.mock("@/lib/records/save", () => ({ saveRecord: (input: unknown) => saveMock(input) }));

const { POST } = await import("@/app/api/records/route");

function request(body: unknown, origin = "https://dolbomieum.kr") {
  return new Request("https://dolbomieum.kr/api/records", {
    method: "POST",
    headers: { host: "dolbomieum.kr", origin, "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/records", () => {
  beforeEach(() => saveMock.mockReset());

  it("받은 내용을 그대로 저장 함수에 넘기고 결과를 돌려준다", async () => {
    saveMock.mockResolvedValue({ ok: true, id: "record-1", visitedAt: "2026-10-11T03:00:00Z" });
    const res = await POST(request({ clientCode: "C-0012" }));
    expect(saveMock).toHaveBeenCalledWith({ clientCode: "C-0012" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, id: "record-1", visitedAt: "2026-10-11T03:00:00Z" });
  });

  it("저장 함수의 오류 안내도 그대로 돌려준다", async () => {
    saveMock.mockResolvedValue({ ok: false, error: "담당 대상자가 아닙니다." });
    expect(await (await POST(request({ clientCode: "C-9999" }))).json()).toEqual({ ok: false, error: "담당 대상자가 아닙니다." });
  });

  it("다른 사이트에서 온 요청은 저장하지 않는다", async () => {
    const res = await POST(request({ clientCode: "C-0012" }, "https://evil.example"));
    expect(res.status).toBe(403);
    expect(saveMock).not.toHaveBeenCalled();
  });

  it("JSON이 아니면 저장하지 않는다", async () => {
    const res = await POST(request("not-json"));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ ok: false });
    expect(saveMock).not.toHaveBeenCalled();
  });
});
