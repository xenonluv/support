import { describe, expect, it } from "vitest";
import { ClientClosedSchema, ClientRegisterSchema, ClientUpdateSchema } from "@/schemas/client";

const AGENCY = "8f6b1c1e-1d2a-4c3b-9a8e-0f1e2d3c4b5a";
const CLIENT = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";

describe("대상자 관리 입력", () => {
  it("등록: 번호는 비워 둘 수 있고(자동 번호), 연령대는 미입력(null)도 된다", () => {
    expect(ClientRegisterSchema.parse({ code: "", ageBand: null, dong: " 서구 화정1동 ", partnerAgencyIds: [] })).toEqual({
      code: "",
      ageBand: null,
      dong: "서구 화정1동",
      partnerAgencyIds: [],
    });
    expect(ClientRegisterSchema.safeParse({ code: "C-2021", ageBand: 80, dong: "○○동", partnerAgencyIds: [AGENCY] }).success).toBe(true);
  });

  it("번호는 C-숫자4자리, 연령대는 50~100의 10 단위, 동은 2~40자", () => {
    const base = { code: "C-2021", ageBand: 80, dong: "○○동", partnerAgencyIds: [] };
    expect(ClientRegisterSchema.safeParse({ ...base, code: "2021" }).success).toBe(false);
    expect(ClientRegisterSchema.safeParse({ ...base, ageBand: 85 }).success).toBe(false);
    expect(ClientRegisterSchema.safeParse({ ...base, ageBand: 40 }).success).toBe(false);
    expect(ClientRegisterSchema.safeParse({ ...base, dong: "동" }).success).toBe(false);
    expect(ClientRegisterSchema.safeParse({ ...base, dong: "가".repeat(41) }).success).toBe(false);
  });

  it("동 칸에는 행정동 이름만 — 주소·전화번호·이름을 섞어 넣을 수 없다", () => {
    const base = { code: "", ageBand: 80, partnerAgencyIds: [] };
    for (const dong of ["서구 화정1동", "○○동", "○○구 ○○동", "광산구 첨단1동", "광주광역시 서구 화정1동", "담양군 대전면", "동구 충장로1가"]) {
      expect(ClientRegisterSchema.safeParse({ ...base, dong }).success, dong).toBe(true);
    }
    for (const dong of ["서구 화정1동 운천로 12", "화정1동 010-1234-5678", "김영희", "서구 화정1동 김OO 어르신", "화정1동 101동 1203호"]) {
      expect(ClientRegisterSchema.safeParse({ ...base, dong }).success, dong).toBe(false);
    }
  });

  it("성명 같은 다른 칸은 받지 않는다", () => {
    expect(ClientRegisterSchema.safeParse({ code: "", ageBand: 80, dong: "○○동", partnerAgencyIds: [], name: "김영희" }).success).toBe(false);
    expect(
      ClientUpdateSchema.safeParse({ clientId: CLIENT, code: "C-2021", ageBand: 80, dong: "○○동", partnerAgencyIds: [], phone: "010" }).success,
    ).toBe(false);
  });

  it("수정은 번호가 꼭 있어야 하고, 대상자·기관은 내부 id(uuid)로 받는다", () => {
    expect(ClientUpdateSchema.safeParse({ clientId: CLIENT, code: "", ageBand: 80, dong: "○○동", partnerAgencyIds: [] }).success).toBe(false);
    expect(ClientUpdateSchema.safeParse({ clientId: "C-2021", code: "C-2021", ageBand: 80, dong: "○○동", partnerAgencyIds: [] }).success).toBe(false);
    expect(ClientUpdateSchema.safeParse({ clientId: CLIENT, code: "C-2021", ageBand: 80, dong: "○○동", partnerAgencyIds: ["x"] }).success).toBe(false);
    expect(ClientClosedSchema.safeParse({ clientId: CLIENT, closed: true }).success).toBe(true);
  });
});
