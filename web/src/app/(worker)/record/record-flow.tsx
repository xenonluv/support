"use client";

import { useState } from "react";
import Link from "next/link";
import { Keyboard, Mic, Square } from "lucide-react";
import { AiNotice } from "@/components/ai-notice";
import { CopyButton } from "@/components/copy-button";
import { Button, buttonVariants } from "@/components/ui/button";
import { audioFileName } from "@/lib/audio/mime";
import { formatDuration } from "@/lib/audio/format";
import { useRecorder } from "@/lib/audio/use-recorder";
import { clientLabel } from "@/lib/client-label";
import { saveRecord } from "@/lib/records/actions";
import { seoulDate } from "@/lib/records/dates";
import { cn } from "@/lib/utils";
import { MAX_DURATION_MS, RECORD_FIELDS, SERVICE_TYPES, formatRecordText, type RecordDraft } from "@/schemas/record-draft";

export type RecordClient = { code: string; ageBand: number | null; dong: string };

type Mode = "voice" | "text";

const EMPTY_DRAFT: RecordDraft = {
  summary: "",
  service_types: [],
  health: "",
  medication: "",
  meals: "",
  mood: "",
  living: "",
  services_provided: "",
  notes: "",
  follow_up: "",
};

const API_ERROR: Record<string, string> = {
  refused: "AI가 이 내용으로는 초안을 만들지 못했어요. 아래 '직접 작성하기'로 입력해 주세요.",
  "invalid-input": "구술 내용이 너무 짧거나 깁니다.",
  unauthorized: "로그인이 풀렸어요. 다시 로그인해 주세요.",
  "not-configured": "서버 설정이 아직 끝나지 않았어요. 담당자에게 알려 주세요.",
  "stt-failed": "글자로 바꾸지 못했어요. 다시 녹음하거나 글로 입력해 주세요.",
  "too-large": "녹음이 너무 길어요. 2분 안으로 다시 녹음해 주세요.",
};

const TEXTAREA = "w-full rounded-lg border bg-card p-3 text-base leading-relaxed outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

