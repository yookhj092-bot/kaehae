/* 운영자용 이용 통계. 화면에는 아무것도 보이지 않고, 이름 없이 기기별 임의 번호로만 센다.
   예시 화면(연구소 번호 없음)과 '이 기기 제외'를 켠 기기에서는 보내지 않는다. 결과는 /admin 에서 본다. */
export type TrackKind = "step" | "submit" | "share" | "lab_created" | "make_click" | "key_saved" | "b_view";
type Ctx = { role: "a" | "r" | "b"; lab: string | null };
let ctx: Ctx = { role: "a", lab: null };
/** 지금 화면이 누구의 어느 연구소인지 알려 둔다 (공유 함수 같은 공용 코드가 이 값을 쓴다) */
export const setTrackCtx = (c: Partial<Ctx>) => { ctx = { ...ctx, ...c }; };

const NO = "kaehae-notrack";
export const trackingOff = () => { try { return localStorage.getItem(NO) === "1"; } catch { return false; } };
export const setTrackingOff = (off: boolean) => { try { if (off) localStorage.setItem(NO, "1"); else localStorage.removeItem(NO); } catch {} };
function device() {
  try {
    let d = localStorage.getItem("kaehae-dev");
    if (!d) { d = Math.random().toString(36).slice(2, 12); localStorage.setItem("kaehae-dev", d); }
    return d;
  } catch { return "none"; }
}

/* 유입 채널: 링크 뒤의 ?ref=li 같은 표시를 먼저 보고, 없으면 이전 사이트 주소로 짐작한다.
   마지막으로 확인된 채널을 30일 동안 이 기기에 둔다. 앱 안에서 주소가 바뀌기 전에 읽도록 처음 불러올 때 한 번만 본다. */
const SRC = "kaehae-src";
const FROM_HOST: [RegExp, string][] = [
  [/(^|\.)(linkedin\.com|lnkd\.in)$/, "li"], [/(^|\.)(t\.co|x\.com|twitter\.com)$/, "x"],
  [/(^|\.)instagram\.com$/, "ig"], [/(^|\.)threads\.(net|com)$/, "threads"], [/(^|\.)facebook\.com$/, "fb"],
  [/(^|\.)disquiet\.io$/, "disquiet"], [/(^|\.)hada\.io$/, "geeknews"], [/(^|\.)(google\.[a-z.]+|naver\.com|daum\.net|bing\.com)$/, "search"],
];
function readSource() {
  try {
    const ref = new URLSearchParams(location.search).get("ref")?.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 16);
    let src = ref || "";
    if (!src && document.referrer) {
      const host = new URL(document.referrer).hostname;
      if (host !== location.hostname) src = FROM_HOST.find(([re]) => re.test(host))?.[1] ?? "etc";
    }
    if (src) { localStorage.setItem(SRC, JSON.stringify({ src, at: Date.now() })); return src; }
    const kept = JSON.parse(localStorage.getItem(SRC) ?? "null") as { src: string; at: number } | null;
    return kept && Date.now() - kept.at < 30 * 86_400_000 ? kept.src : "";
  } catch { return ""; }
}
const source = typeof window === "undefined" ? "" : readSource();

export function track(kind: TrackKind, meta: Record<string, string | number> = {}) {
  if (typeof window === "undefined" || trackingOff()) return;
  if (ctx.role !== "a" && !ctx.lab) return; // 예시 화면
  if (/[?&](instant|demo|at)=/.test(location.search)) return; // 작업용 주소
  const body = JSON.stringify({ k: kind, role: ctx.role, lab: ctx.lab, dev: device(), meta, src: source });
  try {
    if (!navigator.sendBeacon?.("/api/t", new Blob([body], { type: "application/json" }))) fetch("/api/t", { method: "POST", body, keepalive: true }).catch(() => {});
  } catch {}
}
