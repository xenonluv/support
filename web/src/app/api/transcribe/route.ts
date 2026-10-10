import { SttConfigError, transcribe } from "@/lib/stt";
import { checkAudioUpload, isSameOrigin } from "@/lib/stt/upload";

/**
 * 녹음 파일 → 한국어 글자. 음성은 메모리에서만 처리하고 저장하지 않는다.
 * 로그에는 오류 종류만 남기고 음성·글자는 남기지 않는다.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request.headers.get("origin"), request.headers.get("host"))) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "bad-request" }, { status: 400 });
  }

  const entry = form.get("audio");
  const file = entry instanceof File ? entry : null;
  const problem = checkAudioUpload(file);
  if (problem || !file) {
    return Response.json({ error: problem ?? "missing" }, { status: problem === "too-large" ? 413 : 400 });
  }

  const started = Date.now();
  try {
    const result = await transcribe(file);
    return Response.json({ text: result.text, engine: result.engine, ms: Date.now() - started });
  } catch (e) {
    const code = e instanceof SttConfigError ? "not-configured" : "stt-failed";
    console.error(`[transcribe] ${code}`);
    return Response.json({ error: code }, { status: code === "not-configured" ? 500 : 502 });
  }
}
