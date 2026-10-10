import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.fn();
vi.mock("@supabase/supabase-js", () => ({ createClient: () => ({ rpc: (name: string) => rpcMock(name) }) }));

const { GET } = await import("@/app/api/cron/keepalive/route");

const call = (authorization?: string) =>
  GET(new Request("https://dolbomieum.kr/api/cron/keepalive", { headers: authorization ? { authorization } : {} }));

describe("GET /api/cron/keepalive", () => {
  const saved = { secret: process.env.CRON_SECRET, url: process.env.NEXT_PUBLIC_SUPABASE_URL, key: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY };
  beforeEach(() => {
    rpcMock.mockReset();
    rpcMock.mockResolvedValue({ data: "2026-10-12T00:00:00+00:00", error: null });
    process.env.CRON_SECRET = "test-secret";
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test";
  });
  afterEach(() => {
    process.env.CRON_SECRET = saved.secret;
    process.env.NEXT_PUBLIC_SUPABASE_URL = saved.url;
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = saved.key;
  });

  it("Vercel 크론의 비밀 값이 맞으면 DB 깨우기 함수를 부른다", async () => {
    const res = await call("Bearer test-secret");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, pingedAt: "2026-10-12T00:00:00+00:00" });
    expect(rpcMock).toHaveBeenCalledWith("keepalive");
  });

  it("비밀 값이 없거나 틀리면 401, DB를 부르지 않는다", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer wrong")).status).toBe(401);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("CRON_SECRET이 설정되지 않았으면 500 (헤더가 'Bearer undefined'여도 통과시키지 않는다)", async () => {
    delete process.env.CRON_SECRET;
    expect((await call("Bearer undefined")).status).toBe(500);
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("DB 호출이 실패하면 502", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { code: "PGRST202" } });
    expect((await call("Bearer test-secret")).status).toBe(502);
  });
});
