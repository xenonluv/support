import { CalendarCheck, FileText, Mic, type LucideIcon } from "lucide-react";

export const WORKER_TABS: { label: string; icon: LucideIcon; href: string }[] = [
  { label: "오늘의 방문", icon: CalendarCheck, href: "/visits" },
  { label: "기록하기", icon: Mic, href: "/record" },
  { label: "내 기록", icon: FileText, href: "/my-records" },
];
