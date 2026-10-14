import type { NextRequest } from "next/server";
import { deleteLab, getLab, updateLab } from "@/lib/server/store";

type Ctx = { params: Promise<{ id: string }> };

/** 연구소 정보. 열쇠(?key=)가 맞으면 표본까지 함께 준다. */
export async function GET(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const key = req.nextUrl.searchParams.get("key");
  const found = await getLab(id, key);
  if (!found) return Response.json({ error: "notfound" }, { status: 404 });
  if (key && !found.owner) return Response.json({ error: "nokey" }, { status: 403 });
  return Response.json(found.lab, { headers: { "Cache-Control": "no-store" } });
}
/** 설정 바꾸기 (열쇠 필요) */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const ok = await updateLab(id, req.nextUrl.searchParams.get("key") ?? "", await req.json().catch(() => ({})));
  return ok ? Response.json({ ok: true }) : Response.json({ error: "nokey" }, { status: 403 });
}
/** 연구소 삭제 (열쇠 필요) */
export async function DELETE(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const ok = await deleteLab(id, req.nextUrl.searchParams.get("key") ?? "");
  return ok ? Response.json({ ok: true }) : Response.json({ error: "nokey" }, { status: 403 });
}
