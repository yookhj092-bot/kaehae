/* 시안에 없는 문항들. PRD 문항 뱅크의 채택 문항에서 골랐고, 답변 형식별로 공용 화면(GenericQ)이 그린다.
   문구의 {S}는 연구 대상 이름으로 바뀐다. */

import { anyBad, isBad } from "@/lib/moderation";

export type QKind = "choice" | "grid" | "chips" | "text" | "blank2" | "bipolar" | "scale" | "dial" | "ox";
export type QDef = {
  exp: number;
  title: string;
  guide: string;
  sub?: string;
  kind: QKind;
  opts?: string[];
  emoji?: string[];
  swatch?: string[];
  cols?: 2 | 3;
  min?: number;
  max?: number;
  custom?: boolean;
  ends?: [string, string];
  placeholder?: string;
  maxLen?: number;
  tpl?: [string, string];
  /** 취향 적중(09)에서 연구 대상이 미리 남긴 답 */
  self?: number;
};

export const QDEFS: Record<string, QDef> = {
  /* 02 컬러 추출 */
  tone: { exp: 2, kind: "grid", cols: 2, title: "무채색으로만 표현해야 한다면 {S}님은 어느 톤일까요?", guide: "흑백 사진 속 {S}님을 떠올려 보세요.", opts: ["흰색", "연회색", "진회색", "검정"], swatch: ["#FFFFFF", "#D6D6D6", "#757575", "#212121"] },
  /* 03 감각 샘플링 */
  scent: { exp: 3, kind: "chips", min: 1, max: 2, title: "{S}님에게서는 어떤 향이 날 것 같나요?", sub: "최대 2개까지 고를 수 있습니다.", guide: "가까이서 스치는 향을 떠올려 주세요.", opts: ["섬유유연제", "시트러스", "우디", "머스크", "바닐라", "비누", "풀냄새", "갓 내린 커피"] },
  /* 05 성분 분석 */
  home: { exp: 5, kind: "bipolar", title: "{S}님은 집이 좋은 쪽인가요, 밖이 좋은 쪽인가요?", guide: "어느 쪽에 더 가까운지 눈금을 옮겨 주세요.", ends: ["이불 밖은 위험해", "일주일 내내 약속"] },
  tension: { exp: 5, kind: "scale", title: "{S}님의 평소 텐션을 측정해 주세요.", guide: "평소의 {S}님을 기준으로 채워 주시면 됩니다.", ends: ["배터리 1칸", "과충전"] },
  /* 08 만약에 시뮬레이션 */
  channel: { exp: 8, kind: "text", maxLen: 20, title: "{S}님이 유튜버라면 채널 이름은 무엇일까요?", guide: "구독하고 싶어지는 이름이면 좋겠습니다.", placeholder: "예: {S}의 하루" },
  pastlife: { exp: 8, kind: "grid", cols: 3, title: "{S}님의 전생을 추측해 주세요.", guide: "근거는 없어도 됩니다. 느낌대로 골라 주세요.", opts: ["고양이", "왕족", "선비", "해적", "곰", "장군"], emoji: ["🐈", "👑", "📜", "🏴‍☠️", "🐻", "⚔️"] },
  /* 01 첫인상 채집 */
  first3: { exp: 1, kind: "chips", min: 3, max: 3, custom: true, title: "{S}님의 첫인상을 세 단어로 채집해 주세요.", sub: "딱 3개를 골라 주세요. 없으면 직접 적으셔도 됩니다.", guide: "처음 만났던 날의 {S}님을 떠올려 주세요.", opts: ["차분한", "무서운", "웃긴", "시크한", "어른스러운", "수줍은", "다정한", "똑똑한", "엉뚱한", "조용한"] },
  twist: { exp: 1, kind: "blank2", title: "알고 보니 달랐던 점이 있나요? 빈칸을 채워 주세요.", guide: "첫인상과 지금 사이의 반전을 기록합니다.", tpl: ["처음엔", "인 줄 알았는데, 알고 보니"] },
  diff: { exp: 1, kind: "scale", title: "첫인상과 지금의 {S}님은 얼마나 다른가요?", guide: "다를수록 시험관이 더 높이 차오릅니다.", ends: ["그대로야", "완전 딴사람"] },
  /* 04 스타일 표본 */
  genre: { exp: 4, kind: "chips", min: 1, max: 2, title: "{S}님의 스타일은 어떤 장르에 가까운가요?", sub: "최대 2개까지 고를 수 있습니다.", guide: "평소 옷차림을 떠올리며 골라 주세요.", opts: ["캐주얼", "스트릿", "미니멀", "러블리", "빈티지", "고프코어", "클래식", "Y2K", "트레이닝복이 교복"] },
  bag: { exp: 4, kind: "chips", min: 3, max: 3, title: "{S}님의 가방 속 필수품 세 가지를 담아 주세요.", sub: "딱 3개를 담아 주세요.", guide: "가방을 열면 먼저 보일 것 같은 물건입니다.", opts: ["립밤", "이어폰", "보조배터리", "영수증 뭉치", "간식", "책", "텀블러", "손 선풍기", "가방 안 들고 다님"] },
  signature: { exp: 4, kind: "text", maxLen: 24, title: "{S}님의 시그니처 아이템을 하나만 꼽아 주세요.", guide: "그것만 봐도 {S}님이 떠오르는 물건입니다.", placeholder: "예: 그 초록 모자" },
  /* 06 행동 관찰 일지 */
  late: { exp: 6, kind: "choice", title: "약속 시간입니다. {S}님은 지금 어디에 있을까요?", guide: "보아 온 그대로 기록해 주세요.", opts: ["10분 전에 이미 도착", "정각에 딱 도착", "5분 지각하고 사과 중", "“가는 중” (아직 집)"] },
  reply: { exp: 6, kind: "choice", title: "{S}님의 메시지 답장 스타일은요?", guide: "대화방에서의 {S}님을 떠올려 주세요.", opts: ["칼답", "읽고 3시간 뒤", "이모티콘만", "장문", "ㅋㅋㅋ로 모든 걸 해결"] },
  stress: { exp: 6, kind: "chips", min: 1, max: 7, title: "스트레스를 받으면 {S}님은 무엇을 하나요?", sub: "해당하는 것을 모두 골라 주세요.", guide: "여러 개를 고르셔도 괜찮습니다.", opts: ["잠", "먹기", "운동", "쇼핑", "친구 소환", "혼자 동굴", "아무 일 없는 척"] },
  /* 07 비유 실험 */
  animal: { exp: 7, kind: "grid", cols: 3, title: "{S}님을 동물로 표현한다면요?", guide: "비유 실험을 시작합니다. 직감으로 골라 주세요.", opts: ["고양이", "강아지", "토끼", "곰", "여우", "다람쥐", "오리", "펭귄", "부엉이", "돌고래", "호랑이", "나무늘보"], emoji: ["🐱", "🐶", "🐰", "🐻", "🦊", "🐿️", "🦆", "🐧", "🦉", "🐬", "🐯", "🦥"] },
  shape: { exp: 7, kind: "grid", cols: 3, title: "{S}님과 닮은 도형은 무엇인가요?", guide: "모서리가 있는지, 둥근지부터 떠올려 보세요.", opts: ["동그라미", "세모", "네모", "별", "물결"], emoji: ["●", "▲", "■", "★", "〰"] },
  number: { exp: 7, kind: "dial", title: "{S}님을 숫자 하나로 표현해 주세요.", guide: "떠오르는 숫자에 멈춰 주세요.", ends: ["0", "99"] },
  /* 10 관계 데이터 */
  word: { exp: 10, kind: "chips", min: 1, max: 1, custom: true, title: "두 분의 사이를 한 단어로 표현한다면요?", sub: "하나만 고르거나 직접 적어 주세요.", guide: "천천히 떠올려 주셔도 괜찮습니다.", opts: ["전우", "밥친구", "가족", "웃음 파트너", "고민 상담소", "동결된 친구"] },
  secret: { exp: 10, kind: "text", maxLen: 50, title: "두 분만 아는 {S}님의 모습이 있다면 들려주세요.", guide: "이 답은 {S}님에게만 전해집니다.", placeholder: "예: 취하면 불어로 자기소개함" },
  /* 11 연구 소견 */
  charm: { exp: 11, kind: "chips", min: 3, max: 3, title: "{S}님의 매력 세 가지를 골라 주세요.", sub: "딱 3개를 골라 주세요.", guide: "가장 많이 나온 단어가 한 줄 정의에 들어갑니다.", opts: ["다정함", "유머", "성실함", "센스", "솔직함", "배려", "열정", "여유", "귀여움", "든든함"] },
  /* 09 취향 적중 테스트 (보너스) */
  b1: { exp: 9, kind: "ox", title: "민트초코에 대한 {S}님의 입장은요?", guide: "{S}님이 미리 남긴 기록과 맞춰 봅니다.", opts: ["불호", "호"], self: 1 },
  b2: { exp: 9, kind: "ox", title: "탕수육, {S}님은 부먹인가요 찍먹인가요?", guide: "카드를 밀거나 아래 버튼을 눌러 주세요.", opts: ["부먹", "찍먹"], self: 1 },
  b3: { exp: 9, kind: "choice", title: "카페에서 {S}님이 주문할 메뉴는요?", guide: "메뉴판 앞에 선 {S}님을 떠올려 주세요.", opts: ["아이스 아메리카노", "라떼", "달달한 시즌 메뉴", "차", "에이드", "카페 안 감"], self: 0 },
  b4: { exp: 9, kind: "grid", cols: 3, title: "{S}님이 여행지를 고른다면 어디일까요?", guide: "셋 중 하나만 골라 주세요.", opts: ["산", "바다", "도시"], emoji: ["⛰️", "🌊", "🏙️"], self: 1 },
  b5: { exp: 9, kind: "ox", title: "{S}님은 여름과 겨울 중 어느 쪽을 더 좋아할까요?", guide: "마지막 문항입니다.", opts: ["여름", "겨울"], self: 0 },
};

