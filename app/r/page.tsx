import { RFlow } from "@/components/flow/RFlow";

const OG = `/og?kind=invite&name=${encodeURIComponent("지원")}`;
export const metadata = {
  title: "KAEHAE · 연구원 응답",
  description: "지원님의 캐해 연구에 초대되셨습니다. 약 5분 · 로그인 없이 참여",
  openGraph: { title: "지원님의 캐해 연구에 초대되셨습니다", description: "타인의 눈으로 보는 나, KAEHAE · 약 5분 · 로그인 없이 참여", images: [{ url: OG, width: 1200, height: 630 }] },
  twitter: { card: "summary_large_image" as const, images: [OG] },
};

export default function Page() {
  return <RFlow />;
}
