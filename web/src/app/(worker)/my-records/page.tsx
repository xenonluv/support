import { Suspense } from "react";
import Link from "next/link";
import { CopyButton } from "@/components/copy-button";
import { ToneBadge } from "@/components/tone-badge";
import { buttonVariants } from "@/components/ui/button";
import { getMyRecords } from "@/lib/records/data";
import { seoulDate, seoulMonthDay } from "@/lib/records/dates";
import { cn } from "@/lib/utils";
import { formatRecordText } from "@/schemas/record-draft";

export default function MyRecordsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold">내 기록</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
        <RecordList />
      </Suspense>
    </div>
  );
}

async function RecordList() {
  const records = await getMyRecords();
  if (records.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border bg-card p-8 text-center">
        <p className="font-medium">아직 작성한 기록이 없습니다</p>
        <p className="text-sm text-muted-foreground">방문 후 기록하면 여기에서 다시 보고 복사할 수 있어요</p>
        <Link href="/record" className={cn(buttonVariants({ size: "lg" }), "h-11 text-base")}>
          기록하기
        </Link>
      </div>
    );
  }
  return (
    <ul className="flex flex-col gap-3">
      {records.map((r) => {
        const text = formatRecordText(r.final, { clientCode: r.clientCode, date: seoulDate(r.visitedAt) });
        return (
          <li key={r.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold">
                {r.clientCode} · {seoulMonthDay(r.visitedAt)}
              </p>
              <ToneBadge tone={r.edited ? "neutral" : "normal"}>{r.edited ? "고쳐서 저장" : "초안 그대로"}</ToneBadge>
            </div>
            <p className="text-sm leading-relaxed">{r.final.summary || "(요약 없음)"}</p>
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">전체 보기</summary>
              <pre className="mt-2 font-sans leading-relaxed whitespace-pre-wrap">{text}</pre>
            </details>
            <CopyButton text={text} />
          </li>
        );
      })}
    </ul>
  );
}
