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

export function track(kind: TrackKind, meta: Record<string, string | number> = {}) {
  if (typeof window === "undefined" || trackingOff()) return;
  if (ctx.role !== "a" && !ctx.lab) return; // 예시 화면
  if (/[?&](instant|demo|at)=/.test(location.search)) return; // 작업용 주소
  const body = JSON.stringify({ k: kind, role: ctx.role, lab: ctx.lab, dev: device(), meta });
  try {
    if (!navigator.sendBeacon?.("/api/t", new Blob([body], { type: "application/json" }))) fetch("/api/t", { method: "POST", body, keepalive: true }).catch(() => {});
  } catch {}
}
