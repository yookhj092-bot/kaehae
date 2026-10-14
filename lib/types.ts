/* A·R·B가 함께 쓰는 데이터 모양 */

/** 연구원 한 명이 낸 표본 */
export type Sample = {
  id: string;
  at: number;
  name: string;
  anon?: boolean;
  rel: string;
  years: string;
  know: number;
  color: string | null;
  colorName: string | null;
  sat: number | null;
  season: number | null;
  texture: number | null;
  ing: number[] | null;
  zombie: number | null;
  opinion: string | null;
  /** 0 공개 · 1 나만 보기 · 2 익명 */
  vis: 0 | 1 | 2;
  /** 취향 적중(09) 답. 답하지 않은 문항은 null */
  taste: (number | null)[];
  /** 공용 문항(questions.ts)의 답 */
  g: Record<string, unknown>;
};
export type SelfAnswers = { color: string | null; taste: (number | null)[] };

/** 초대 링크로 들어온 사람이 볼 수 있는 연구소 정보 */
export type LabPublic = { id: string; name: string; rotA: string; rotB: string; rel: boolean; open: boolean; self: SelfAnswers | null; count: number;
  /** 이 시각이 지나면 연구소가 자동으로 지워진다 (마지막 표본 + 보관 기간) */
  expiresAt: number };
/** 열쇠로 들어온 주인이 보는 연구소 정보 */
export type LabFull = LabPublic & { samples: Sample[]; hidden: string[]; };
export type LabCreate = { name: string; rotA: string; rotB: string; rel: boolean; self: SelfAnswers | null };