export const BONUS = ["b1", "b2", "b3", "b4", "b5"];
export const ROT_A: Record<string, string[]> = { "01": ["first3", "twist", "diff"], "03": ["season", "texture", "scent"], "04": ["genre", "bag", "signature"], "07": ["animal", "shape", "number"] };
export const ROT_B: Record<string, string[]> = { "06": ["late", "reply", "stress"], "08": ["zombie", "channel", "pastlife"] };

export const INTRO_GUIDE: Record<number, string> = {
  1: "{S}님을 처음 만났던 순간을 떠올려 주세요.",
  2: "이제 {S}님을 색으로 추출해 보겠습니다.",
  3: "잠시 눈을 감고 {S}님을 떠올려주세요.",
  4: "{S}님의 스타일 표본을 채취하겠습니다.",
  5: "{S}님을 이루는 성분의 비율을 배합해 보겠습니다.",
  6: "관찰 일지를 엽니다. 보아 온 그대로 기록해 주세요.",
  7: "비유 실험입니다. 직감으로 골라 주세요.",
  8: "시뮬레이션을 가동합니다. 낯선 세계로 떠나 봅니다.",
  9: "이번엔 정답이 있습니다. {S}님의 기록과 맞춰 보세요.",
  10: "두 분만 아는 기록입니다. 건너뛰셔도 괜찮습니다.",
  11: "마지막입니다. 오늘의 관찰을 한 줄로 정리해 주세요.",
};

