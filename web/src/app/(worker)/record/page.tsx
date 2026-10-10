import { Keyboard, Mic } from "lucide-react";
import { AiNotice } from "@/components/ai-notice";
import { Button } from "@/components/ui/button";
import { clientLabel } from "@/lib/client-label";
import { DEMO_VISITS } from "@/lib/demo";

/** 기록하기 화면 틀. 녹음(4단계)과 초안 생성(6단계)은 이후 연결한다. */
export default function RecordPage() {
  const target = clientLabel(DEMO_VISITS[1].client);
  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div className="w-full text-left">
        <h1 className="text-xl font-bold">기록하기</h1>
        <p className="text-sm text-muted-foreground">방문 직후 30초 정도 말씀해 주세요</p>
      </div>
      <div className="w-full rounded-xl border bg-card p-4 text-left">
        <p className="text-xs text-muted-foreground">대상자</p>
        <p className="font-semibold">{target.title}</p>
        <p className="text-sm text-muted-foreground">{target.subtitle}</p>
      </div>
      <button
        type="button"
        disabled
        aria-describedby="record-help"
        className="flex size-40 flex-col items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg disabled:opacity-60"
      >
        <Mic className="size-12" aria-hidden="true" />
        <span className="text-lg font-bold">녹음 시작</span>
      </button>
      <p id="record-help" className="text-sm text-muted-foreground">
        녹음 기능은 다음 단계에서 연결됩니다
      </p>
      <Button variant="outline" size="lg" disabled className="h-12 w-full text-base">
        <Keyboard aria-hidden="true" />
        텍스트로 입력하기
      </Button>
      <AiNotice />
    </div>
  );
}
