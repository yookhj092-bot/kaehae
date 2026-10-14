import { tooMany } from "@/lib/server/guard";
import { addEvent } from "@/lib/server/store";

/** 이용 통계 수집. 실패해도 화면에는 영향이 없도록 항상 204로 답한다. */
export async function POST(req: Request) {
  try {
    if (!(await tooMany(req, "t", 1500))) await addEvent(await req.json().catch(() => ({})));
  } catch {}
  return new Response(null, { status: 204 });
}
