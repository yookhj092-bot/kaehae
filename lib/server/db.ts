import type { Sample, SelfAnswers } from "@/lib/types";

/* 저장소가 지켜야 하는 모양. 파일(개발용)과 Supabase(배포용) 두 구현이 있다. */
export type Lab = { id: string; key: string; name: string; rotA: string; rotB: string; rel: boolean; open: boolean; self: SelfAnswers | null; createdAt: number; hidden: string[]; samples: Sample[] };
export type LabPatch = Partial<Pick<Lab, "rotA" | "rotB" | "rel" | "open" | "self" | "hidden">>;

export interface DB {
  get(id: string): Promise<Lab | null>;
  create(lab: Lab): Promise<void>;
  patch(id: string, patch: LabPatch): Promise<void>;
  remove(id: string): Promise<void>;
  addSample(id: string, s: Sample): Promise<void>;
  setTaste(id: string, sid: string, taste: (number | null)[]): Promise<boolean>;
  /** 마지막 활동(마지막 표본, 없으면 만든 때)이 before보다 오래된 연구소를 지우고 개수를 돌려준다 */
  purge(before: number): Promise<number>;
}
