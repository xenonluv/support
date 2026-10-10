import type { Metadata, Viewport } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "돌봄이음",
  description: "방문 직후 30초 구술로 돌봄기록 초안을 만드는 AI 기록·연계 보조 서비스",
  // 돌봄 현장 업무용 서비스라 검색엔진에 노출하지 않는다
  robots: { index: false, follow: false },
  // 아이폰 '홈 화면에 추가' 시 앱처럼 열린다
  appleWebApp: { capable: true, title: "돌봄이음", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  // 아이폰 홈 표시줄 영역까지 쓰고, 하단 탭은 safe-area만큼 띄운다
  viewportFit: "cover",
  themeColor: "#1b2453",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
