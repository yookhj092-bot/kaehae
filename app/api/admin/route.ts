import { timingSafeEqual } from "node:crypto";
import { connection } from "next/server";
import { failed, tooMany } from "@/lib/server/guard";
import { statsDump } from "@/lib/server/store";

/* 운영자 통계 원자료. x-admin-key 헤더가 ADMIN_KEY(없으면 CRON_SECRET)와 같아야 한다. */
export async function GET(req: Request) {
  await connection();
  /* 개발 서버에서 열쇠를 정하지 않았으면 "dev" 로 연다 */
  const secret = (process.env.ADMIN_KEY || process.env.CRON_SECRET || (process.env.NODE_ENV === "production" ? "" : "dev")).trim();
  const given = req.headers.get("x-admin-key") ?? "";
  const ok = !!secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return (await tooMany(req, "admin-fail", 20)) ?? Response.json({ error: "forbidden" }, { status: 403 });
  try { return Response.json(await statsDump(90), { headers: { "Cache-Control": "no-store" } }); }
  catch (e) { return failed(req, e); }
}
