import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { COOKIE, KAKAO, kakaoReady } from "@/lib/server/kakao";

/* 카카오 로그인 시작.
   /api/kakao/login?lab=…&key=…  → 로그인 뒤 이 연구소의 열쇠를 카카오 계정에 보관
   /api/kakao/login               → 로그인 뒤 보관해 둔 연구소를 찾아 연다 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const lab = q.get("lab") ?? "", key = q.get("key") ?? "";
  const back = lab && key ? `/b?lab=${lab}&key=${key}` : "/e?k=nokey";
  if (!kakaoReady()) return Response.redirect(new URL(`${back}${back.includes("?") ? "&" : "?"}kakao=off`, req.url), 302);
  const state = randomBytes(16).toString("hex");
  (await cookies()).set(COOKIE, JSON.stringify({ state, lab, key }), { httpOnly: true, secure: req.nextUrl.protocol === "https:", sameSite: "lax", maxAge: 600, path: "/" });
  const url = new URL("https://kauth.kakao.com/oauth/authorize");
  url.searchParams.set("client_id", KAKAO.restKey);
  url.searchParams.set("redirect_uri", `${req.nextUrl.origin}/api/kakao/callback`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return Response.redirect(url, 302);
}
