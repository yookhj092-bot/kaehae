import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans_KR({
  variable: "--font-plex",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

/* 사이트 주소: 직접 넣은 값 → Vercel이 알려 주는 운영 주소 → 개발 주소 순으로 쓴다 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "http://localhost:5181");

export const metadata: Metadata = {
  title: "KAEHAE · 타인의 눈으로 보는 나",
  description: "친구들의 답이 한 방울씩 섞여, 타인이 본 나의 리포트가 됩니다.",
  /* 링크 미리보기 이미지의 절대 주소를 만들 때 쓰는 기준 주소 */
  metadataBase: new URL(SITE_URL),
  /* 아이콘: 브라우저 탭(SVG + 크기별 PNG, 구형은 app/favicon.ico), 아이폰·아이패드 홈 화면. 안드로이드 홈 화면용은 manifest.ts */
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      ...[16, 32, 48, 96].map((n) => ({ url: `/icons/favicon-${n}.png`, type: "image/png", sizes: `${n}x${n}` })),
      { url: "/icons/icon-192.png", type: "image/png", sizes: "192x192" },
    ],
    apple: [120, 152, 167, 180].map((n) => ({ url: `/icons/apple-${n}.png`, sizes: `${n}x${n}` })),
  },
  appleWebApp: { title: "KAEHAE", statusBarStyle: "default" },
  openGraph: { siteName: "KAEHAE", images: [{ url: "/og?kind=default", width: 1200, height: 630 }] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#eeeeee",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={plex.variable}>
      <body>{children}</body>
    </html>
  );
}
