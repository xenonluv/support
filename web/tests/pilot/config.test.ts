import { describe, expect, it } from "vitest";
import { describePilotIssues, PilotConfigSchema } from "@/schemas/pilot";

const valid = {
  agencies: [
    { name: "화정1동 행정복지센터", type: "dong_center" },
    { name: "서구 노인맞춤돌봄 수행기관", type: "provider" },
  ],
  clients: [{ code: "C-1001", ageBand: 80, dong: "서구 화정1동", agencies: ["화정1동 행정복지센터", "서구 노인맞춤돌봄 수행기관"] }],
  workers: [
    { email: "worker1@example.com", name: "현장 1", role: "worker", agency: "서구 노인맞춤돌봄 수행기관" },
    { email: "manager1@example.com", name: "동 담당 1", role: "manager", agency: "화정1동 행정복지센터" },
  ],
};

const issues = (config: unknown) => {
  const r = PilotConfigSchema.safeParse(config);
  return r.success ? [] : describePilotIssues(r.error);
};

describe("PilotConfigSchema", () => {
  it("올바른 설정은 통과한다", () => {
    expect(issues(valid)).toEqual([]);
  });

  it("대상자에 성명·주소·연락처 같은 다른 칸이 있으면 거부한다 (식별번호·연령대·동만)", () => {
    const withName = { ...valid, clients: [{ ...valid.clients[0], name: "김영희" }] };
    expect(issues(withName).join("\n")).toContain("clients.0");
  });

  it("식별번호 형식(C-숫자4자리), 연령대(50~100, 10 단위)를 검사한다", () => {
    const bad = { ...valid, clients: [{ ...valid.clients[0], code: "1001", ageBand: 85 }] };
    const found = issues(bad).join("\n");
    expect(found).toContain("clients.0.code");
    expect(found).toContain("clients.0.ageBand");
  });

  it("없는 기관 이름, 중복 이메일·식별번호를 만들기 전에 모두 알려 준다", () => {
    const bad = {
      ...valid,
      clients: [valid.clients[0], { ...valid.clients[0], agencies: ["없는 기관"] }],
      workers: [valid.workers[0], { ...valid.workers[1], email: "WORKER1@example.com", agency: "없는 기관" }],
    };
    const found = issues(bad);
    expect(found).toEqual(
      expect.arrayContaining([
        expect.stringContaining("식별번호 C-1001이(가) 두 번"),
        expect.stringContaining("이메일 worker1@example.com이(가) 두 번"),
        expect.stringContaining("clients.1.agencies.0: 없는 기관"),
        expect.stringContaining("workers.1.agency: 없는 기관"),
      ]),
    );
  });
});
