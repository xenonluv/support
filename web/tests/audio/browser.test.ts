import { describe, expect, it } from "vitest";
import { describeBrowser, detectBrowser, externalOpenUrl, permissionHelp } from "@/lib/audio/browser";

const UA = {
  androidChrome:
    "Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36",
  samsung:
    "Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S921N) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36",
  iosSafari:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
  iosChrome:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1",
  kakaoAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.6668.81 Mobile Safari/537.36;KAKAOTALK 2410100",
  kakaoIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.9.5",
  naverIos:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 NAVER(inapp; search; 2000; 12.10.1)",
  instagramAndroid:
    "Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36 Instagram 350.0.0.0.0 Android",
  androidWebview:
    "Mozilla/5.0 (Linux; Android 14; SM-S921N Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0.0.0 Mobile Safari/537.36",
  macChrome:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
};

describe("detectBrowser", () => {
  it.each([
    ["androidChrome", { os: "android", browser: "chrome", inApp: null }],
    ["samsung", { os: "android", browser: "samsung", inApp: null }],
    ["iosSafari", { os: "ios", browser: "safari", inApp: null }],
    ["iosChrome", { os: "ios", browser: "chrome", inApp: null }],
    ["kakaoAndroid", { os: "android", browser: "other", inApp: "kakaotalk" }],
    ["kakaoIos", { os: "ios", browser: "other", inApp: "kakaotalk" }],
    ["naverIos", { os: "ios", browser: "naver", inApp: null }],
    ["instagramAndroid", { os: "android", browser: "other", inApp: "instagram" }],
    ["androidWebview", { os: "android", browser: "other", inApp: "webview" }],
    ["macChrome", { os: "other", browser: "chrome", inApp: null }],
  ] as const)("%s", (key, expected) => {
    expect(detectBrowser(UA[key])).toEqual(expected);
  });
});

describe("describeBrowser", () => {
  it("기기와 브라우저를 한국어로 쓴다", () => {
    expect(describeBrowser(detectBrowser(UA.samsung))).toBe("안드로이드 · 삼성 인터넷");
    expect(describeBrowser(detectBrowser(UA.kakaoIos))).toBe("아이폰 · 카카오톡 안 브라우저");
  });
});

describe("externalOpenUrl", () => {
  const page = "https://dolbomieum.kr/mic-test?x=1";

  it("카카오톡은 카카오톡의 외부 브라우저 열기 주소를 쓴다", () => {
    expect(externalOpenUrl(detectBrowser(UA.kakaoIos), page)).toBe(
      "kakaotalk://web/openExternal?url=https%3A%2F%2Fdolbomieum.kr%2Fmic-test%3Fx%3D1",
    );
  });

  it("안드로이드의 다른 인앱 브라우저는 크롬 intent 주소를 쓴다", () => {
    expect(externalOpenUrl(detectBrowser(UA.instagramAndroid), page)).toBe(
      "intent://dolbomieum.kr/mic-test?x=1#Intent;scheme=https;package=com.android.chrome;end",
    );
  });

  it("일반 브라우저나 iOS의 다른 인앱 브라우저는 null(메뉴로 열도록 안내)", () => {
    expect(externalOpenUrl(detectBrowser(UA.androidChrome), page)).toBeNull();
    expect(externalOpenUrl({ os: "ios", browser: "other", inApp: "instagram" }, page)).toBeNull();
  });
});

describe("permissionHelp", () => {
  it("아이폰 사파리는 웹 사이트 설정에서 마이크를 허용하도록 안내한다", () => {
    expect(permissionHelp(detectBrowser(UA.iosSafari)).join(" ")).toContain("웹 사이트 설정");
  });

  it("아이폰 크롬은 설정 앱의 Chrome 마이크 권한을 안내한다", () => {
    expect(permissionHelp(detectBrowser(UA.iosChrome)).join(" ")).toContain("Chrome");
  });

  it("안드로이드는 주소창 아이콘 → 권한 경로를 안내한다", () => {
    expect(permissionHelp(detectBrowser(UA.samsung)).join(" ")).toContain("권한");
  });

  it("인앱 브라우저는 크롬·사파리로 열도록 안내한다", () => {
    expect(permissionHelp(detectBrowser(UA.kakaoAndroid)).join(" ")).toContain("크롬");
  });
});
