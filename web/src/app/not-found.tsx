import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-bold">페이지를 찾을 수 없습니다</h1>
      <p className="text-muted-foreground">주소가 바뀌었거나 없는 대상자일 수 있습니다.</p>
      <Link href="/" className="text-primary underline underline-offset-4">
        처음 화면으로
      </Link>
    </main>
  );
}
