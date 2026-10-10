import { DraftConfigError, DraftRefusedError, generateDraft } from "@/lib/ai/draft";
import { getAuthUserId } from "@/lib/auth/session";
import { maskPersonalInfo } from "@/lib/privacy/mask";
import { isSameOrigin } from "@/lib/stt/upload";
import { DraftRequestSchema } from "@/schemas/record-draft";

/**
 * 구술 글 → 기록 초안. 개인정보를 가린 글만 Claude로 보낸다.
 * 로그에는 오류 종류만 남기고 구술·초안 내용은 남기지 않는다.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request.headers.get("origin"), request.headers.get("host"))) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  if (!(await getAuthUserId())) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid-input" }, { status: 400 });
  }
  const parsed = DraftRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid-input" }, { status: 400 });

  const transcript = maskPersonalInfo(parsed.data.transcript).text;
  const started = Date.now();
  try {
    const { draft, model } = await generateDraft(transcript);
    return Response.json({ draft, transcript, model, ms: Date.now() - started });
  } catch (e) {
    if (e instanceof DraftRefusedError) {
      console.error(`[draft] refused (${e.category ?? "unknown"})`);
      return Response.json({ error: "refused" }, { status: 422 });
    }
    const code = e instanceof DraftConfigError ? "not-configured" : "draft-failed";
    console.error(`[draft] ${code}`);
    return Response.json({ error: code }, { status: code === "not-configured" ? 500 : 502 });
  }
}
