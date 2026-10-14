import type { Metadata, Viewport } from "next";
import { IBM_Plex_Sans_KR } from "next/font/google";
import "./globals.css";

const plex = IBM_Plex_Sans_KR({
  variable: "--font-plex",
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KAEHAE · 타인의 눈으로 보는 나",
  description: "친구들의 답이 한 방울씩 섞여, 타인이 본 나의 리포트가 됩니다.",
  /* 링크 미리보기 이미지의 절대 주소를 만들 때 쓰는 기준 주소 */
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:5181"),
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
