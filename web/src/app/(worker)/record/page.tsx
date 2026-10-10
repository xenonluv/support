import { Suspense } from "react";
import { getMyClients } from "@/lib/records/data";
import { RecordFlow } from "./record-flow";

export default function RecordPage({ searchParams }: PageProps<"/record">) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">기록하기</h1>
        <p className="text-sm text-muted-foreground">말로 남기면 AI가 기록 초안을 만들어 드려요</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">대상자 목록을 불러오는 중…</p>}>
        <RecordLoader searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function RecordLoader({ searchParams }: Pick<PageProps<"/record">, "searchParams">) {
  const [{ client }, clients] = await Promise.all([searchParams, getMyClients()]);
  return (
    <RecordFlow
      clients={clients.map(({ code, ageBand, dong }) => ({ code, ageBand, dong }))}
      initialCode={typeof client === "string" ? client : null}
    />
  );
}
