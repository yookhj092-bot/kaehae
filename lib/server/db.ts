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
  /** 신고 접수. 연구소가 지워지면 함께 지워진다 */
  addReport(labId: string, sampleId: string, reason: string, at: number): Promise<void>;
  /** 횟수 제한: 이 열쇳말의 횟수를 1 올리고 올리기 전 값을 돌려준다 */
  hit(k: string, win: number): Promise<number>;
  /** 서버 오류 기록 */
  logError(at: number, path: string, message: string): Promise<void>;
  /** 점검용 숫자: since 이후의 오류 수, 전체 신고 수 */
  stats(since: number): Promise<{ errors: number; reports: number }>;
  /** 지난 횟수 기록과 오래된 오류 기록을 지운다 */
  sweep(before: number): Promise<void>;
}
