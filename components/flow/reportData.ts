/* 리포트(B 플로우)에서 쓰는 선택지 이름과 예시 데이터.
   열쇠 없이 /b 로 들어오면 예시 데이터로, 열쇠 링크로 들어오면 서버의 실제 표본으로 그린다. */
import type { Sample } from "@/lib/types";

export const SEASONS = ["봄", "여름", "가을", "겨울"];
export const TEXTURES = ["벨벳", "유리", "솜", "니트", "가죽", "젤리", "가루", "꿀", "물"];
export const INGREDIENTS = [
  { name: "다정", color: "#E5AFD8" }, { name: "엉뚱", color: "#ECE09C" }, { name: "열정", color: "#FF7A7A" },
  { name: "여유", color: "#9ACCC2" }, { name: "예민", color: "#C1B8FE" }, { name: "웃김", color: "#9EC4FF" },
];
export const ZOMBIE = ["리더", "행동 대장", "분위기 메이커", "첫 희생자", "마이웨이 생존자"];
export const TASTE = [
  { title: "민트초코", opts: ["불호", "호"] },
  { title: "탕수육", opts: ["부먹", "찍먹"] },
  { title: "카페 메뉴", opts: ["아이스 아메리카노", "라떼", "달달한 시즌 메뉴", "차", "에이드", "카페 안 감"] },
  { title: "여행지", opts: ["산", "바다", "도시"] },
  { title: "좋아하는 계절", opts: ["여름", "겨울"] },
];
export const VIS = ["공개", "나만 보기", "익명"];

/** 연구 대상이 남긴 셀프 답. 색과 취향만 받고, 나머지는 예시 데이터에만 있다. */
export type Self = { color: string | null; colorName?: string; sat?: number; ing?: number[]; home?: number; taste: (number | null)[] };

const H = 3600_000;
/** 예시 표본 (오래된 순). 시각은 부르는 순간을 기준으로 만든다(브라우저에서만 부른다). */
export const demoSamples = (now = Date.now()): Sample[] => [
  { id: "r1", at: now - 72 * H, name: "익명의 연구원 #1", anon: true, rel: "동아리·모임", years: "2년", know: 2, color: "#9ACCC2", colorName: "옅은 청록", sat: 0.55, season: 3, texture: 1, ing: [15, 30, 10, 25, 10, 10], zombie: 4, opinion: "처음엔 차가운 줄 알았는데, 알고 보니 제일 따뜻한 사람이었어요.", vis: 2, taste: [1, 1, 3, 1, 0], g: { tone: 1, scent: ["우디"], home: 0.45, tension: 3, channel: "조용한 관찰자", pastlife: 2, charm: ["여유", "솔직함", "센스"] } },
  { id: "r2", at: now - 26 * H, name: "엄마", rel: "가족", years: "10년 이상", know: 5, color: "#F3C6DE", colorName: "연한 분홍", sat: 0.4, season: 0, texture: 2, ing: [35, 20, 5, 15, 20, 5], zombie: 4, opinion: "아직도 내 눈엔 아기 같지만, 누구보다 속이 깊은 아이.", vis: 1, taste: [1, 0, 0, 1, 1], g: { tone: 0, scent: ["비누", "바닐라"], home: 0.2, tension: 2, channel: "우리 집 막내", pastlife: 0, charm: ["다정함", "귀여움", "배려"], word: ["가족"] } },
  { id: "r3", at: now - 2 * H, name: "민호", rel: "회사·알바", years: "1년", know: 3, color: "#8FB8F5", colorName: "맑은 하늘색", sat: 0.48, season: 1, texture: 1, ing: [20, 10, 30, 20, 10, 10], zombie: 0, opinion: "일할 땐 누구보다 든든한 사람. 회의가 길어지면 표정에 다 드러나요.", vis: 0, taste: [0, 1, 0, 2, 0], g: { tone: 1, scent: ["섬유유연제"], home: 0.6, tension: 3, channel: "퇴근 후 지원", pastlife: 2, charm: ["성실함", "센스", "배려"], word: ["전우"] } },
  { id: "r4", at: now - 60_000, name: "수진", rel: "친구", years: "5년", know: 4, color: "#7B6CF0", colorName: "보랏빛 파랑", sat: 0.72, season: 1, texture: 5, ing: [30, 25, 10, 10, 5, 20], zombie: 2, opinion: "말은 없는데 제일 웃긴 애. 옆에 있으면 마음이 놓여.", vis: 0, taste: [1, 1, 1, 1, 0], g: { tone: 1, scent: ["시트러스", "비누"], home: 0.35, tension: 4, channel: "지원의 하루", pastlife: 0, charm: ["다정함", "유머", "센스"], word: ["웃음 파트너"], secret: "취하면 불어로 자기소개함" } },
];
export const DEMO_SELF: Self = { color: "#4A3FB5", colorName: "짙은 남보라", sat: 0.3, ing: [10, 15, 25, 20, 25, 5], home: 0.15, taste: [1, 1, 0, 1, 0] };

export const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
export function tally(values: (string | number)[], labels?: string[]) {
  const m = new Map<string, number>();
  for (const v of values) { const k = typeof v === "number" && labels ? labels[v] ?? String(v) : String(v); m.set(k, (m.get(k) ?? 0) + 1); }
  return [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}
export function ago(at: number) {
  const m = Math.max(0, Math.round((Date.now() - at) / 60_000));
  if (m < 2) return "방금 전";
  if (m < 60) return `${m}분 전`;
  if (m < 60 * 24) return `${Math.round(m / 60)}시간 전`;
  if (m < 60 * 48) return "어제";
  return `${Math.round(m / 1440)}일 전`;
}
