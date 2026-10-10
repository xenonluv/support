import { beforeEach, describe, expect, it, vi } from "vitest";
import { DRAFT_FIXTURE } from "../fixtures/record-draft";

const draftMock = vi.fn();
const authUserMock = vi.fn();
vi.mock("@/lib/auth/session", () => ({ getAuthUserId: () => authUserMock() }));
vi.mock("@/lib/ai/draft", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/ai/draft")>()),
  generateDraft: (...args: unknown[]) => draftMock(...args),
}));

const { POST } = await import("@/app/api/draft/route");
const { DraftConfigError, DraftRefusedError } = await import("@/lib/ai/draft");

function request(body: unknown, origin = "https://dolbomieum.kr") {
  return new Request("https://dolbomieum.kr/api/draft", {
    method: "POST",
    headers: { host: "dolbomieum.kr", origin, "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/draft", () => {
  beforeEach(() => {
    draftMock.mockReset();
    authUserMock.mockReset();
    authUserMock.mockResolvedValue("user-1");
  });

  it("가린 구술 글과 초안을 돌려준다", async () => {
    draftMock.mockResolvedValue({ draft: DRAFT_FIXTURE, model: "claude-sonnet-5-5" });
    const res = await POST(request({ transcript: "김영희 어르신께서 혈압약을 이틀째 안 드셨어요" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ draft: DRAFT_FIXTURE, model: "claude-sonnet-5-5" });
    expect(body.transcript).toBe("[이름] 어르신께서 혈압약을 이틀째 안 드셨어요");
    expect(draftMock).toHaveBeenCalledWith("[이름] 어르신께서 혈압약을 이틀째 안 드셨어요");
  });

  it("다른 사이트는 403, 비로그인은 401 — 초안을 만들지 않는다", async () => {
    expect((await POST(request({ transcript: "어르신 방문 기록" }, "https://evil.example"))).status).toBe(403);
    authUserMock.mockResolvedValue(null);
    expect((await POST(request({ transcript: "어르신 방문 기록" }))).status).toBe(401);
    expect(draftMock).not.toHaveBeenCalled();
  });

  it("잘못된 입력은 400", async () => {
    expect((await POST(request("not json"))).status).toBe(400);
    expect((await POST(request({ transcript: "짧음" }))).status).toBe(400);
    expect(draftMock).not.toHaveBeenCalled();
  });

  it("거절은 422, 키 미설정은 500, 그 밖의 실패는 502 — 응답에는 오류 종류만", async () => {
    draftMock.mockRejectedValueOnce(new DraftRefusedError("general_harms"));
    const refused = await POST(request({ transcript: "어르신 방문 기록입니다" }));
    expect(refused.status).toBe(422);
    expect(await refused.json()).toEqual({ error: "refused" });

    draftMock.mockRejectedValueOnce(new DraftConfigError());
    expect((await POST(request({ transcript: "어르신 방문 기록입니다" }))).status).toBe(500);

    draftMock.mockRejectedValueOnce(new Error("upstream down"));
    const failed = await POST(request({ transcript: "어르신 방문 기록입니다" }));
    expect(failed.status).toBe(502);
    expect(await failed.json()).toEqual({ error: "draft-failed" });
  });
});
