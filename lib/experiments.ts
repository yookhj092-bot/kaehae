/** 실험 11종 — 인트로 카드(research-intro)에 쓰는 값. 문구는 피그마 컴포넌트와 같다. */
export type Experiment = {
  no: number;
  title: string;
  /** 인트로 카드 서브 문구. {name}은 연구 대상 이름으로 바뀐다. */
  desc: string;
  count: number;
  seconds: number;
  kind: "fixed" | "rotationA" | "rotationB" | "optional" | "bonus";
};

export const EXPERIMENTS: Experiment[] = [
  { no: 1, title: "첫인상 채집", desc: "처음 만났던 순간 꺼내기", count: 3, seconds: 45, kind: "rotationA" },
  { no: 2, title: "컬러 추출", desc: "그 사람을 색으로 옮겨본다면?", count: 3, seconds: 40, kind: "fixed" },
  { no: 3, title: "감각 샘플링", desc: "계절과 향, 촉감 채집", count: 3, seconds: 40, kind: "rotationA" },
  { no: 4, title: "스타일 표본", desc: "그와 어울리는 것들 골라담기", count: 3, seconds: 45, kind: "rotationA" },
  { no: 5, title: "성분 분석", desc: "{name}님을 이루는 성분 비율", count: 3, seconds: 50, kind: "fixed" },
  { no: 6, title: "행동 관찰 일지", desc: "그동안 봐 온 {name}님의 모습 기록", count: 3, seconds: 35, kind: "rotationB" },
  { no: 7, title: "비유 실험", desc: "그를 다른 무언가에 빗댄다면?", count: 3, seconds: 40, kind: "rotationA" },
  { no: 8, title: "만약에 시뮬레이션", desc: "낯선 세계에 그를 잠시 옮겨보기", count: 3, seconds: 40, kind: "rotationB" },
  { no: 9, title: "취향 적중 테스트", desc: "{name}님이 남긴 ‘나’ 문답", count: 5, seconds: 30, kind: "bonus" },
  { no: 10, title: "관계 데이터", desc: "우리 둘만 아는 기록", count: 2, seconds: 50, kind: "optional" },
  { no: 11, title: "연구 소견", desc: "오늘의 관찰 한 줄 소견 마무리", count: 3, seconds: 50, kind: "fixed" },
];

export const expById = (no: number) => EXPERIMENTS.find((e) => e.no === no)!;
export const pad2 = (n: number) => String(n).padStart(2, "0");
