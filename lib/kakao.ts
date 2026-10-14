/* 카카오톡 공유 (브라우저). NEXT_PUBLIC_KAKAO_JS_KEY 가 없으면 쓸 수 없다고 알려 준다. */
import { track } from "@/lib/track";

type KakaoSDK = { isInitialized(): boolean; init(key: string): void; Share: { sendDefault(opts: Record<string, unknown>): void } };
declare global { interface Window { Kakao?: KakaoSDK } }

const JS_KEY = (process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "").trim();
const SDK = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
export const kakaoShareReady = () => !!JS_KEY;

function load(): Promise<KakaoSDK> {
  return new Promise((res, rej) => {
    if (window.Kakao) return res(window.Kakao);
    const s = document.createElement("script");
    s.src = SDK; s.async = true;
    s.onload = () => (window.Kakao ? res(window.Kakao) : rej(new Error("kakao sdk")));
    s.onerror = () => rej(new Error("kakao sdk"));
    document.head.appendChild(s);
  });
}
/** 초대 링크를 카카오톡으로 보낸다. 성공하면 true (카카오톡 공유 창이 열림) */
export async function shareInviteToKakao(name: string, url: string): Promise<boolean> {
  if (!JS_KEY) return false;
  try {
    const K = await load();
    if (!K.isInitialized()) K.init(JS_KEY);
    const link = { mobileWebUrl: url, webUrl: url };
    K.Share.sendDefault({
      objectType: "feed",
      content: { title: `${name}님의 캐해 연구에 초대되셨습니다`, description: "타인의 눈으로 보는 나, KAEHAE · 약 5분 · 로그인 없이 참여", imageUrl: `${location.origin}/og?kind=invite&name=${encodeURIComponent(name)}`, imageWidth: 1200, imageHeight: 630, link },
      buttons: [{ title: "참여하기", link }],
    });
    track("share", { ch: "kakao" });
    return true;
  } catch { return false; }
}
