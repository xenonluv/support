export type Role = "worker" | "manager";

/** 로그인 후 역할별 첫 화면 */
export const HOME: Record<Role, string> = { worker: "/visits", manager: "/signals" };

const WORKER_ONLY = ["/visits", "/record", "/my-records"];
const MANAGER_ONLY = ["/signals", "/briefing", "/metrics", "/clients"];

/** prefix와 같거나 그 아래 구간인지 (/signals-archive는 /signals 아래가 아님) */
function under(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/**
 * 로그인 상태와 주소로 보낼 곳을 정한다. null이면 그대로 보여 준다.
 * 화면 분기는 편의 기능이고, 데이터 보호는 DB의 RLS가 맡는다.
 */
export function decideRoute(pathname: string, session: { role: Role | null } | null): string | null {
  if (under(pathname, "/api")) return null;
  // 사용 안내는 로그인 전에도 본다 (첫 접속·인쇄용)
  if (under(pathname, "/guide")) return null;
  const onLogin = pathname === "/login";
  if (!session || !session.role) return onLogin ? null : "/login";

  const home = HOME[session.role];
  if (onLogin || pathname === "/") return home;
  if (session.role === "worker" && MANAGER_ONLY.some((p) => under(pathname, p))) return home;
  if (session.role === "manager" && WORKER_ONLY.some((p) => under(pathname, p))) return home;
  return null;
}

/** 관리자가 비밀 키로만 바꿀 수 있는 app_metadata에서 역할을 읽는다. */
export function roleFromMetadata(meta: unknown): Role | null {
  if (typeof meta !== "object" || meta === null) return null;
  const role = (meta as { role?: unknown }).role;
  return role === "worker" || role === "manager" ? role : null;
}
