import { beforeEach, describe, expect, it, vi } from "vitest";

const rpcMock = vi.fn();
const refreshMock = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ rpc: (...args: unknown[]) => rpcMock(...args) }) }));
vi.mock("next/cache", () => ({ refresh: () => refreshMock() }));

const { registerClient, setClientClosed, updateClient } = await import("@/lib/clients/actions");

const AGENCY = "8f6b1c1e-1d2a-4c3b-9a8e-0f1e2d3c4b5a";
const CLIENT = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const failWith = (code: string) => rpcMock.mockResolvedValue({ data: null, error: { code, message: "x" } });

describe("대상자 관리 액션", () => {
  beforeEach(() => {
    rpcMock.mockReset();
    refreshMock.mockReset();
  });

  it("등록: 빈 번호·미입력 연령대를 그대로 DB 함수에 넘기고, 붙은 번호를 돌려준다", async () => {
    rpcMock.mockResolvedValue({ data: "C-2021", error: null });
    const result = await registerClient({ code: "", ageBand: null, dong: "○○동", partnerAgencyIds: [AGENCY] });
    expect(result).toEqual({ ok: true, code: "C-2021" });
    expect(rpcMock).toHaveBeenCalledWith("register_client", { p_code: "", p_age_band: null, p_dong: "○○동", p_partner_ids: [AGENCY] });
    expect(refreshMock).toHaveBeenCalled();
  });

  it("수정·종결도 DB 함수로 부른다", async () => {
    rpcMock.mockResolvedValue({ data: null, error: null });
    expect(await updateClient({ clientId: CLIENT, code: "C-2050", ageBand: 70, dong: "○○동", partnerAgencyIds: [] })).toEqual({ ok: true });
    expect(rpcMock).toHaveBeenCalledWith("update_client", { p_client_id: CLIENT, p_code: "C-2050", p_age_band: 70, p_dong: "○○동", p_partner_ids: [] });
    expect(await setClientClosed({ clientId: CLIENT, closed: true })).toEqual({ ok: true });
    expect(rpcMock).toHaveBeenCalledWith("set_client_closed", { p_client_id: CLIENT, p_closed: true });
  });

  it("DB 오류 코드를 알아듣기 쉬운 문구로 바꾼다", async () => {
    const input = { clientId: CLIENT, code: "C-2050", ageBand: 70, dong: "○○동", partnerAgencyIds: [] };
    failWith("42501");
    expect(await updateClient(input)).toEqual({ ok: false, error: expect.stringContaining("동 행정복지센터 담당자") });
    failWith("23505");
    expect(await updateClient(input)).toEqual({ ok: false, error: expect.stringContaining("식별번호") });
    failWith("22023");
    expect(await updateClient(input)).toEqual({ ok: false, error: "입력 내용을 확인해 주세요." });
    failWith("XX000");
    expect(await updateClient(input)).toMatchObject({ ok: false });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("동 칸에 주소를 섞으면 어느 칸이 틀렸는지 알려 주고 DB 함수를 부르지 않는다", async () => {
    const result = await registerClient({ code: "", ageBand: null, dong: "서구 화정1동 운천로 12", partnerAgencyIds: [] });
    expect(result).toEqual({ ok: false, error: expect.stringContaining("동 이름만") });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("입력이 틀리면(성명 칸 등) DB 함수를 부르지 않는다", async () => {
    expect(await registerClient({ code: "", ageBand: null, dong: "○○동", partnerAgencyIds: [], name: "김영희" })).toMatchObject({ ok: false });
    expect(await setClientClosed({ clientId: "C-2021", closed: true })).toMatchObject({ ok: false });
    expect(rpcMock).not.toHaveBeenCalled();
  });
});
