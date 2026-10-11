// 성과지표 기준값 — 단일 출처 (doc/plans/2026-10-11-9단계-파일럿-성과측정.md 결정)

/** 수정 비율이 이 값 이하이면 '경미 수정'으로 수용한 것으로 본다 (글자 20%) */
export const MINOR_EDIT_MAX = 0.2;

/** 이보다 오래 걸린 기록은 화면을 열어 둔 경우로 보고 평균 작성시간에서 뺀다 */
export const TIME_OUTLIER_MINUTES = 30;

/** 사전 수요조사의 기존 기록 작성시간(분). 사용자에게 받으면 넣는다. 모르면 null → 단축률을 계산하지 않는다 */
export const BASELINE_MINUTES: number | null = null;

/** 계획서의 성과지표 목표 */
export const TARGETS = { timeReduction: 0.5, workers: 5, days: 14, records: 200, acceptance: 0.8 } as const;
