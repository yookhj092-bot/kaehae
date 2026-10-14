/* 글 답변 필터. 화면(입력 즉시)과 서버(제출 시) 양쪽에서 같은 규칙으로 검사한다.
   막는 것: 심한 욕설 · 성적 표현 · 혐오 표현 · 위협. 친구 사이의 가벼운 강조 표현(존나, 개웃겨 등)은 막지 않는다.
   띄어쓰기·숫자·기호를 끼워 넣어 피하는 경우(시1발, 시 발)도 잡는다. */

const SWEAR = [
  "씨발", "시발", "씨바", "시바", "씨팔", "시팔", "쓰발", "ㅅㅂ", "ㅆㅂ", "ㅅㅍ",
  "병신", "븅신", "ㅂㅅ", "지랄", "ㅈㄹ", "좆", "ㅈ같", "개새끼", "개새기", "개색기", "개색끼", "개쉐", "개자식",
  "씹새", "씹년", "씹놈", "씹창", "썅", "쌍년", "쌍놈", "미친년", "미친놈", "또라이", "닥쳐", "꺼져", "엿먹",
  "느금", "니애미", "니에미", "애미뒤", "엠창", "앰창",
];
const SEXUAL = ["섹스", "야동", "창녀", "걸레년", "화냥", "딸딸이", "자위해", "강간", "성폭행", "따먹"];
const HATE = ["한남충", "김치녀", "된장녀", "맘충", "틀딱", "급식충", "짱깨", "쪽바리", "깜둥", "홍어새", "장애인새", "애자새"];
const THREAT = ["죽어라", "죽여버", "뒤져라", "뒤져버", "자살해", "죽어버려", "칼로찔"];
const EN = ["fuck", "shit", "bitch", "asshole", "cunt", "nigger", "faggot"];
/* 욕설처럼 보이지만 아닌 말 */
const SAFE = ["시발점", "시바견", "시바이누", "병신년"]; // 병신년(丙申年)

const strip = (t: string) => t.toLowerCase().replace(/[^가-힣ㄱ-ㅎㅏ-ㅣa-z]/g, "");

/** 걸리는 표현이 있으면 true */
export function isBad(text: unknown): boolean {
  if (typeof text !== "string" || !text) return false;
  let t = strip(text);
  for (const s of SAFE) t = t.split(s).join("");
  return [...SWEAR, ...SEXUAL, ...HATE, ...THREAT, ...EN].some((w) => t.includes(w));
}
/** 글 · 글 목록 · 답 묶음 안에 걸리는 표현이 하나라도 있는지 */
export function anyBad(v: unknown): boolean {
  if (typeof v === "string") return isBad(v);
  if (Array.isArray(v)) return v.some(anyBad);
  if (v && typeof v === "object") return Object.values(v).some(anyBad);
  return false;
}
export const BAD_MSG = "조금 더 다정한 표현으로 바꿔 주세요.";
