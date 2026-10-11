import { z } from "zod";

// 파일럿 계정 발급 설정 (npm run pilot:accounts -- pilot/pilot.json).
// 대상자는 식별번호·연령대·동만 받는다 — 다른 칸(성명·주소·연락처)이 있으면 거부한다(개인정보 규칙).

const AgencySchema = z.strictObject({
  name: z.string().trim().min(2),
  type: z.enum(["dong_center", "provider", "welfare_center"]),
});

const ClientSchema = z.strictObject({
  code: z.string().regex(/^C-\d{4}$/, "식별번호는 C-숫자4자리"),
  ageBand: z.number().int().min(50).max(100).multipleOf(10, "연령대는 10 단위 (예: 80)").nullable(),
  dong: z.string().trim().min(2),
  agencies: z.array(z.string()).min(1),
});

const WorkerSchema = z.strictObject({
  email: z.email(),
  name: z.string().trim().min(1).max(30),
  role: z.enum(["worker", "manager"]),
  agency: z.string(),
});

export const PilotConfigSchema = z
  .strictObject({
    agencies: z.array(AgencySchema).min(1),
    clients: z.array(ClientSchema),
    workers: z.array(WorkerSchema).min(1),
  })
  .superRefine((c, ctx) => {
    const agencyNames = new Set(c.agencies.map((a) => a.name));
    const duplicate = (values: string[], label: string, path: string) => {
      const seen = new Set<string>();
      for (const v of values) {
        if (seen.has(v)) ctx.addIssue({ code: "custom", path: [path], message: `${label} ${v}이(가) 두 번 나와요` });
        seen.add(v);
      }
    };
    duplicate(c.agencies.map((a) => a.name), "기관", "agencies");
    duplicate(c.clients.map((cl) => cl.code), "식별번호", "clients");
    duplicate(c.workers.map((w) => w.email.toLowerCase()), "이메일", "workers");
    c.clients.forEach((cl, i) =>
      cl.agencies.forEach((name, j) => {
        if (!agencyNames.has(name)) ctx.addIssue({ code: "custom", path: ["clients", i, "agencies", j], message: `${name} — agencies에 없는 기관` });
      }),
    );
    c.workers.forEach((w, i) => {
      if (!agencyNames.has(w.agency)) ctx.addIssue({ code: "custom", path: ["workers", i, "agency"], message: `${w.agency} — agencies에 없는 기관` });
    });
  });

export type PilotConfig = z.infer<typeof PilotConfigSchema>;

/** 검사 오류를 "위치: 내용" 줄로 */
export function describePilotIssues(error: z.ZodError): string[] {
  return error.issues.map((i) => `${i.path.join(".") || "(전체)"}: ${i.message}`);
}
