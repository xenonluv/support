import { Suspense } from "react";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { ToneBadge } from "@/components/tone-badge";
import { clientLabel } from "@/lib/client-label";
import { getClientList } from "@/lib/clients/data";
import { seoulMonthDay } from "@/lib/records/dates";
import { cn } from "@/lib/utils";

export default function ClientsPage({ searchParams }: PageProps<"/clients">) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <p className="text-sm text-muted-foreground">
        돌봄이음 <span aria-hidden="true">/</span> <span className="font-medium text-primary">대상자 관리</span>
      </p>
      <Suspense fallback={<p className="text-sm text-muted-foreground">대상자를 불러오는 중…</p>}>
        <ClientsContent searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ClientsContent({ searchParams }: Pick<PageProps<"/clients">, "searchParams">) {
  const { closed: raw } = await searchParams;
  const closed = raw === "1";
  const data = await getClientList(closed);
  if (!data) return <p className="text-sm text-muted-foreground">로그인 정보를 확인하지 못했습니다.</p>;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold lg:text-3xl">대상자 관리</h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground break-keep">
            식별번호·연령대·동과 함께 돌볼 기관만 관리합니다. 어르신 성명은 기관 대응표(종이)에만 적어 두세요.
            {!data.canEdit && " 등록·수정은 동 행정복지센터 담당자가 합니다."}
          </p>
        </div>
        {data.canEdit && (
          <Link href="/clients/new" className={buttonVariants({ size: "lg", className: "h-10 px-4" })}>
            <Plus aria-hidden="true" />
            대상자 등록
          </Link>
        )}
      </header>
      <nav aria-label="상태" className="flex w-fit gap-1 rounded-lg border bg-card p-1">
        {[
          { label: "진행 중", href: "/clients", on: !closed },
          { label: "종결", href: "/clients?closed=1", on: closed },
        ].map((t) => (
          <Link
            key={t.label}
            href={t.href}
            aria-current={t.on ? "page" : undefined}
            className={cn("rounded-md px-3 py-1.5 text-sm font-medium", t.on ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
          >
            {t.label}
          </Link>
        ))}
      </nav>
      {data.clients.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
          {closed ? "종결한 대상자가 없습니다." : "등록된 대상자가 없습니다."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {data.clients.map((c) => {
            const label = clientLabel(c);
            return (
              <li key={c.id}>
                <Link href={`/clients/${c.id}`} className="flex items-center gap-3 rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">{label.title}</p>
                    <p className="text-sm text-muted-foreground">{label.subtitle}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {c.agencies.map((a) => (
                        <ToneBadge key={a.id} tone="neutral">
                          {a.name}
                        </ToneBadge>
                      ))}
                    </div>
                    <p className="mt-2 text-sm">
                      기록 {c.recordCount}건{c.lastVisitedAt && ` · 마지막 방문 ${seoulMonthDay(c.lastVisitedAt)}`}
                      {c.closedAt && ` · ${seoulMonthDay(c.closedAt)} 종결`}
                    </p>
                  </div>
                  <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
