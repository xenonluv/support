"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { pickMimeType } from "@/lib/audio/mime";
import type { Recording } from "@/lib/audio/types";

/** 녹음 최대 길이(업로드 크기·비용 관리). 넘으면 자동으로 멈춘다. */
export const MAX_RECORDING_MS = 120_000;

export type RecorderStatus = "idle" | "requesting" | "recording" | "stopped" | "denied" | "unsupported" | "error";

type Session = {
  stream: MediaStream;
  recorder: MediaRecorder;
  chunks: Blob[];
  startedAt: number;
  autoStopTimer: ReturnType<typeof setTimeout>;
  ticker: ReturnType<typeof setInterval>;
  wakeLock: WakeLockSentinel | null;
  autoStopped: boolean;
};

/**
 * 휴대폰 마이크 녹음. 결과는 브라우저 메모리(Blob URL)에만 두고 저장·전송하지 않는다.
 * 녹음 중에는 화면 꺼짐을 막고, 끝나면 마이크와 화면 꺼짐 방지를 모두 해제한다.
 */
export function useRecorder(maxMs = MAX_RECORDING_MS) {
  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [recording, setRecording] = useState<Recording | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [errorName, setErrorName] = useState<string | null>(null);
  const session = useRef<Session | null>(null);
  const lastUrl = useRef<string | null>(null);

  const release = useCallback(() => {
    const s = session.current;
    if (!s) return;
    session.current = null;
    clearTimeout(s.autoStopTimer);
    clearInterval(s.ticker);
    s.stream.getTracks().forEach((t) => t.stop());
    s.wakeLock?.release().catch(() => {});
  }, []);

  const stop = useCallback(() => {
    const recorder = session.current?.recorder;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  }, []);

  /** 녹음을 시작한다. 마이크를 열지 못하면 false. */
  const start = useCallback(async (): Promise<boolean> => {
    if (session.current) return false;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setStatus("unsupported");
      return false;
    }
    setStatus("requesting");
    setErrorName(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
    } catch (e) {
      const name = e instanceof DOMException ? e.name : "UnknownError";
      setErrorName(name);
      setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "error");
      return false;
    }

    const mimeType = pickMimeType((t) => MediaRecorder.isTypeSupported(t));
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const startedAt = Date.now();
    const s: Session = {
      stream,
      recorder,
      chunks: [],
      startedAt,
      autoStopTimer: setTimeout(() => {
        s.autoStopped = true;
        stop();
      }, maxMs),
      ticker: setInterval(() => setElapsedMs(Date.now() - startedAt), 250),
      wakeLock: null,
      autoStopped: false,
    };

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) s.chunks.push(e.data);
    };
    recorder.onstop = () => {
      const type = recorder.mimeType || mimeType || "audio/webm";
      const blob = new Blob(s.chunks, { type });
      if (lastUrl.current) URL.revokeObjectURL(lastUrl.current);
      const url = URL.createObjectURL(blob);
      lastUrl.current = url;
      setRecording({ url, mimeType: type, size: blob.size, durationMs: Date.now() - s.startedAt, autoStopped: s.autoStopped });
      setStatus("stopped");
      release();
    };
    recorder.onerror = () => {
      setErrorName("RecorderError");
      setStatus("error");
      release();
    };

    session.current = s;
    recorder.start();
    setElapsedMs(0);
    setRecording(null);
    setStatus("recording");

    const lock = await navigator.wakeLock?.request("screen").catch(() => null);
    if (session.current === s) s.wakeLock = lock ?? null;
    else lock?.release().catch(() => {});
    return true;
  }, [maxMs, release, stop]);

  useEffect(() => {
    const urlRef = lastUrl;
    return () => {
      release();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [release]);

  return { status, recording, elapsedMs, errorName, maxMs, start, stop };
}
