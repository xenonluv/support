"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { Mic, Square } from "lucide-react";
import { CopyButton } from "@/components/copy-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { describeBrowser, externalOpenUrl, permissionHelp } from "@/lib/audio/browser";
import { readAudioEnvironment } from "@/lib/audio/environment";
import { formatBytes, formatDuration } from "@/lib/audio/format";
import { audioFileName } from "@/lib/audio/mime";
import { buildReport, type SpeechMode } from "@/lib/audio/report";
import { useRecorder } from "@/lib/audio/use-recorder";
import { useSpeechPreview } from "@/lib/audio/use-speech-preview";
import { cn } from "@/lib/utils";

const noSubscribe = () => () => {};
const serverSnapshot = () => null;

const SPEECH_ERROR_LABEL: Record<string, string> = {
  "not-allowed": "실시간 글자 권한이 거부됐어요",
  "service-not-allowed": "이 브라우저에서는 실시간 글자 서비스를 쓸 수 없어요",
  "audio-capture": "마이크 소리를 받지 못했어요 (녹음 등 다른 기능이 마이크를 쓰는 중일 수 있어요)",
  "no-speech": "말소리를 듣지 못했어요",
  network: "인터넷 연결 문제로 인식하지 못했어요",
  "not-supported": "이 브라우저는 실시간 글자를 지원하지 않아요",
  "start-failed": "실시간 글자를 시작하지 못했어요",
  aborted: "실시간 글자가 중간에 멈췄어요",
};

type SttState = { status: "idle" | "loading" | "ok" | "error"; text: string; ms: number | null; error: string | null };
const IDLE_STT: SttState = { status: "idle", text: "", ms: null, error: null };

const STT_ERROR_LABEL: Record<string, string> = {
  forbidden: "허용되지 않은 요청이에요",
  "too-large": "녹음이 너무 길어요(4MB 초과)",
  "not-configured": "서버에 Groq 키가 설정되지 않았어요",
  "stt-failed": "Groq 변환에 실패했어요",
  network: "인터넷 연결에 문제가 있어요",
};

const PERMISSION_LABEL: Record<PermissionState, string> = {
  granted: "허용됨",
  denied: "거부됨",
  prompt: "아직 묻지 않음",
};

