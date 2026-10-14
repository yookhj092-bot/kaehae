import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { RFlow } from "@/components/flow/RFlow";
import { getLab } from "@/lib/server/store";

/* 초대 링크(/r?lab=…)의 미리보기는 그 연구소 주인의 이름으로 만든다 */
export async function generateMetadata({ searchParams }: { searchParams: Promise<{ lab?: string }> }): Promise<Metadata> {
  const { lab } = await searchParams;
  let name = "지원"; // 예시 모드
  if (lab) { try { const found = await getLab(lab); if (found) name = found.lab.name; } catch {} }
  const og = `/og?kind=invite&name=${encodeURIComponent(name)}`;
  return {
    title: "KAEHAE · 연구원 응답",
    description: `${name}님의 캐해 연구에 초대되셨습니다. 약 5분 · 로그인 없이 참여`,
    openGraph: { title: `${name}님의 캐해 연구에 초대되셨습니다`, description: "타인의 눈으로 보는 나, KAEHAE · 약 5분 · 로그인 없이 참여", images: [{ url: og, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image", images: [og] },
  };
}

/* 미리보기 정보를 요청마다 새로 만들 수 있게, 이 페이지가 요청 시점에 그려진다는 표시를 둔다 */
async function Dynamic() {
  await connection();
  return null;
}

export default function Page() {
  return (
    <>
      <Suspense fallback={null}><Dynamic /></Suspense>
      <RFlow />
    </>
  );
}