const DROP = ["#C3DBFF", "#D8D3FF", "#F1CCE8", "#9ACCC2", "#ECE09C", "#FFA7A4", "#9EC4FF", "#C1B8FE"];
/** 답에서 뽑는 방울 색 */
export function dropColor(def: QDef, v: unknown): string {
  if (typeof v === "number") {
    if (def.swatch) return def.swatch[v] === "#FFFFFF" ? "#F5F5F5" : def.swatch[v];
    if (def.kind === "bipolar") return v < 0.5 ? "#C3DBFF" : "#FFA7A4";
    return DROP[Math.round(v) % DROP.length];
  }
  if (Array.isArray(v) && def.opts) return DROP[Math.max(0, def.opts.indexOf(String(v[0]))) % DROP.length];
  return "#D8D3FF";
}

export function isValid(def: QDef, v: unknown): boolean {
  switch (def.kind) {
    case "chips": return Array.isArray(v) && v.length >= (def.min ?? 1) && v.length <= (def.max ?? 99) && !anyBad(v);
    case "text": return typeof v === "string" && v.trim().length > 0 && v.length <= (def.maxLen ?? 40) && !isBad(v);
    case "blank2": return Array.isArray(v) && v.length === 2 && v.every((x) => typeof x === "string" && x.trim().length > 0) && !anyBad(v);
    default: return typeof v === "number";
  }
}
