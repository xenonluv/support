import { describe, expect, it } from "vitest";
import { decideRoute, roleFromMetadata } from "@/lib/auth/routes";

const worker = { role: "worker" } as const;
const manager = { role: "manager" } as const;

describe("decideRoute", () => {
  it("사용 안내(/guide)는 로그인 전후 누구나 본다", () => {
    expect(decideRoute("/guide", null)).toBeNull();
    expect(decideRoute("/guide", worker)).toBeNull();
    expect(decideRoute("/guide", manager)).toBeNull();
    expect(decideRoute("/guide-x", null)).toBe("/login");
  });

  it("비로그인은 로그인 화면으로 보내고, 로그인 화면 자체는 그대로 둔다", () => {
    expect(decideRoute("/visits", null)).toBe("/login");
    expect(decideRoute("/signals/C-0012", null)).toBe("/login");
    expect(decideRoute("/mic-test", null)).toBe("/login");
    expect(decideRoute("/", null)).toBe("/login");
    expect(decideRoute("/login", null)).toBeNull();
  });

  it("로그인 상태에서 첫 화면이나 로그인 화면에 오면 역할 홈으로 보낸다", () => {
    expect(decideRoute("/", worker)).toBe("/visits");
    expect(decideRoute("/login", worker)).toBe("/visits");
    expect(decideRoute("/", manager)).toBe("/signals");
    expect(decideRoute("/login", manager)).toBe("/signals");
  });

  it("현장 인력이 관리자 화면에 오면 현장 홈으로, 관리자가 현장 화면에 오면 관리자 홈으로 보낸다", () => {
    expect(decideRoute("/signals", worker)).toBe("/visits");
    expect(decideRoute("/signals/C-0012", worker)).toBe("/visits");
    expect(decideRoute("/briefing", worker)).toBe("/visits");
    expect(decideRoute("/briefing/C-0012", worker)).toBe("/visits");
    expect(decideRoute("/metrics", worker)).toBe("/visits");
    expect(decideRoute("/clients", worker)).toBe("/visits");
    expect(decideRoute("/clients/new", worker)).toBe("/visits");
    expect(decideRoute("/visits", manager)).toBe("/signals");
    expect(decideRoute("/visits/0b6f6f2e-1c1a-4f7e-9d43-2b1d5c0e7a10", manager)).toBe("/signals");
    expect(decideRoute("/record", manager)).toBe("/signals");
    expect(decideRoute("/my-records", manager)).toBe("/signals");
  });

  it("자기 역할 화면과 공용 화면(마이크 테스트)은 그대로 둔다", () => {
    expect(decideRoute("/visits", worker)).toBeNull();
    expect(decideRoute("/visits/0b6f6f2e-1c1a-4f7e-9d43-2b1d5c0e7a10", worker)).toBeNull();
    expect(decideRoute("/record", worker)).toBeNull();
    expect(decideRoute("/signals/C-0012", manager)).toBeNull();
    expect(decideRoute("/briefing/C-0012", manager)).toBeNull();
    expect(decideRoute("/mic-test", worker)).toBeNull();
    expect(decideRoute("/mic-test", manager)).toBeNull();
  });

  it("경로는 구간 단위로 비교한다 (/signals-archive는 /signals 아래가 아님)", () => {
    expect(decideRoute("/signals-archive", worker)).toBeNull();
    expect(decideRoute("/records", manager)).toBeNull();
  });

  it("역할이 없는 계정은 로그인 화면으로 보낸다(로그인 화면에서는 멈춘다)", () => {
    expect(decideRoute("/visits", { role: null })).toBe("/login");
    expect(decideRoute("/login", { role: null })).toBeNull();
  });

  it("API는 화면 분기 대상이 아니다 (핸들러가 직접 401을 준다)", () => {
    expect(decideRoute("/api/transcribe", null)).toBeNull();
  });
});

describe("roleFromMetadata", () => {
  it("app_metadata.role이 worker·manager일 때만 역할로 인정한다", () => {
    expect(roleFromMetadata({ role: "worker" })).toBe("worker");
    expect(roleFromMetadata({ role: "manager", agency_id: "x" })).toBe("manager");
    expect(roleFromMetadata({ role: "admin" })).toBeNull();
    expect(roleFromMetadata({})).toBeNull();
    expect(roleFromMetadata(undefined)).toBeNull();
    expect(roleFromMetadata("worker")).toBeNull();
  });
});
