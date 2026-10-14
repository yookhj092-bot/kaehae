/* 카카오톡 공유 (브라우저). NEXT_PUBLIC_KAKAO_JS_KEY 가 없으면 쓸 수 없다고 알려 준다. */
import { track } from "@/lib/track";

type KakaoSDK = { isInitialized(): boolean; init(key: string): void; Share: { sendDefault(opts: Record<string, unknown>): void } };
declare global { interface Window { Kakao?: KakaoSDK } }

const JS_KEY = (process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? "").trim();
const SDK = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
export const kakaoShareReady = () => !!JS_KEY;

let loading: Promise<KakaoSDK> | null = null;
function load(): Promise<KakaoSDK> {
  if (window.Kakao) return Promise.resolve(window.Kakao);
  return (loading ??= new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = SDK; s.async = true;
    s.onload = () => (window.Kakao ? res(window.Kakao) : rej(new Error("kakao sdk")));
    s.onerror = () => { loading = null; rej(new Error("kakao sdk")); };
    document.head.appendChild(s);
  }));
}
/** 공유 창이 열리기 전에 미리 받아 둔다. 누른 순간 받기 시작하면, 다 받는 동안 '사용자가 누른 동작'으로
    인정되는 시간이 지나 브라우저(특히 사파리)가 카카오 공유 창을 팝업으로 막는다. */
export function preloadKakao() {
  if (typeof window === "undefined" || !JS_KEY) return;
  load().then((K) => { if (!K.isInitialized()) K.init(JS_KEY); }).catch(() => {});
}

/** 초대 링크를 카카오톡으로 보낸다. 성공하면 true (카카오톡 공유 창이 열림) */
export async function shareInviteToKakao(name: string, url: string): Promise<boolean> {
  if (!JS_KEY) return false;
  try {
    /* 이미 받아 두었으면 기다리지 않고 바로 연다(누른 동작이 그대로 이어지게) */
    const K = window.Kakao ?? (await load());
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
