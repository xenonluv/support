"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PUSH_RESAVED_KEY } from "@/lib/push/payload";
import { removePushSubscription, savePushSubscription, sendTestPush } from "@/lib/push/actions";

type Status = "checking" | "unsupported" | "ios-home" | "denied" | "off" | "on";

/** VAPID 공개키(base64url) → 브라우저 구독에 넣는 바이트 */
function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function isIos(): boolean {
  return /iPhone|iPad|iPod/.test(navigator.userAgent);
}

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

async function registration(): Promise<ServiceWorkerRegistration> {
  await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
  return navigator.serviceWorker.ready;
}

/** 이 기기의 구독. 지금 공개키가 아닌 키로 만든 구독(키를 바꾼 뒤)은 쓸 수 없으니 해지하고 null */
async function currentSubscription(reg: ServiceWorkerRegistration, publicKey: string): Promise<PushSubscription | null> {
  const sub = await reg.pushManager.getSubscription();
  const key = sub?.options.applicationServerKey;
  if (sub && key && !sameBytes(new Uint8Array(key), keyBytes(publicKey))) {
    await removePushSubscription(sub.endpoint); // 서버 쪽 기록도 지운다(옛 키 기기는 403만 돌아와 저절로 정리되지 않는다)
    await sub.unsubscribe();
    return null;
  }
  return sub;
}

function sameBytes(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((v, i) => v === b[i]);
}

// 켜져 있는 기기는 한 세션에 한 번만 서버에 다시 알린다(만료 정리·다른 계정 사용 뒤 복구용)
function resavedThisSession(endpoint: string): boolean {
  try {
    return sessionStorage.getItem(PUSH_RESAVED_KEY) === endpoint;
  } catch {
    return false;
  }
}
function markResaved(endpoint: string) {
  try {
    sessionStorage.setItem(PUSH_RESAVED_KEY, endpoint);
  } catch {
    // 저장소를 못 쓰면 다음에 다시 알린다
  }
}

/** 현장인력 "알림 받기". 관리자가 보내는 "확인 필요" 알림을 이 기기로 받는다 */
export function PushSetup({ publicKey }: { publicKey: string }) {
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let next: Status;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        // 아이폰은 홈 화면에 추가한 앱에서만 웹푸시가 된다
        next = isIos() && !isStandalone() ? "ios-home" : "unsupported";
      } else if (Notification.permission === "denied") {
        next = "denied";
      } else {
        try {
          const sub = await currentSubscription(await registration(), publicKey);
          next = sub && Notification.permission === "granted" ? "on" : "off";
          // 서버 쪽 기록이 지워졌을 수 있으니(만료 정리·로그아웃·다른 계정) 켜져 있으면 다시 저장한다
          if (sub && next === "on" && !resavedThisSession(sub.endpoint)) {
            const saved = await savePushSubscription(sub.toJSON());
            if (saved.ok) markResaved(sub.endpoint);
          }
        } catch {
          next = "unsupported";
        }
      }
      if (!cancelled) setStatus(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [publicKey]);

  function turnOn() {
    setMessage(null);
    startTransition(async () => {
      try {
        // 권한 요청은 버튼을 누른 이 순간에만 할 수 있다(특히 아이폰)
        const permission = await Notification.requestPermission();
        if (permission !== "granted") {
          setStatus(permission === "denied" ? "denied" : "off");
          return;
        }
        const reg = await registration();
        const sub =
          (await currentSubscription(reg, publicKey)) ??
          (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey) }));
        const result = await savePushSubscription(sub.toJSON());
        if (!result.ok) {
          setMessage({ ok: false, text: result.error });
          return;
        }
        markResaved(sub.endpoint);
        setStatus("on");
        setMessage({ ok: true, text: "알림을 켰어요. [테스트 알림]으로 확인해 보세요." });
      } catch {
        setMessage({ ok: false, text: "알림을 켜지 못했어요. 잠시 뒤 다시 시도해 주세요." });
      }
    });
  }

  function turnOff() {
    setMessage(null);
    startTransition(async () => {
      try {
        const sub = await (await registration()).pushManager.getSubscription();
        if (sub) {
          const removed = await removePushSubscription(sub.endpoint);
          if (!removed.ok) {
            setMessage({ ok: false, text: removed.error });
            return;
          }
          await sub.unsubscribe();
        }
        setStatus("off");
        setMessage({ ok: true, text: "이 기기의 알림을 껐어요." });
      } catch {
        setMessage({ ok: false, text: "알림을 끄지 못했어요. 잠시 뒤 다시 시도해 주세요." });
      }
    });
  }

  function test() {
    setMessage(null);
    startTransition(async () => {
      const result = await sendTestPush();
      setMessage(result.ok ? { ok: true, text: result.message } : { ok: false, text: result.error });
    });
  }

  if (status === "checking") return null;

  return (
    <section aria-labelledby="push-heading" className="flex flex-col gap-2 rounded-xl border bg-card p-4 text-sm">
      <div className="flex items-center gap-2">
        <BellRing className="size-4 text-primary" aria-hidden="true" />
        <h2 id="push-heading" className="font-semibold">
          {status === "on" ? "관리자 알림 받는 중" : "관리자 알림"}
        </h2>
      </div>
      {status === "off" && (
        <>
          <p className="text-muted-foreground">확인이 필요한 대상자가 생기면 관리자가 이 휴대폰으로 알려요. 앱을 닫아도 옵니다.</p>
          <Button onClick={turnOn} disabled={pending} className="h-11">
            {pending ? "켜는 중…" : "알림 받기"}
          </Button>
        </>
      )}
      {status === "on" && (
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={test} disabled={pending} className="h-11">
            테스트 알림
          </Button>
          <Button variant="ghost" onClick={turnOff} disabled={pending} className="h-11 text-muted-foreground">
            알림 끄기
          </Button>
        </div>
      )}
      {status === "ios-home" && (
        <p className="text-muted-foreground">
          아이폰은 홈 화면에 추가한 앱에서 알림을 켤 수 있어요.{" "}
          <Link href="/guide" className="font-medium text-primary underline underline-offset-2">
            추가 방법
          </Link>
        </p>
      )}
      {status === "unsupported" && (
        <p className="text-muted-foreground">이 브라우저는 알림을 받을 수 없어요. 카카오톡 등에서 열었다면 크롬·사파리로 열어 주세요.</p>
      )}
      {status === "denied" && (
        <p className="text-muted-foreground">알림이 차단돼 있어요. 휴대폰 설정에서 이 사이트(또는 돌봄이음 앱)의 알림을 허용해 주세요.</p>
      )}
      {message && (
        <p role="status" className={message.ok ? "text-normal" : "text-caution"}>
          {message.text}
        </p>
      )}
      {status !== "unsupported" && status !== "ios-home" && (
        <p className="text-xs text-muted-foreground">알림은 늦거나 오지 않을 수 있어요. 급한 일은 전화로 연락합니다.</p>
      )}
    </section>
  );
}
