import { purgeExpired } from "@/lib/server/store";

/** 보관 기간이 지난 연구소 정리. 배포 후 하루 한 번 정기 실행(크론)에 연결한다.
    CRON_SECRET 환경 변수가 있으면 같은 값의 Authorization 헤더가 있어야 실행된다. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error: "forbidden" }, { status: 403 });
  return Response.json({ removed: await purgeExpired() });
}
