import { AFlow } from "@/components/flow/AFlow";

const OG = "/og?kind=default";
export const metadata = {
  title: "KAEHAE · 연구소 만들기",
  description: "친구들이 본 나를 한 병에 모아 보세요. 약 1분 · 로그인 없이 시작",
  openGraph: { title: "친구들이 본 나를 한 병에 모아 보세요", description: "타인의 눈으로 보는 나, KAEHAE", images: [{ url: OG, width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image" as const, images: [OG] },
};

export default function Page() {
  return <AFlow />;
}
