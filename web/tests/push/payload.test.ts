import { describe, expect, it } from "vitest";
import { ALERT_BODY, clientAlertPayload, isExpiredStatus, testPayload } from "@/lib/push/payload";
import { PushPayloadSchema, PushSubscriptionSchema } from "@/schemas/push";

const CLIENT_ID = "6f1c2b3a-1111-4222-8333-944455556666";

describe("알림 내용", () => {
  it("대상자 알림은 고정 문구와 상황 화면 주소만 담는다", () => {
    const p = clientAlertPayload(CLIENT_ID);
    expect(PushPayloadSchema.parse(p)).toEqual(p);
    expect(p.url).toBe(`/visits/${CLIENT_ID}`);
    expect(p.body).toBe(ALERT_BODY);
    // 잠금 화면에 식별번호(C-0000)·이름 같은 개인 정보가 보이지 않는다
    expect(`${p.title} ${p.body}`).not.toMatch(/C-\d{4}|어르신|님/);
    expect(Object.keys(p).sort()).toEqual(["body", "tag", "title", "url"]);
  });

  it("시험 알림은 오늘의 방문을 연다", () => {
    expect(testPayload().url).toBe("/visits");
  });
});

describe("만료된 구독", () => {
  it("404·410만 만료로 본다", () => {
    expect(isExpiredStatus(404)).toBe(true);
    expect(isExpiredStatus(410)).toBe(true);
    expect(isExpiredStatus(429)).toBe(false);
    expect(isExpiredStatus(500)).toBe(false);
    expect(isExpiredStatus(undefined)).toBe(false);
  });
});

describe("구독 입력", () => {
  const ok = { endpoint: "https://fcm.googleapis.com/fcm/send/abc", keys: { p256dh: "BNc", auth: "xyz" } };
  it("https 푸시 주소와 키를 받는다", () => {
    expect(PushSubscriptionSchema.safeParse(ok).success).toBe(true);
  });
  it("http 주소나 키가 빠진 값은 거부한다", () => {
    expect(PushSubscriptionSchema.safeParse({ ...ok, endpoint: "http://x.example/1" }).success).toBe(false);
    expect(PushSubscriptionSchema.safeParse({ endpoint: ok.endpoint, keys: { p256dh: "BNc" } }).success).toBe(false);
  });
});

describe("여러 기기로 보내기", () => {
  const devices = ["a", "b", "c", "d"].map((id) => ({ id, endpoint: `https://push.example/${id}`, p256dh: "k", auth: "s" }));

  it("도착·만료·실패를 나눠 센다", async () => {
    const { sendPush } = await import("@/lib/push/send");
    const sent: string[] = [];
    const result = await sendPush(devices, testPayload(), async (d, body) => {
      sent.push(body);
      if (d.id === "b") throw Object.assign(new Error("gone"), { statusCode: 410 });
      if (d.id === "c") throw Object.assign(new Error("busy"), { statusCode: 429 });
    });
    expect(result).toEqual({ delivered: 2, expired: ["b"], failed: 1 });
    expect(JSON.parse(sent[0])).toEqual(testPayload());
  });
});
