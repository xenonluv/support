export type InAppName = "kakaotalk" | "instagram" | "facebook" | "line" | "band" | "webview";

export type BrowserInfo = {
  os: "ios" | "android" | "other";
  browser: "chrome" | "samsung" | "safari" | "naver" | "other";
  /** 앱 안의 브라우저(마이크가 막히는 경우가 많음). 일반 브라우저면 null */
  inApp: InAppName | null;
};

const IN_APP: [RegExp, InAppName][] = [
  [/KAKAOTALK/i, "kakaotalk"],
  [/Instagram/, "instagram"],
  [/FBAN|FBAV/, "facebook"],
  [/\bLine\//, "line"],
  [/BAND\//, "band"],
];

/** User-Agent로 기기·브라우저·인앱 여부를 판별한다. */
export function detectBrowser(ua: string): BrowserInfo {
  const os = /iPhone|iPad|iPod/.test(ua) ? "ios" : /Android/.test(ua) ? "android" : "other";
  for (const [pattern, name] of IN_APP) {
    if (pattern.test(ua)) return { os, browser: "other", inApp: name };
  }
  if (/NAVER\(inapp/.test(ua)) return { os, browser: "naver", inApp: null };
  if (/SamsungBrowser/.test(ua)) return { os, browser: "samsung", inApp: null };
  if (os === "ios") {
    if (/CriOS/.test(ua)) return { os, browser: "chrome", inApp: null };
    if (/FxiOS|EdgiOS|OPiOS/.test(ua)) return { os, browser: "other", inApp: null };
    if (/Version\/[\d.]+.*Safari/.test(ua)) return { os, browser: "safari", inApp: null };
    // iOS 앱 내장 웹뷰는 Safari 토큰이 없다
    return { os, browser: "other", inApp: "webview" };
  }
  if (os === "android" && /; wv\)/.test(ua)) return { os, browser: "other", inApp: "webview" };
  if (/Edg\/|OPR\//.test(ua)) return { os, browser: "other", inApp: null };
  if (/Chrome\//.test(ua)) return { os, browser: "chrome", inApp: null };
  if (/Safari\//.test(ua)) return { os, browser: "safari", inApp: null };
  return { os, browser: "other", inApp: null };
}

const OS_LABEL: Record<BrowserInfo["os"], string> = { ios: "아이폰", android: "안드로이드", other: "컴퓨터·기타" };
const BROWSER_LABEL: Record<BrowserInfo["browser"], string> = {
  chrome: "크롬",
  samsung: "삼성 인터넷",
  safari: "사파리",
  naver: "네이버 앱",
  other: "기타 브라우저",
};
const IN_APP_LABEL: Record<InAppName, string> = {
  kakaotalk: "카카오톡",
  instagram: "인스타그램",
  facebook: "페이스북",
  line: "라인",
  band: "밴드",
  webview: "앱",
};

export function describeBrowser(b: BrowserInfo): string {
  const where = b.inApp ? `${IN_APP_LABEL[b.inApp]} 안 브라우저` : BROWSER_LABEL[b.browser];
  return `${OS_LABEL[b.os]} · ${where}`;
}

/** 인앱 브라우저에서 외부 브라우저로 여는 주소. 방법이 없으면 null(메뉴로 열도록 안내). */
export function externalOpenUrl(info: BrowserInfo, url: string): string | null {
  if (info.inApp === "kakaotalk") return `kakaotalk://web/openExternal?url=${encodeURIComponent(url)}`;
  if (info.inApp && info.os === "android") {
    const u = new URL(url);
    return `intent://${u.host}${u.pathname}${u.search}#Intent;scheme=${u.protocol.slice(0, -1)};package=com.android.chrome;end`;
  }
  return null;
}

/** 마이크 권한이 거부됐을 때 기기별로 다시 허용하는 방법. */
export function permissionHelp(info: BrowserInfo): string[] {
  if (info.inApp) {
    return ["앱 안의 브라우저는 마이크를 막는 경우가 많습니다.", "크롬(안드로이드) 또는 사파리(아이폰)로 이 주소를 열어 주세요."];
  }
  if (info.os === "ios" && info.browser === "chrome") {
    return ["설정 앱 → 앱 → Chrome → ‘마이크’를 켭니다.", "Chrome으로 돌아와 페이지를 새로고침합니다."];
  }
  if (info.os === "ios") {
    return [
      "주소창 왼쪽의 ‘가가’ 버튼(또는 ⋯)을 누릅니다.",
      "‘웹 사이트 설정’ → ‘마이크’를 ‘허용’으로 바꿉니다.",
      "그래도 안 되면 설정 앱 → 앱 → Safari → ‘마이크’를 ‘허용’으로 바꿉니다.",
    ];
  }
  if (info.os === "android") {
    return ["주소창 왼쪽의 자물쇠(또는 설정) 아이콘을 누릅니다.", "‘권한’ → ‘마이크’를 ‘허용’으로 바꿉니다.", "페이지를 새로고침합니다."];
  }
  return ["주소창의 사이트 설정에서 마이크를 ‘허용’으로 바꾼 뒤 새로고침합니다."];
}
