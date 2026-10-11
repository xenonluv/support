/**
 * 기록 화면(/record?client=…)에서 처음 고를 대상자.
 * code: null이면 화면이 첫 대상자를 고르고, ""이면 아무도 고르지 않아 사용자가 직접 고르게 한다.
 * 동 담당자가 번호를 바꿨거나 종결한 뒤 예전 링크로 들어와도, 다른 어르신을 말없이 대신 고르지 않는다.
 */
export function pickInitialClient(
  requested: string | null,
  codes: string[],
  /** 요청한 번호가 옛 번호일 때 지금 번호 (번호 변경 이력) */
  renamedTo: string | null,
): { code: string | null; notice: string | null } {
  if (!requested) return { code: null, notice: null };
  if (codes.includes(requested)) return { code: requested, notice: null };
  if (renamedTo && codes.includes(renamedTo)) {
    return { code: renamedTo, notice: `${requested} 어르신의 식별번호가 ${renamedTo}(으)로 바뀌었어요.` };
  }
  return { code: "", notice: `${requested}은(는) 지금 담당 목록에 없어요(종결 또는 번호 변경). 대상자를 직접 골라 주세요.` };
}
