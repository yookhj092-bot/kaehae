import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { COOKIE, KAKAO, kakaoReady } from "@/lib/server/kakao";
import { findByOwner, linkOwner } from "@/lib/server/store";

/* 카카오 로그인에서 돌아오는 곳. 카카오 회원번호만 받아 쓰고, 이름·프로필·이메일은 받지 않는다. */
export async function GET(req: NextRequest) {
  const to = (path: string) => Response.redirect(new URL(path, req.url), 302);
  const jar = await cookies();
  let saved: { state?: string; lab?: string; key?: string } = {};
  try { saved = JSON.parse(jar.get(COOKIE)?.value ?? "{}"); } catch {}
  jar.delete(COOKIE);
  const q = req.nextUrl.searchParams;
  const back = saved.lab && saved.key ? `/b?lab=${saved.lab}&key=${saved.key}` : "/e?k=nokey";
  const fail = (why: string) => to(`${back}${back.includes("?") ? "&" : "?"}kakao=${why}`);
  if (!kakaoReady()) return fail("off");
  const code = q.get("code");
  if (!code) return fail("cancel"); // 동의 화면에서 취소
  if (!saved.state || saved.state !== q.get("state")) return fail("fail");

  try {
    const body = new URLSearchParams({ grant_type: "authorization_code", client_id: KAKAO.restKey, redirect_uri: `${req.nextUrl.origin}/api/kakao/callback`, code });
    if (KAKAO.secret) body.set("client_secret", KAKAO.secret);
    const tokenRes = await fetch("https://kauth.kakao.com/oauth/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded;charset=utf-8" }, body, cache: "no-store" });
    if (!tokenRes.ok) return fail("fail");
    const { access_token } = (await tokenRes.json()) as { access_token?: string };
    const meRes = await fetch("https://kapi.kakao.com/v2/user/me", { headers: { Authorization: `Bearer ${access_token}` }, cache: "no-store" });
    if (!meRes.ok) return fail("fail");
    const { id } = (await meRes.json()) as { id?: number };
    if (!id) return fail("fail");
    const owner = String(id);

    if (saved.lab && saved.key) {
      /* 열쇠 보관 */
      return (await linkOwner(saved.lab, saved.key, owner)) ? to(`${back}&kakao=linked`) : fail("fail");
    }
    /* 열쇠 찾기 */
    const found = await findByOwner(owner);
    return found ? to(`/b?lab=${found.id}&key=${found.key}&kakao=found`) : to("/e?k=nokey&kakao=none");
  } catch {
    return fail("fail");
  }
}
