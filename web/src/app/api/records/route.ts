import { saveRecord, type SaveResult } from "@/lib/records/save";
import { isSameOrigin } from "@/lib/stt/upload";

/** 방문 기록 저장. 결과는 SaveResult JSON (입력·권한 오류도 ok:false로 돌려 화면에 그대로 안내한다). */
export async function POST(request: Request) {
  if (!isSameOrigin(request.headers.get("origin"), request.headers.get("host"))) {
    return Response.json({ ok: false, error: "허용되지 않은 요청입니다." } satisfies SaveResult, { status: 403 });
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ ok: false, error: "입력 내용을 확인해 주세요." } satisfies SaveResult, { status: 400 });
  }
  return Response.json(await saveRecord(body));
}
