import { LogOut } from "lucide-react";
import { logout } from "@/lib/auth/actions";
import { getCurrentUser } from "@/lib/auth/current-user";
import { cn } from "@/lib/utils";

// 세션을 읽는 컴포넌트들 — 반드시 <Suspense> 안에서 쓴다 (Cache Components 규칙)

export async function SidebarUserInfo() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <>
      <p className="px-2 font-semibold text-white">{user.displayName}</p>
      <p className="px-2 text-xs text-sidebar-foreground/70">{user.agencyName}</p>
    </>
  );
}

export async function HeaderUserName({ className }: { className?: string }) {
  const user = await getCurrentUser();
  if (!user) return null;
  return <span className={className}>{user.displayName}</span>;
}

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logout}>
      <button type="submit" className={cn("flex items-center gap-2", className)}>
        <LogOut className="size-4" aria-hidden="true" />
        로그아웃
      </button>
    </form>
  );
}
