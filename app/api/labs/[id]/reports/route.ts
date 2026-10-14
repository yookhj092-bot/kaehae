import { failed, tooMany } from "@/lib/server/guard";
import { addReport } from "@/lib/server/store";

/** 주인이 받은 답을 신고한다 (?key= 필요) */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const busy = await tooMany(req, "report", 30);
    if (busy) return busy;
    const { id } = await params;
    const ok = await addReport(id, new URL(req.url).searchParams.get("key") ?? "", await req.json().catch(() => ({})));
    return ok ? Response.json({ ok: true }) : Response.json({ error: "invalid" }, { status: 400 });
  } catch (e) { return failed(req, e); }
}
