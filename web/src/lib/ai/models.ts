// 모델명은 이 파일에서만 관리한다 (CLAUDE.md).
// 확정 결정: 기록 초안은 claude-sonnet-5-5. 개발 중 비용을 줄이려면 CLAUDE_DRAFT_MODEL=claude-haiku-5-5로 바꾼다.
export const DRAFT_MODEL = process.env.CLAUDE_DRAFT_MODEL || "claude-sonnet-5-5";
