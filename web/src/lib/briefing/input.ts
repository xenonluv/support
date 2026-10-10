import { describeSignal, subjectLine } from "@/lib/briefing/format";
import type { BriefingPeriod } from "@/lib/briefing/period";
import type { ClientDisplay } from "@/lib/client-label";
import type { ClientSignal } from "@/lib/dashboard/build";
import { maskPersonalInfo } from "@/lib/privacy/mask";
import { seoulMonthDay } from "@/lib/records/dates";
import { RECORD_FIELDS, type RecordDraft } from "@/schemas/record-draft";

// 브리핑 Claude 입력 만들기 (순수 함수). 구술 원문은 넣지 않고, 확정된 기록(final_json)만 쓴다.

/** 이보다 많으면 요약·특이사항·후속 조치만 넣는다 (토큰 절약) */
export const COMPACT_AFTER = 20;
/** 최근 기록부터 이만큼만 넣는다 */
export const MAX_RECORDS = 60;

const COMPACT_FIELDS = new Set(["summary", "notes", "follow_up"]);

export type BriefingRecord = { visitedAt: string; agency: string; record: RecordDraft };

// 기록 안의 꺾쇠로 <기록> 구역을 닫고 지시를 끼워 넣지 못하게 한다
const plain = (s: string) => s.replace(/[<>]/g, " ").trim();

function recordBlock(r: BriefingRecord, compact: boolean): string {
  const lines = [`[${seoulMonthDay(r.visitedAt)} · ${plain(r.agency)}]`];
  for (const { key, label } of RECORD_FIELDS) {
    if (compact && !COMPACT_FIELDS.has(key)) continue;
    const value = plain(r.record[key]);
    if (value) lines.push(`${label}: ${value}`);
    if (key === "summary" && !compact && r.record.service_types.length) {
      lines.push(`서비스 유형: ${r.record.service_types.join(", ")}`);
    }
  }
  return lines.join("\n");
}

/** 대상자·기간·기록(시간순)·미해결 신호를 태그로 감싼 글. 전체를 가린 뒤 돌려준다. */
export function buildBriefingInput(input: {
  subject: ClientDisplay;
  period: BriefingPeriod;
  records: BriefingRecord[];
  signals: ClientSignal[];
}): { text: string; agencies: string[]; recordCount: number } {
  const records = [...input.records].sort((a, b) => a.visitedAt.localeCompare(b.visitedAt)).slice(-MAX_RECORDS);
  const compact = records.length > COMPACT_AFTER;
  const signals = input.signals.length ? input.signals.map((s) => `- ${describeSignal(s)}`).join("\n") : "없음";
  const text = [
    `<대상자>${subjectLine(input.subject)}</대상자>`,
    `<기간>${input.period.label} (${input.period.days}일)</기간>`,
    `<기록>\n${records.map((r) => recordBlock(r, compact)).join("\n\n")}\n</기록>`,
    `<미해결 신호>\n${signals}\n</미해결 신호>`,
  ].join("\n");
  const agencies = [...new Set(records.map((r) => maskPersonalInfo(plain(r.agency)).text))];
  return { text: maskPersonalInfo(text).text, agencies, recordCount: records.length };
}
