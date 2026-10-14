import { addSample } from "@/lib/server/store";

/** 표본 제출 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const out = await addSample(id, await req.json().catch(() => ({})));
  if ("error" in out) return Response.json(out, { status: out.error === "notfound" ? 404 : out.error === "invalid" ? 400 : out.error === "profanity" ? 422 : 409 });
  return Response.json(out);
}
