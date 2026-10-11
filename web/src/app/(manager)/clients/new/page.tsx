import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ClientForm } from "@/components/client-form";
import { getRegisterForm } from "@/lib/clients/data";

export default function NewClientPage() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <Link href="/clients" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden="true" />
        대상자 관리
      </Link>
      <h1 className="text-2xl font-bold">대상자 등록</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">불러오는 중…</p>}>
        <RegisterForm />
      </Suspense>
    </div>
  );
}

async function RegisterForm() {
  const data = await getRegisterForm();
  if (!data?.canEdit) {
    return <p className="rounded-xl border bg-card p-6 text-sm">대상자 등록은 동 행정복지센터 담당자만 할 수 있어요.</p>;
  }
  return (
    <div className="rounded-xl border bg-card p-5">
      <ClientForm mode="new" myAgencyId={data.agencyId} myAgencyName={data.agencyName} options={data.options} />
    </div>
  );
}
