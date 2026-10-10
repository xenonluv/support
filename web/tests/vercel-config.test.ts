import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const file = new URL("../vercel.json", import.meta.url);

describe("vercel.json", () => {
  // 함수가 기본 지역(미국 동부 iad1)에서 돌면 서울 Supabase를 오갈 때마다 약 0.2초씩 쌓여
  // 화면 이동이 0.5~1.6초 걸렸다(2026-10-11 측정). DB와 같은 서울(icn1)에서 실행한다.
  it("서버 함수를 Supabase와 같은 서울(icn1)에서 실행한다", () => {
    expect(existsSync(file)).toBe(true);
    expect(JSON.parse(readFileSync(file, "utf8")).regions).toEqual(["icn1"]);
  });

  // 무료 Supabase는 7일 동안 사용이 적으면 일시정지된다. Hobby 크론은 하루 한 번까지만 된다.
  it("하루 한 번 DB 깨우기 크론을 부른다", () => {
    expect(JSON.parse(readFileSync(file, "utf8")).crons).toEqual([{ path: "/api/cron/keepalive", schedule: "0 0 * * *" }]);
  });
});
