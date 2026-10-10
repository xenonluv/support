"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/copy-button";

/** 연계 알림 문안. [수정]으로 고친 뒤 [복사]해 기존 채널(문자·메신저)로 사람이 보낸다. */
export function AlertDraft({ initialText }: { initialText: string }) {
  const [text, setText] = useState(initialText);
  const [editing, setEditing] = useState(false);

  return (
    <section aria-labelledby="draft-heading" className="rounded-xl bg-muted p-4">
      <h2 id="draft-heading" className="font-semibold">
        연계 알림 문안
      </h2>
      {editing ? (
        <textarea
          aria-label="연계 알림 문안 수정"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={6}
          className="mt-3 w-full rounded-lg border bg-card p-3 text-sm leading-relaxed"
        />
      ) : (
        <p className="mt-3 rounded-lg border bg-card p-3 text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
      )}
      <div className="mt-3 grid grid-cols-2 items-start gap-2">
        <Button variant="outline" size="lg" className="h-11 text-base" onClick={() => setEditing((v) => !v)}>
          {editing ? "수정 완료" : "수정"}
        </Button>
        <CopyButton text={text} />
      </div>
    </section>
  );
}
