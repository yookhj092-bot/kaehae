import { setTaste } from "@/lib/server/store";

/** 보너스 라운드(취향 적중) 답을 표본에 덧붙인다 */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; rid: string }> }) {
  const { id, rid } = await params;
  const body = (await req.json().catch(() => ({}))) as { taste?: unknown };
  const ok = await setTaste(id, rid, body.taste);
  return ok ? Response.json({ ok: true }) : Response.json({ error: "notfound" }, { status: 404 });
}
