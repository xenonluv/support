import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ClientClosedButton, ClientForm } from "@/components/client-form";
import { ToneBadge } from "@/components/tone-badge";
import { clientLabel } from "@/lib/client-label";
import { getClientEdit } from "@/lib/clients/data";
import { seoulDateTime, seoulMonthDay } from "@/lib/records/dates";
import { AGENCY_TYPE_LABEL } from "@/schemas/client";

type Props = PageProps<"/clients/[clientId]">;

export default function ClientPage({ params }: Props) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <Link href="/clients" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        대상자 관리
      </Link>
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
        <ClientDetail params={params} />
      </Suspense>
    </div>
  );
}

async function ClientDetail({ params }: Pick<Props, "params">) {
  const { clientId } = await params;
  const data = await getClientEdit(clientId);
  if (!data) notFound();
  const { client, history } = data;
  const label = clientLabel(client);
  const closed = client.closedAt !== null;

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            {label.title}
            {closed && <ToneBadge tone="neutral">종결</ToneBadge>}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {label.subtitle} · 기록 {client.recordCount}건{client.lastVisitedAt && ` · 마지막 방문 ${seoulMonthDay(client.lastVisitedAt)}`}
            {client.closedAt && ` · ${seoulMonthDay(client.closedAt)} 종결`}
          </p>
        </div>
        {data.canEdit && <ClientClosedButton clientId={client.id} closed={closed} />}
      </header>

      {data.canEdit ? (
        <div className="rounded-xl border bg-card p-5">
          <ClientForm mode="edit" client={client} myAgencyId={data.agencyId} myAgencyName={data.agencyName} options={data.options} />
        </div>
      ) : (
        <section className="flex flex-col gap-2 rounded-xl border bg-card p-5 text-sm">
          <h2 className="font-semibold">함께 돌보는 기관</h2>
          <ul className="flex flex-col gap-1">
            {client.agencies.map((a) => (
              <li key={a.id}>
                {a.name} <span className="text-muted-foreground">· {AGENCY_TYPE_LABEL[a.type]}</span>
              </li>
            ))}
          </ul>
          <p className="text-muted-foreground">수정은 동 행정복지센터 담당자가 합니다.</p>
        </section>
      )}

      <section className="flex flex-col gap-2 rounded-xl border bg-card p-5 text-sm">
        <h2 className="font-semibold">식별번호 변경 이력</h2>
        {history.length === 0 ? (
          <p className="text-muted-foreground">바꾼 적 없음</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {history.map((h) => (
              <li key={h.changedAt}>
                {h.oldCode} → {h.newCode} <span className="text-muted-foreground">· {seoulDateTime(h.changedAt)}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="text-muted-foreground">이전 번호로 저장된 기록·복사한 글도 이 어르신의 기록입니다.</p>
      </section>
    </>
  );
}
