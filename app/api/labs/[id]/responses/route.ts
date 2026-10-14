import { failed, tooMany } from "@/lib/server/guard";
import { addSample } from "@/lib/server/store";

/** 표본 제출 (같은 접속 주소에서 한 시간에 40개까지. 학교·회사처럼 주소를 같이 쓰는 곳을 감안한 값) */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const busy = await tooMany(req, "sample", 40);
    if (busy) return busy;
    const { id } = await params;
    const out = await addSample(id, await req.json().catch(() => ({})));
    if ("error" in out) return Response.json(out, { status: out.error === "notfound" ? 404 : out.error === "invalid" ? 400 : out.error === "profanity" ? 422 : 409 });
    return Response.json(out);
  } catch (e) { return failed(req, e); }
}
