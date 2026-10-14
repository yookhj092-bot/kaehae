import { hasSupabase } from "@/lib/server/db-supabase";

/** 저장소 연결 상태 점검. 어떤 저장소를 쓰는지와, Supabase라면 접속이 되는지만 알려 준다(키 값은 내보내지 않는다). */
export async function GET() {
  if (!hasSupabase()) return Response.json({ store: "file", ok: !process.env.VERCEL, note: process.env.VERCEL ? "SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 환경 변수가 없습니다" : "개발용 파일 저장소" });
  try {
    const raw = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const key = raw.replace(/\s+/g, "");
    const res = await fetch(`${process.env.SUPABASE_URL!.trim().replace(/\/+$/, "")}/rest/v1/labs?select=id&limit=1`, { cache: "no-store", headers: { apikey: key, Authorization: `Bearer ${key}` } });
    const body = res.ok ? null : ((await res.json().catch(() => ({}))) as { code?: string; message?: string });
    return Response.json({ store: "supabase", ok: res.ok, status: res.status, code: body?.code, message: body?.code ? `Supabase 오류 ${body.code}` : undefined, keyHadSpaces: raw !== key, keyKind: key.startsWith("sb_secret_") ? "secret" : key.startsWith("sb_publishable_") ? "publishable" : key.startsWith("eyJ") ? "legacy-jwt" : "unknown" });
  } catch (e) {
    /* 오류 문구에는 키 값이 섞여 나올 수 있어서 내보내지 않는다 */
    void e;
    return Response.json({ store: "supabase", ok: false, status: 0, message: "Supabase에 요청을 보내지 못했습니다" });
  }
}
