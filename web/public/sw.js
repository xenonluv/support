// 돌봄이음 서비스 워커 — 웹푸시 알림만 다룬다(캐시·오프라인 기능 없음).
// 알림 내용은 서버가 정한 고정 문구와 앱 안 주소뿐이다(개인정보 없음).

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  // 앱 안 경로만 연다 (lib/auth/routes.ts의 SAFE_PATH와 같은 규칙)
  const url = typeof data.url === "string" && /^\/[A-Za-z0-9/_-]*$/.test(data.url) && !data.url.startsWith("//") ? data.url : "/visits";
  event.waitUntil(
    self.registration.showNotification(data.title || "돌봄이음", {
      body: data.body || "확인이 필요한 알림이 있습니다.",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || "dolbom",
      renotify: true,
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/visits", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // 이미 열린 앱 창이 있으면 그 창을 알림 화면으로 옮긴다
      for (const client of windows) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        try {
          // 서비스 워커가 맡지 않은 창은 navigate가 실패한다 → 새 창으로 연다
          const moved = await client.navigate(target);
          if (moved) return void (await moved.focus());
        } catch {
          // 아래에서 새 창을 연다
        }
        break;
      }
      await self.clients.openWindow(target);
    })(),
  );
});
