"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Web Speech API는 TypeScript 기본 타입에 없어 필요한 만큼만 정의한다.
type SpeechResultLike = { readonly length: number; readonly [i: number]: { transcript: string } };
type SpeechEventLike = { results: { readonly length: number; readonly [i: number]: SpeechResultLike } };
type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechEventLike) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

export function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: SpeechRecognitionCtor; webkitSpeechRecognition?: SpeechRecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/**
 * 말하는 동안 글자를 미리 보여 주는 실시간 인식(보조 기능).
 * 브라우저에 따라 음성이 구글·애플 서버에서 처리될 수 있다.
 */
export function useSpeechPreview() {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const active = useRef<SpeechRecognitionLike | null>(null);

  const start = useCallback(() => {
    const Ctor = getSpeechRecognition();
    if (!Ctor) {
      setError("not-supported");
      return;
    }
    const r = new Ctor();
    r.lang = "ko-KR";
    r.continuous = true;
    r.interimResults = true;
    r.onresult = (e) => {
      let out = "";
      for (let i = 0; i < e.results.length; i++) out += e.results[i][0].transcript;
      setText(out);
    };
    r.onerror = (e) => setError(e.error);
    r.onend = () => {
      if (active.current === r) active.current = null;
    };
    setText("");
    setError(null);
    try {
      r.start();
      active.current = r;
    } catch {
      setError("start-failed");
    }
  }, []);

  const stop = useCallback(() => {
    active.current?.stop();
  }, []);

  useEffect(() => {
    const ref = active;
    return () => ref.current?.stop();
  }, []);

  return { text, error, start, stop };
}
