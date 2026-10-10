import type { BriefingPeriod } from "@/lib/briefing/period";
import { clientLabel, type ClientDisplay } from "@/lib/client-label";
import type { ClientSignal } from "@/lib/dashboard/build";
import { FLAG_STATUS_LABEL } from "@/lib/status";
import type { BriefingContent } from "@/schemas/briefing";
import { SIGNAL_LABEL, SIGNAL_LEVEL_LABEL } from "@/schemas/signal";

/** "약 미복용 (주의 · 3일째 · 미확인)" — 브리핑 입력과 복사글에 함께 쓴다 */
export function describeSignal(s: ClientSignal): string {
  const since = s.isNew ? "신규" : `${s.days}일째`;
  return `${SIGNAL_LABEL[s.type]} (${SIGNAL_LEVEL_LABEL[s.level]} · ${since} · ${FLAG_STATUS_LABEL[s.status]})`;
}

/** 대상자 한 줄 "C-0012 · 70대 · 서구 화정1동" */
export function subjectLine(subject: ClientDisplay): string {
  const label = clientLabel(subject);
  return `${label.title} · ${label.subtitle}`;
}

/** 문자·메신저로 보낼 복사용 글. 빈 목록은 구역째 뺀다. */
export function formatBriefingText(input: {
  subject: ClientDisplay;
  period: BriefingPeriod;
  content: BriefingContent;
  signals: ClientSignal[];
}): string {
  const { content } = input;
  const blocks: string[][] = [
    [`[인수인계 브리핑] ${subjectLine(input.subject)}`, `기간: ${input.period.label}`],
    ["요약", content.overview],
  ];
  const list = (title: string, items: string[]) => {
    if (items.length) blocks.push([title, ...items.map((i) => `- ${i}`)]);
  };
  list("주요 변화", content.changes);
  list(
    "기관별 내용",
    content.by_agency.map((a) => `${a.agency}: ${a.summary}`),
  );
  blocks.push(input.signals.length ? ["미해결 신호", ...input.signals.map((s) => `- ${describeSignal(s)}`)] : ["미해결 신호", "없음"]);
  list("이어서 확인할 일", content.follow_ups);
  return blocks.map((b) => b.join("\n")).join("\n\n");
}