/** 마이크 권한 상태(브라우저가 알려 주는 경우만). 바뀌면 따라 갱신한다. */
function usePermissionLabel(): string {
  const [label, setLabel] = useState("확인 불가");
  useEffect(() => {
    let status: PermissionStatus | null = null;
    let cancelled = false;
    navigator.permissions
      ?.query({ name: "microphone" as PermissionName })
      .then((s) => {
        if (cancelled) return;
        status = s;
        setLabel(PERMISSION_LABEL[s.state]);
        s.onchange = () => setLabel(PERMISSION_LABEL[s.state]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (status) status.onchange = null;
    };
  }, []);
  return label;
}

export function MicTest() {
  const env = useSyncExternalStore(noSubscribe, readAudioEnvironment, serverSnapshot);
  const permission = usePermissionLabel();
  const rec = useRecorder();
  const speech = useSpeechPreview();
  const [withSpeech, setWithSpeech] = useState(false);
  const [speechMode, setSpeechMode] = useState<SpeechMode | null>(null);
  const [playbackOk, setPlaybackOk] = useState<boolean | null>(null);
  const [stt, setStt] = useState<SttState>(IDLE_STT);
  const { stop: stopSpeech } = speech;

  // 2분 자동 종료 등으로 녹음이 끝나면, 녹음과 함께 켠 실시간 글자도 멈춘다
  useEffect(() => {
    if (speechMode === "with-recording" && rec.status !== "recording") stopSpeech();
  }, [rec.status, speechMode, stopSpeech]);

  if (!env) return <p className="text-sm text-muted-foreground">기기 정보를 확인하는 중…</p>;

  const recording = rec.status === "recording";
  const openUrl = env.browser.inApp ? externalOpenUrl(env.browser, env.pageUrl) : null;

  async function handleStart() {
    setPlaybackOk(null);
    setStt(IDLE_STT);
    const ok = await rec.start();
    if (ok && withSpeech) {
      setSpeechMode("with-recording");
      speech.start();
    }
  }

  /** 녹음을 서버로 보내 글자로 바꾼다. 걸린 시간은 업로드부터 응답까지(사용자가 기다리는 시간). */
  async function handleTranscribe() {
    const current = rec.recording;
    if (!current) return;
    setStt({ ...IDLE_STT, status: "loading" });
    const started = performance.now();
    try {
      const blob = await (await fetch(current.url)).blob();
      const form = new FormData();
      form.append("audio", blob, audioFileName(current.mimeType));
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      const ms = Math.round(performance.now() - started);
      if (res.ok && typeof data.text === "string") setStt({ status: "ok", text: data.text, ms, error: null });
      else setStt({ status: "error", text: "", ms, error: data.error ?? `http-${res.status}` });
    } catch {
      setStt({ status: "error", text: "", ms: null, error: "network" });
    }
  }

  const listeningAlone = speechMode === "alone" && speech.phase === "listening";

  function toggleSpeechAlone() {
    if (listeningAlone) {
      speech.stop();
      return;
    }
    setSpeechMode("alone");
    speech.start();
  }

  function handleStop() {
    rec.stop();
    speech.stop();
  }

  const report = buildReport({
    env,
    permission,
    recording: rec.recording,
    recorderError: rec.errorName,
    playbackOk,
    speech: { mode: speechMode, textLength: speech.text.length, error: speech.error },
    transcription: { status: stt.status, ms: stt.ms, textLength: stt.text.length, error: stt.error },
  });

  return (
    <div className="flex flex-col gap-5">
      {env.browser.inApp && (
        <section className="rounded-xl border border-caution/20 bg-caution-soft p-4">
          <h2 className="font-bold text-caution">앱 안의 브라우저에서는 마이크가 막힐 수 있어요</h2>
          <p className="mt-1 text-sm">크롬(안드로이드)이나 사파리(아이폰)에서 열어 주세요.</p>
          {openUrl ? (
            <a href={openUrl} className={cn(buttonVariants({ size: "lg" }), "mt-3 h-11 w-full text-base")}>
              다른 브라우저로 열기
            </a>
          ) : (
            <p className="mt-2 text-sm">화면의 ⋯ 메뉴에서 ‘다른 브라우저로 열기’ 또는 ‘Safari로 열기’를 누르세요.</p>
          )}
        </section>
      )}

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={recording ? handleStop : handleStart}
          disabled={rec.status === "requesting"}
          className={cn(
            "flex size-40 flex-col items-center justify-center gap-1 rounded-full text-white shadow-lg transition-colors disabled:opacity-60",
            recording ? "bg-caution" : "bg-primary",
          )}
        >
          {recording ? <Square className="size-10" aria-hidden="true" /> : <Mic className="size-12" aria-hidden="true" />}
          <span className="text-lg font-bold">
            {rec.status === "requesting" ? "권한 확인 중…" : recording ? "녹음 중지" : "녹음 시작"}
          </span>
          {recording && (
            <span className="text-sm tabular-nums">
              {formatDuration(rec.elapsedMs)} / {formatDuration(rec.maxMs)}
            </span>
          )}
        </button>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-1 size-4"
            checked={withSpeech}
            disabled={!env.speechRecognition || recording}
            onChange={(e) => setWithSpeech(e.target.checked)}
          />
          <span>
            녹음하면서 실시간 글자도 시험하기
            {!env.speechRecognition && <span className="text-muted-foreground"> (이 브라우저는 지원 안 함)</span>}
            <span className="block text-xs text-muted-foreground">
              실시간 글자는 브라우저 회사(구글·애플) 서버에서 처리될 수 있어요. 테스트 문장만 말해 주세요.
            </span>
          </span>
        </label>
        <Button
          variant="outline"
          size="lg"
          className="h-11 w-full text-base"
          disabled={!env.speechRecognition || recording}
          onClick={toggleSpeechAlone}
        >
          {listeningAlone ? "실시간 글자 그만 듣기" : "실시간 글자만 따로 시험하기 (녹음 없이)"}
        </Button>
      </div>

      {speechMode && speech.phase !== "idle" && (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="text-sm font-semibold">
            실시간 글자 ({speechMode === "alone" ? "단독" : "녹음과 동시"})
          </h2>
          <p className={cn("mt-1 min-h-6 text-sm", !speech.text && "text-muted-foreground")}>
            {speech.text || (speech.phase === "listening" ? "듣는 중… 말해 보세요" : "인식된 글자가 없어요")}
          </p>
          {speech.error && (
            <p className="mt-1 text-xs text-caution">
              {SPEECH_ERROR_LABEL[speech.error] ?? "오류가 났어요"} ({speech.error})
            </p>
          )}
        </section>
      )}

      {rec.status === "denied" && (
        <section className="rounded-xl border border-caution/20 bg-caution-soft p-4">
          <h2 className="font-bold text-caution">마이크 권한이 꺼져 있어요</h2>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
            {permissionHelp(env.browser).map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </section>
      )}
      {rec.status === "unsupported" && (
        <p className="rounded-xl bg-caution-soft p-4 text-sm text-caution">
          이 브라우저는 녹음을 지원하지 않습니다. 크롬이나 사파리로 열어 주세요.
        </p>
      )}
      {rec.status === "error" && (
        <p className="rounded-xl bg-caution-soft p-4 text-sm text-caution">녹음 중 오류가 났습니다 ({rec.errorName}).</p>
      )}

      {rec.recording && (
        <section className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          <h2 className="font-semibold">녹음 결과</h2>
          <audio controls src={rec.recording.url} className="w-full" />
          <p className="text-sm text-muted-foreground">
            {rec.recording.mimeType} · {formatBytes(rec.recording.size)} · {formatDuration(rec.recording.durationMs)}
            {rec.recording.autoStopped && " · 2분이 지나 자동으로 멈췄어요"}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={playbackOk === true ? "default" : "outline"}
              size="lg"
              className="h-11 text-base"
              onClick={() => setPlaybackOk(true)}
            >
              소리 잘 들림
            </Button>
            <Button
              variant={playbackOk === false ? "default" : "outline"}
              size="lg"
              className="h-11 text-base"
              onClick={() => setPlaybackOk(false)}
            >
              안 들림
            </Button>
          </div>
          <div className="flex flex-col gap-2 border-t pt-3">
            <Button size="lg" className="h-11 text-base" disabled={stt.status === "loading"} onClick={handleTranscribe}>
              {stt.status === "loading" ? "글자로 바꾸는 중…" : "글자로 변환 (서버)"}
            </Button>
            <p className="text-xs text-muted-foreground">
              녹음을 Groq(미국) 서버로 보내 글자로 바꿉니다. 돌봄이음은 녹음과 글자를 저장하지 않습니다. 테스트 문장만
              말해 주세요.
            </p>
            {stt.status === "ok" && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-sm leading-relaxed">{stt.text || "(인식된 글자가 없어요)"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{((stt.ms ?? 0) / 1000).toFixed(1)}초 걸림</p>
              </div>
            )}
            {stt.status === "error" && (
              <p className="text-sm text-caution">
                글자로 바꾸지 못했어요: {STT_ERROR_LABEL[stt.error ?? ""] ?? "알 수 없는 오류"} ({stt.error})
              </p>
            )}
          </div>
        </section>
      )}

      <section className="rounded-xl border bg-card p-4">
        <h2 className="font-semibold">이 기기 정보</h2>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">기기·브라우저</dt>
          <dd>
            {describeBrowser(env.browser)}
            {env.standalone && " (홈 화면 앱)"}
          </dd>
          <dt className="text-muted-foreground">보안 연결(HTTPS)</dt>
          <dd>{env.secureContext ? "예" : "아니오"}</dd>
          <dt className="text-muted-foreground">마이크 권한</dt>
          <dd>{permission}</dd>
          <dt className="text-muted-foreground">녹음 기능</dt>
          <dd>{env.getUserMedia && env.mediaRecorder ? "지원" : "미지원"}</dd>
          <dt className="text-muted-foreground">녹음 형식</dt>
          <dd className="break-all">{env.mimeType ?? "브라우저 기본값"}</dd>
          <dt className="text-muted-foreground">실시간 글자</dt>
          <dd>{env.speechRecognition ? "지원" : "미지원"}</dd>
          <dt className="text-muted-foreground">화면 꺼짐 방지</dt>
          <dd>{env.wakeLock ? "지원" : "미지원"}</dd>
        </dl>
      </section>

      <section className="flex flex-col gap-2 rounded-xl border bg-card p-4">
        <h2 className="font-semibold">결과 보내기</h2>
        <p className="text-sm text-muted-foreground">
          녹음·재생까지 해 본 뒤 복사해서 개발 담당에게 붙여 넣어 주세요. 말한 내용은 들어가지 않습니다.
        </p>
        <CopyButton text={report} />
      </section>
    </div>
  );
}