export function RecordFlow({ clients, initialCode }: { clients: RecordClient[]; initialCode: string | null }) {
  const [clientCode, setClientCode] = useState(
    initialCode && clients.some((c) => c.code === initialCode) ? initialCode : (clients[0]?.code ?? ""),
  );
  const [mode, setMode] = useState<Mode>("voice");
  const [transcript, setTranscript] = useState("");
  const [sttEngine, setSttEngine] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [busy, setBusy] = useState<"transcribing" | "drafting" | "saving" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<RecordDraft | null>(null);
  const [final, setFinal] = useState<RecordDraft | null>(null);
  const [draftDate, setDraftDate] = useState("");
  const [saved, setSaved] = useState(false);

  async function transcribe(blob: Blob, mimeType: string) {
    setBusy("transcribing");
    setError(null);
    try {
      const form = new FormData();
      form.append("audio", blob, audioFileName(mimeType));
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = (await res.json().catch(() => ({}))) as { text?: string; engine?: string; error?: string };
      if (!res.ok || typeof data.text !== "string") throw new Error(data.error ?? "stt-failed");
      const text = data.text;
      setTranscript((prev) => (prev ? `${prev} ${text}` : text));
      setSttEngine(data.engine ?? null);
    } catch (e) {
      setError(API_ERROR[(e as Error).message] ?? API_ERROR["stt-failed"]);
    } finally {
      setBusy(null);
    }
  }

  const rec = useRecorder(undefined, (recording, blob) => void transcribe(blob, recording.mimeType));
  const recording = rec.status === "recording";

  function markStarted() {
    setStartedAt((prev) => prev ?? Date.now());
  }

  async function handleRecord() {
    if (recording) return rec.stop();
    markStarted();
    setError(null);
    await rec.start();
  }

  async function makeDraft() {
    setBusy("drafting");
    setError(null);
    try {
      const res = await fetch("/api/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = (await res.json().catch(() => ({}))) as { draft?: RecordDraft; transcript?: string; error?: string };
      if (!res.ok || !data.draft) throw new Error(data.error ?? "draft-failed");
      openEditor(data.draft, data.transcript ?? transcript);
    } catch (e) {
      setError(API_ERROR[(e as Error).message] ?? "초안을 만들지 못했어요. 잠시 뒤 다시 시도하거나 직접 작성해 주세요.");
    } finally {
      setBusy(null);
    }
  }

  function openEditor(next: RecordDraft, maskedTranscript: string) {
    markStarted();
    setError(null);
    setDraft(next);
    setFinal(next);
    setTranscript(maskedTranscript);
    setDraftDate(seoulDate(new Date().toISOString()));
  }

  async function handleSave() {
    if (!draft || !final) return;
    setBusy("saving");
    setError(null);
    try {
      const result = await saveRecord({
        clientCode,
        transcript,
        draft,
        final,
        inputMode: mode,
        sttEngine: mode === "voice" ? sttEngine : null,
        durationMs: startedAt ? Math.min(Date.now() - startedAt, MAX_DURATION_MS) : 0,
      });
      if (result.ok) setSaved(true);
      else setError(result.error);
    } catch {
      // 신호가 약해 서버에 닿지 못한 경우 — 고친 내용은 화면에 그대로 남아 있다
      setError("저장하지 못했어요. 인터넷 연결을 확인하고 다시 [저장]을 눌러 주세요.");
    } finally {
      setBusy(null);
    }
  }

  function reset() {
    setTranscript("");
    setSttEngine(null);
    setStartedAt(null);
    setDraft(null);
    setFinal(null);
    setSaved(false);
    setError(null);
  }

  if (clients.length === 0) {
    return <p className="rounded-xl border bg-card p-6 text-center text-sm">담당 대상자가 없습니다. 기관 담당자에게 문의해 주세요.</p>;
  }

  const target = clients.find((c) => c.code === clientCode) ?? clients[0];
  const label = clientLabel(target);
  const copyText = final ? formatRecordText(final, { clientCode, date: draftDate }) : "";

  if (saved && final) {
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-xl border border-normal/30 bg-normal-soft p-4">
          <p className="font-bold text-normal">저장했어요</p>
          <p className="mt-1 text-sm">{label.title} · {draftDate}</p>
        </div>
        <pre className="rounded-xl border bg-card p-4 font-sans text-sm leading-relaxed whitespace-pre-wrap">{copyText}</pre>
        <CopyButton text={copyText} />
        <div className="grid grid-cols-2 gap-2">
          <Link href="/my-records" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 text-base")}>
            내 기록 보기
          </Link>
          <Button size="lg" variant="outline" className="h-11 text-base" onClick={reset}>
            새 기록
          </Button>
        </div>
      </div>
    );
  }

  if (draft && final) {
    const set = <K extends keyof RecordDraft>(key: K, value: RecordDraft[K]) => setFinal({ ...final, [key]: value });
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold">기록 초안 확인</h2>
          <span className="text-sm text-muted-foreground">{label.title}</span>
        </div>
        <section aria-label="서비스 유형" className="flex flex-wrap gap-2">
          {SERVICE_TYPES.map((t) => {
            const on = final.service_types.includes(t);
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => set("service_types", on ? final.service_types.filter((x) => x !== t) : [...final.service_types, t])}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium",
                  on ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
                )}
              >
                {t}
              </button>
            );
          })}
        </section>
        {RECORD_FIELDS.map(({ key, label: fieldLabel }) => (
          <label key={key} className="flex flex-col gap-1.5 text-sm font-medium">
            {fieldLabel}
            <textarea
              value={final[key]}
              onChange={(e) => set(key, e.target.value)}
              rows={key === "summary" ? 2 : 3}
              placeholder="해당 없음"
              className={TEXTAREA}
            />
          </label>
        ))}
        {error && <p role="alert" className="text-sm text-caution">{error}</p>}
        <div className="grid grid-cols-2 gap-2">
          <CopyButton text={copyText} />
          <Button size="lg" className="h-11 text-base" disabled={busy === "saving"} onClick={handleSave}>
            {busy === "saving" ? "저장 중…" : "저장"}
          </Button>
        </div>
        <AiNotice />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        대상자
        <select
          value={clientCode}
          onChange={(e) => setClientCode(e.target.value)}
          className="h-12 rounded-lg border bg-card px-3 text-base"
        >
          {clients.map((c) => {
            const l = clientLabel(c);
            return (
              <option key={c.code} value={c.code}>
                {l.title} · {l.subtitle}
              </option>
            );
          })}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="입력 방식">
        {(["voice", "text"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            disabled={recording}
            onClick={() => setMode(m)}
            className={cn(
              "flex h-11 items-center justify-center gap-2 rounded-lg border text-base font-medium",
              mode === m ? "border-primary bg-primary/10 text-primary" : "bg-card text-muted-foreground",
            )}
          >
            {m === "voice" ? <Mic className="size-4" aria-hidden="true" /> : <Keyboard className="size-4" aria-hidden="true" />}
            {m === "voice" ? "말로 기록" : "글로 입력"}
          </button>
        ))}
      </div>

      {mode === "voice" && (
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleRecord}
            disabled={rec.status === "requesting" || busy !== null}
            className={cn(
              "flex size-40 flex-col items-center justify-center gap-1 rounded-full text-white shadow-lg disabled:opacity-60",
              recording ? "bg-caution" : "bg-primary",
            )}
          >
            {recording ? <Square className="size-10" aria-hidden="true" /> : <Mic className="size-12" aria-hidden="true" />}
            <span className="text-lg font-bold">
              {recording ? "녹음 마치기" : busy === "transcribing" ? "글자로 바꾸는 중…" : transcript ? "이어서 녹음" : "녹음 시작"}
            </span>
            {recording && (
              <span className="text-sm tabular-nums">
                {formatDuration(rec.elapsedMs)} / {formatDuration(rec.maxMs)}
              </span>
            )}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            방문 직후 30초 정도 말씀해 주세요. 이름 대신 식별번호로 말하면 더 안전합니다.
          </p>
          {rec.status === "denied" && (
            <p className="text-center text-sm text-caution">마이크 권한이 꺼져 있어요. 마이크 테스트 화면에서 허용 방법을 확인하세요.</p>
          )}
        </div>
      )}

      <label className="flex flex-col gap-1.5 text-sm font-medium">
        {mode === "voice" ? "받아 적은 내용 (고칠 수 있어요)" : "방문 내용"}
        <textarea
          value={transcript}
          onChange={(e) => {
            markStarted();
            setTranscript(e.target.value);
          }}
          rows={6}
          placeholder={mode === "voice" ? "녹음을 마치면 여기에 글자가 나와요" : "예: 어르신께서 혈압약을 이틀째 안 드셨고 점심을 절반만 드셨어요."}
          className={TEXTAREA}
        />
      </label>

      {error && <p role="alert" className="text-sm text-caution">{error}</p>}

      <Button
        size="lg"
        className="h-12 text-base"
        disabled={transcript.trim().length < 5 || busy !== null || recording}
        onClick={makeDraft}
      >
        {busy === "drafting" ? "초안 만드는 중…" : "기록 초안 만들기"}
      </Button>
      <button
        type="button"
        disabled={recording || busy !== null}
        className="text-sm text-muted-foreground underline underline-offset-4 disabled:opacity-50"
        onClick={() => openEditor(EMPTY_DRAFT, transcript)}
      >
        AI 없이 직접 작성하기
      </button>
      <AiNotice />
    </div>
  );
}
