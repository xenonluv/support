// 모델명은 이 파일에서만 관리한다 (CLAUDE.md).
// 확정 결정: 기록 초안은 claude-sonnet-5-5. 개발 중 비용을 줄이려면 CLAUDE_DRAFT_MODEL=claude-haiku-5-5로 바꾼다.
export const DRAFT_MODEL = process.env.CLAUDE_DRAFT_MODEL || "claude-sonnet-5-5";
// 인수인계 브리핑도 같은 모델을 쓴다. 따로 바꾸려면 CLAUDE_BRIEFING_MODEL
export const BRIEFING_MODEL = process.env.CLAUDE_BRIEFING_MODEL || "claude-sonnet-5-5";
