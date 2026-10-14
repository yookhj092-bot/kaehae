import type { MetadataRoute } from "next";

/* 홈 화면에 추가했을 때의 이름·아이콘·색 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "KAEHAE · 타인의 눈으로 보는 나",
    short_name: "KAEHAE",
    description: "친구들의 답이 한 방울씩 섞여, 타인이 본 나의 리포트가 됩니다.",
    start_url: "/",
    display: "standalone",
    background_color: "#eeeeee",
    theme_color: "#eeeeee",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
