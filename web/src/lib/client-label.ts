export type ClientDisplay = {
  /** 식별번호 (예: C-0012) */
  code: string;
  /** 연령대 시작값 (예: 70 → 70대). 모르면 null */
  ageBand: number | null;
  /** 행정동 (예: 서구 화정1동) */
  dong: string;
};

/** 대상자 표시 문구. 성명은 쓰지 않는다(개인정보 원칙). */
export function clientLabel(c: ClientDisplay): { title: string; subtitle: string } {
  if (c.ageBand === null) return { title: c.code, subtitle: c.dong };
  const age = c.ageBand >= 100 ? "100세 이상" : `${c.ageBand}대`;
  return { title: `${c.code} · ${age}`, subtitle: c.dong };
}
