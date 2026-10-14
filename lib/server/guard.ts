import { logError, rateOk } from "./store";

/** 너무 잦은 요청이면 429 응답을, 아니면 null을 돌려준다 */
export async function tooMany(req: Request, kind: string, limit: number, windowMs = 3_600_000) {
  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || req.headers.get("x-real-ip") || "unknown";
  return (await rateOk(ip, kind, limit, windowMs)) ? null : Response.json({ error: "busy" }, { status: 429 });
}
/** 처리 중 난 오류를 기록하고, 원문 없이 500으로 답한다 */
export async function failed(req: Request, err: unknown) {
  await logError(new URL(req.url).pathname, err);
  return Response.json({ error: "server" }, { status: 500 });
}
