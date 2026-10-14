/* 카카오 로그인(열쇠 보관 · 찾기)에 쓰는 설정. 값은 Vercel 환경 변수에서 읽는다. */
export const KAKAO = {
  restKey: (process.env.KAKAO_REST_API_KEY ?? "").trim(),
  secret: (process.env.KAKAO_CLIENT_SECRET ?? "").trim(), // 카카오에서 Client Secret을 켠 경우에만 필요
};
export const kakaoReady = () => !!KAKAO.restKey;
export const COOKIE = "kaehae_kakao";
