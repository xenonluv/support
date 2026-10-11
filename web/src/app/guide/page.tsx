import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";

export const metadata: Metadata = { title: "사용 안내 · 돌봄이음" };

// 현장 인력용 사용 안내 1장. 로그인 전에도 볼 수 있고, 인쇄하면 A4 한 장에 들어간다.

const SECTIONS: { title: string; items: React.ReactNode[] }[] = [
  {
    title: "1. 접속·로그인",
    items: [
      <>휴대폰 크롬(안드로이드)·사파리(아이폰)에서 dolbomieum.kr에 들어가, 받은 이메일과 임시 비밀번호로 로그인합니다.</>,
      <>카카오톡에서 링크를 열었다면 오른쪽 위 메뉴(⋮)에서 &lsquo;다른 브라우저로 열기&rsquo;를 누르세요. 카카오톡 안에서는 녹음이 막힐 수 있습니다.</>,
    ],
  },
  {
    title: "2. 홈 화면에 추가 (앱처럼 쓰기)",
    items: [
      <>안드로이드 크롬: 오른쪽 위 ⋮ → &lsquo;홈 화면에 추가&rsquo;</>,
      <>삼성 인터넷: 아래 ≡ → &lsquo;현재 페이지 추가&rsquo; → &lsquo;홈 화면&rsquo;</>,
      <>아이폰 사파리: 아래 공유 버튼(네모에 위 화살표) → &lsquo;홈 화면에 추가&rsquo;</>,
    ],
  },
  {
    title: "3. 마이크 허용",
    items: [
      <>처음 녹음할 때 마이크 권한을 &lsquo;허용&rsquo;하세요.</>,
      <>
        실수로 막았다면 주소창 왼쪽 자물쇠(또는 ⓘ) → 권한 → 마이크 허용 후 새로고침합니다. 그래도 안 되면{" "}
        <Link href="/mic-test" className="font-medium text-primary underline underline-offset-2">
          마이크 테스트
        </Link>
        에서 확인하세요.
      </>,
    ],
  },
  {
    title: "4. 기록하기",
    items: [
      <>오늘의 방문 → 대상자 [기록하기] → 녹음 버튼 → 방문 직후 30초~1분 말하기 → 받아 적은 글자 확인 → [기록 초안 만들기] → 초안을 확인·고친 뒤 [저장]</>,
      <>
        <strong>이름 대신 식별번호로</strong> 말하세요(예: &ldquo;C-1001 어르신&rdquo;). 주소·전화번호는 말하지 않습니다.
      </>,
      <>본 것·들은 것을 그대로 말하면 됩니다: 건강·약·식사·기분·집 상태·한 일·다음에 할 일</>,
      <>녹음 파일은 저장하지 않습니다. 글자로 바꾼 뒤 바로 버립니다.</>,
    ],
  },
  {
    title: "5. 확인이 필요한 신호",
    items: [
      <>AI가 약 미복용·식사량 감소·낙상·정서적 위축·방문 거부를 찾으면 근거 문장과 함께 카드로 보여 줍니다.</>,
      <>사실과 다르면 [빼기]를 누르세요. 남긴 신호는 동 담당자 화면에 공유됩니다.</>,
      <>
        <strong>AI는 판정하지 않습니다.</strong> 위급하면 지금까지처럼 바로 연락하세요.
      </>,
    ],
  },
  {
    title: "6. 잘 안 될 때",
    items: [
      <>저장이 안 되면 인터넷 연결을 확인하고 다시 [저장]을 누르세요. 고친 내용은 화면에 남아 있습니다.</>,
      <>AI 초안이 안 만들어지면 &lsquo;AI 없이 직접 작성하기&rsquo;로 적을 수 있습니다.</>,
      <>저장한 기록은 &lsquo;내 기록&rsquo;에서 다시 보고 복사할 수 있습니다. 그 밖의 문제는 기관 담당자에게 알려 주세요.</>,
    ],
  },
];

export default function GuidePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-8 print:max-w-none print:gap-2.5 print:p-0">
      <header className="flex flex-wrap items-end justify-between gap-2 border-b pb-3 [print-color-adjust:exact] print:pb-2">
        <div>
          <Brand className="text-xl" />
          <h1 className="mt-1 text-2xl font-bold print:text-lg">현장 사용 안내</h1>
        </div>
        <p className="text-sm text-muted-foreground print:text-xs">dolbomieum.kr</p>
      </header>
      {SECTIONS.map((s) => (
        <section key={s.title} className="break-inside-avoid">
          <h2 className="text-base font-bold print:text-[13px]">{s.title}</h2>
          <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm leading-relaxed break-keep print:mt-1 print:space-y-0.5 print:text-[11.5px] print:leading-snug">
            {s.items.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
      <p className="text-xs text-muted-foreground print:hidden">
        이 화면은 인쇄하면 A4 한 장에 들어갑니다. <Link href="/login" className="text-primary underline underline-offset-2">로그인하러 가기</Link>
      </p>
    </main>
  );
}
