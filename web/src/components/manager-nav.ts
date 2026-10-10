import {
  Building2,
  CalendarCheck,
  ClipboardList,
  Settings,
  Siren,
  SquarePen,
  Users,
  type LucideIcon,
} from "lucide-react";

export type CountKey = "signals" | "clients" | "agencies";

export type NavItem = {
  label: string;
  icon: LucideIcon;
  /** 아직 화면이 없으면 비워 둔다 → '준비 중' 비활성 항목으로 표시 */
  href?: string;
  countKey?: CountKey;
};

export type NavSection = { title: string; items: NavItem[] };

export const MANAGER_NAV: NavSection[] = [
  {
    title: "업무",
    items: [
      { label: "오늘의 방문", icon: CalendarCheck },
      { label: "기록 작성", icon: SquarePen },
      { label: "인수인계 브리핑", icon: ClipboardList },
      { label: "이상징후 현황", icon: Siren, href: "/signals", countKey: "signals" },
    ],
  },
  {
    title: "관리",
    items: [
      { label: "대상자 목록", icon: Users, countKey: "clients" },
      { label: "연계 기관", icon: Building2, countKey: "agencies" },
      { label: "설정", icon: Settings },
    ],
  },
];
