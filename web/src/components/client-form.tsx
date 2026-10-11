"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { LoaderCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { registerClient, setClientClosed, updateClient } from "@/lib/clients/actions";
import type { AgencyOption, ManagedClient } from "@/lib/clients/data";
import { cn } from "@/lib/utils";
import { AGE_BANDS, AGENCY_TYPE_LABEL } from "@/schemas/client";

const FIELD = "w-full rounded-lg border bg-card px-3 py-2.5 text-base outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

type Props = { myAgencyId: string; myAgencyName: string; options: AgencyOption[] } & (
  | { mode: "new" }
  | { mode: "edit"; client: ManagedClient }
);

/** 대상자 등록·수정 폼 (동 담당자). 식별번호·연령대·동·함께 돌볼 기관만 받는다 — 성명 칸은 없다. */
export function ClientForm(props: Props) {
  const editing = props.mode === "edit" ? props.client : null;
  const [code, setCode] = useState(editing?.code ?? "");
  const [ageBand, setAgeBand] = useState<number | null>(editing?.ageBand ?? null);
  const [dong, setDong] = useState(editing?.dong ?? "");
  const initialPartners = editing ? editing.agencies.filter((a) => !a.mine).map((a) => a.id) : [];
  const [partners, setPartners] = useState<Set<string>>(new Set(initialPartners));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const others = props.options.filter((o) => o.id !== props.myAgencyId);

  function toggle(id: string) {
    const next = new Set(partners);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setPartners(next);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setDone(null);
    const input = { code: code.trim(), ageBand, dong, partnerAgencyIds: [...partners] };
    if (editing) {
      if (input.code !== editing.code && !confirm(`식별번호를 ${editing.code} → ${input.code}(으)로 바꿀까요?\n기관 대응표도 함께 고쳐 주세요. 이미 복사한 기록에는 옛 번호가 남아요.`)) return;
      const removed = editing.agencies.filter((a) => !a.mine && !partners.has(a.id)).map((a) => a.name);
      if (removed.length > 0 && !confirm(`${removed.join(", ")} 연결을 해제할까요?\n해제한 기관은 이 대상자와 기록을 더 이상 볼 수 없어요.`)) return;
    }
    startTransition(async () => {
      if (editing) {
        const result = await updateClient({ clientId: editing.id, ...input });
        if (result.ok) setDone("저장했어요.");
        else setError(result.error);
      } else {
        const result = await registerClient(input);
        if (result.ok) setDone(result.code);
        else setError(result.error);
      }
    });
  }

  if (!editing && done) {
    return (
      <div className="flex flex-col gap-4 rounded-xl border border-normal/30 bg-normal-soft p-5">
        <p className="text-lg font-bold text-normal">{done}로 등록했어요</p>
        <p className="text-sm break-keep">기관 대응표(종이)에 이 번호와 어르신을 함께 적어 두세요. 현장 화면에는 바로 나타납니다.</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/clients" className={buttonVariants({ size: "lg", className: "h-10 px-4" })}>
            대상자 목록
          </Link>
          <Button
            size="lg"
            variant="outline"
            className="h-10 px-4"
            onClick={() => {
              setDone(null);
              setCode("");
              setAgeBand(null);
              setPartners(new Set());
            }}
          >
            이어서 등록
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        식별번호
        <input
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={editing ? "C-0000" : "비워 두면 다음 번호가 자동으로 붙어요"}
          inputMode="text"
          autoComplete="off"
          className={FIELD}
        />
        <span className="text-xs font-normal text-muted-foreground">C-숫자4자리. 한 번 쓴 번호는 다른 어르신에게 다시 쓰지 않습니다.</span>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        연령대
        <select name="ageBand" value={ageBand ?? ""} onChange={(e) => setAgeBand(e.target.value ? Number(e.target.value) : null)} className={FIELD}>
          <option value="">미입력</option>
          {AGE_BANDS.map((b) => (
            <option key={b} value={b}>
              {b >= 100 ? "100세 이상" : `${b}대`}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5 text-sm font-medium">
        동
        <input name="dong" value={dong} onChange={(e) => setDong(e.target.value)} placeholder="예: 서구 화정1동" autoComplete="off" className={FIELD} />
        <span className="text-xs font-normal text-muted-foreground">동 이름만 적어요. 성명·주소·연락처는 적지 않습니다.</span>
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium">함께 돌볼 기관</legend>
        <p className="text-sm text-muted-foreground">{props.myAgencyName} (우리 기관, 항상 연결)</p>
        {others.length === 0 && <p className="text-sm text-muted-foreground">고를 수 있는 다른 기관이 없습니다.</p>}
        {others.map((o) => (
          <label key={o.id} className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={partners.has(o.id)} onChange={() => toggle(o.id)} className="size-4" />
            {o.name} <span className="text-muted-foreground">· {AGENCY_TYPE_LABEL[o.type]}</span>
          </label>
        ))}
      </fieldset>
      <div className="flex flex-col gap-1">
        <Button type="submit" size="lg" className="h-11 text-base" disabled={pending || dong.trim().length < 2}>
          {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
          {pending ? "저장 중…" : editing ? "저장" : "등록"}
        </Button>
        <p role="status" className={cn("text-sm", error ? "text-caution" : "text-normal")}>
          {error ?? (editing ? done : "") ?? ""}
        </p>
      </div>
    </form>
  );
}

/** 종결(목록에서 숨김, 기록은 그대로) · 다시 진행 */
export function ClientClosedButton({ clientId, closed }: { clientId: string; closed: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run() {
    if (!closed && !confirm("종결하면 현장 화면·이상징후 현황·브리핑 목록에서 빠져요. 기록은 그대로 남고, 다시 진행으로 되돌릴 수 있어요.\n종결할까요?")) return;
    setError(null);
    startTransition(async () => {
      const result = await setClientClosed({ clientId, closed: !closed });
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <Button variant="outline" size="lg" className="h-10 px-4" disabled={pending} onClick={run}>
        {pending && <LoaderCircle className="animate-spin" aria-hidden="true" />}
        {closed ? "다시 진행" : "종결 처리"}
      </Button>
      <p role="status" className="text-sm text-caution">
        {error ?? ""}
      </p>
    </div>
  );
}
