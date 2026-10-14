/* 공유 이미지 그리기 (피그마 sharing image 페이지의 card/* · story/* 와 같은 구성)
   화면에 이미 불러온 글꼴로 캔버스에 직접 그린다. 좌표는 피그마 1배 기준이고 3배로 내보낸다. */

export type ShareData = {
  name: string;
  /** 참여한 연구원 수 */
  n: number;
  mixed: string;
  colors: string[];
  ing: { name: string; color: string; v: number }[];
  quote?: { text: string; by: string } | null;
  sync?: { pct: number; hit: number; total: number; verdict: string };
};
export type CardKind = "color" | "ing" | "quote" | "sync";

const SCALE = 3;
const G = { bg: "#eeeeee", g900: "#212121", g700: "#616161", g600: "#757575" };
type Run = { t: string; b?: boolean };

const family = () => getComputedStyle(document.body).fontFamily || "sans-serif";
const font = (w: number, size: number) => `${w} ${size}px ${family()}`;
/** 한글 글꼴은 글자 묶음별로 나뉘어 있어서, 그릴 글자를 먼저 받아 둔다 */
async function ready(text: string) {
  try { await Promise.all([400, 500, 700].map((w) => document.fonts.load(font(w, 20), text))); await document.fonts.ready; } catch {}
}
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
}
let logoSvg: string | null = null;
async function logo(color: string) {
  if (logoSvg == null) logoSvg = await (await fetch("/img/logo.svg")).text();
  const svg = logoSvg.replace(/fill="(?!none)[^"]*"/g, `fill="${color}"`);
  return loadImage(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
}
function canvas(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w * SCALE; c.height = h * SCALE;
  const x = c.getContext("2d")!;
  x.scale(SCALE, SCALE);
  x.textBaseline = "middle";
  return { c, x };
}
/** 굵기가 섞인 한 줄을 가운데(또는 왼쪽) 기준으로 그린다 */
function line(x: CanvasRenderingContext2D, runs: Run[], cx: number, y: number, size: number, color: string, align: "center" | "left" = "center") {
  const widths = runs.map((r) => { x.font = font(r.b ? 700 : 400, size); return x.measureText(r.t).width; });
  let px = align === "center" ? cx - widths.reduce((a, b) => a + b, 0) / 2 : cx;
  x.fillStyle = color; x.textAlign = "left";
  runs.forEach((r, i) => { x.font = font(r.b ? 700 : 400, size); x.fillText(r.t, px, y); px += widths[i]; });
}
function text(x: CanvasRenderingContext2D, t: string, px: number, y: number, size: number, color: string, align: CanvasTextAlign = "center", weight = 400) {
  x.font = font(weight, size); x.fillStyle = color; x.textAlign = align; x.fillText(t, px, y);
}
/** 낱말 단위로 줄을 나눈다 */
function wrap(x: CanvasRenderingContext2D, t: string, max: number, size: number, weight = 400) {
  x.font = font(weight, size);
  const out: string[] = []; let cur = "";
  for (const w of t.split(/\s+/)) {
    const next = cur ? `${cur} ${w}` : w;
    if (x.measureText(next).width > max && cur) { out.push(cur); cur = w; } else cur = next;
  }
  if (cur) out.push(cur);
  return out.slice(0, 5);
}
const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
function glow(x: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string, a = 1) {
  const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, rgba(color, a)); g.addColorStop(0.35, rgba(color, a * 0.85)); g.addColorStop(1, rgba(color, 0));
  x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2);
}

/* ---------------------------------------------------------------- 카드 (360×450) */
async function drawCard(x: CanvasRenderingContext2D, kind: CardKind, d: ShareData) {
  const W = 360, H = 450, P = 28, cx = W / 2;
  x.fillStyle = G.g900; x.fillRect(0, 0, W, H);
  /* 안쪽 그림자 (인트로 카드와 같은 무드) */
  x.save(); x.beginPath(); x.rect(0, 0, W, H); x.clip();
  x.shadowColor = "rgba(117,117,117,.9)"; x.shadowBlur = 60 * SCALE; x.lineWidth = 40; x.strokeStyle = "#757575";
  x.strokeRect(-20, -20, W + 40, H + 40); x.restore();
  x.drawImage(await logo("#ffffff"), P, P, 82, 24);
  text(x, "KAEHAE REPORT", W - P, P + 12, 12, "rgba(255,255,255,.5)", "right");
  text(x, "타인의 눈으로 보는 나", cx, H - P - 8, 12, "rgba(255,255,255,.5)");
  const mid = (P + 24 + (H - P - 16)) / 2; // 본문 세로 중심

  if (kind === "color") {
    const top = mid - 130;
    glow(x, cx, top + 64, 130, d.mixed, 0.55);
    const g = x.createRadialGradient(cx - 18, top + 40, 4, cx, top + 64, 64);
    g.addColorStop(0, "rgba(255,255,255,.9)"); g.addColorStop(0.6, d.mixed); g.addColorStop(1, d.mixed);
    x.fillStyle = g; x.beginPath(); x.arc(cx, top + 64, 64, 0, Math.PI * 2); x.fill();
    line(x, [{ t: `친구 ${d.n}명이 본` }], cx, top + 166, 28, "#fff");
    line(x, [{ t: d.name, b: true }, { t: "의 색" }], cx, top + 202, 28, "#fff");
    const cs = d.colors.slice(0, 6), step = 20, x0 = cx - ((cs.length - 1) * step) / 2;
    cs.forEach((c, i) => { x.beginPath(); x.arc(x0 + i * step, top + 252, 14, 0, Math.PI * 2); x.fillStyle = G.g900; x.fill(); x.beginPath(); x.arc(x0 + i * step, top + 252, 12, 0, Math.PI * 2); x.fillStyle = c; x.fill(); });
  } else if (kind === "ing") {
    const rows = d.ing.slice(0, 6), rowH = 32, top = mid - (36 + 24 + rows.length * rowH - 12) / 2;
    line(x, [{ t: d.name, b: true }, { t: " 성분표" }], cx, top + 18, 28, "#fff");
    const max = Math.max(...rows.map((r) => r.v), 1), tx = P + 48, tw = W - P * 2 - 96;
    rows.forEach((r, i) => {
      const y = top + 60 + i * rowH + 10;
      text(x, r.name, P, y, 14, "#fff", "left", 500);
      x.fillStyle = "rgba(255,255,255,.12)"; x.beginPath(); x.roundRect(tx, y - 4, tw, 8, 4); x.fill();
      x.fillStyle = r.color; x.beginPath(); x.roundRect(tx, y - 4, Math.max(8, (tw * r.v) / Math.max(40, max * 1.4)), 8, 4); x.fill();
      text(x, `${r.v}%`, W - P, y, 14, "#fff", "right", 500);
    });
  } else if (kind === "quote") {
    const q = d.quote;
    const lines = wrap(x, `“${q?.text ?? "공개된 소견이 아직 없습니다."}”`, W - P * 2, 20);
    const h = lines.length * 28 + 16 + 16 + 16 + 24, top = mid - h / 2;
    lines.forEach((l, i) => text(x, l, cx, top + 14 + i * 28, 20, "#fff"));
    let y = top + lines.length * 28 + 16 + 8;
    if (q) { text(x, q.by, cx, y, 12, "rgba(255,255,255,.6)"); y += 16 + 16; }
    line(x, [{ t: d.name, b: true }, { t: "에 대한 한 줄" }], cx, y + 4, 16, "#fff");
  } else {
    const s = d.sync ?? { pct: 0, hit: 0, total: 5, verdict: "" };
    const top = mid - 150, cy = top + 44 + 88;
    line(x, [{ t: d.name, b: true }, { t: "님과의 싱크로율" }], cx, top + 12, 16, "#fff");
    x.lineWidth = 12; x.lineCap = "butt";
    x.strokeStyle = "rgba(255,255,255,.12)"; x.beginPath(); x.arc(cx, cy, 82, 0, Math.PI * 2); x.stroke();
    if (s.pct > 0) { x.strokeStyle = "#fff"; x.beginPath(); x.arc(cx, cy, 82, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * s.pct) / 100); x.stroke(); }
    x.font = font(400, 54); const nw = x.measureText(String(s.pct)).width;
    text(x, String(s.pct), cx - 8, cy + 2, 54, "#fff");
    text(x, "%", cx - 8 + nw / 2 + 4, cy + 12, 20, "rgba(255,255,255,.6)", "left");
    text(x, `${s.total}문항 중 ${s.hit}개 적중`, cx, cy + 88 + 28, 12, "rgba(255,255,255,.6)");
    text(x, s.verdict, cx, cy + 88 + 54, 20, "#fff");
  }
}
function cardText(kind: CardKind, d: ShareData) {
  return `KAEHAE REPORT 타인의 눈으로 보는 나 친구 명이 본 의 색 성분표 에 대한 한 줄 님과의 싱크로율 문항 중 개 적중 % 0123456789 ${d.name} ${d.ing.map((i) => i.name).join("")} ${d.quote?.text ?? "공개된 소견이 아직 없습니다."} ${d.quote?.by ?? ""} ${d.sync?.verdict ?? ""} “”`;
}
/** 리포트 공유 카드 · 싱크로율 카드 (1080×1350) */
export async function renderCard(kind: CardKind, d: ShareData) {
  await ready(cardText(kind, d));
  const { c, x } = canvas(360, 450);
  await drawCard(x, kind, d);
  return c;
}

/* ---------------------------------------------------------------- 스토리 (360×640) */
async function storyBase(x: CanvasRenderingContext2D) {
  x.fillStyle = G.bg; x.fillRect(0, 0, 360, 640);
  text(x, "타인의 눈으로 보는 나", 180, 74, 14, G.g700, "center", 500);
  x.drawImage(await logo(G.g900), 180 - 61.5, 88, 123, 36);
}
/** 인스타 스토리 초대 이미지 (1080×1920). 아래쪽은 링크 스티커 자리로 비워 둔다. */
export async function renderStoryInvite(name: string) {
  await ready(`타인의 눈으로 보는 나 님의 캐해 연구에 초대되셨습니다 내가 본 님을 5분 만에 남겨 주세요 ${name}`);
  const { c, x } = canvas(360, 640);
  await storyBase(x);
  const cy = 300;
  glow(x, 110, cy + 20, 90, "#c3dbff"); glow(x, 180, cy + 36, 90, "#d8d3ff"); glow(x, 252, cy + 16, 90, "#f1cce8");
  x.save(); x.translate(180, cy + 12); x.rotate((-46 * Math.PI) / 180);
  x.beginPath(); x.ellipse(0, 0, 125, 56, 0, 0, Math.PI * 2); x.fillStyle = "rgba(255,255,255,.1)"; x.fill(); x.strokeStyle = "rgba(255,255,255,.85)"; x.lineWidth = 1; x.stroke(); x.restore();
  x.drawImage(await loadImage("/og/flask.png"), 180 - 128, cy - 128, 256, 256);
  line(x, [{ t: name, b: true }, { t: "님의 캐해 연구에" }], 180, 474, 28, G.g900);
  line(x, [{ t: "초대되셨습니다" }], 180, 510, 28, G.g900);
  text(x, `내가 본 ${name}님을 5분 만에 남겨 주세요`, 180, 546, 14, G.g700);
  return c;
}
/** 리포트 카드를 스토리 비율에 얹은 이미지 (1080×1920) */
export async function renderStoryReport(kind: CardKind, d: ShareData) {
  await ready(`${cardText(kind, d)} 친구들이 본 나, 궁금하다면 나도 내 연구소 만들기`);
  const { c, x } = canvas(360, 640);
  await storyBase(x);
  const inner = canvas(360, 450);
  await drawCard(inner.x, kind, d);
  const w = 288, h = 360, left = 36, top = 152;
  x.save(); x.shadowColor = "rgba(18,18,18,.25)"; x.shadowBlur = 40 * SCALE; x.shadowOffsetY = 16 * SCALE;
  x.beginPath(); x.roundRect(left, top, w, h, 24); x.fillStyle = G.g900; x.fill(); x.restore();
  x.save(); x.beginPath(); x.roundRect(left, top, w, h, 24); x.clip(); x.drawImage(inner.c, left, top, w, h); x.restore();
  text(x, "친구들이 본 나, 궁금하다면", 180, 552, 20, G.g900);
  text(x, "나도 내 연구소 만들기", 180, 582, 14, G.g700);
  return c;
}

/* ---------------------------------------------------------------- 내보내기 */
const toBlob = (c: HTMLCanvasElement) => new Promise<Blob | null>((res) => c.toBlob(res, "image/png"));
/** 공유 창을 열 수 있으면 열고(사진 저장·인스타그램 등), 아니면 파일로 내려받는다 */
export async function shareCanvas(c: HTMLCanvasElement, filename: string, opts: { text?: string; preferShare?: boolean } = {}): Promise<"shared" | "saved" | "cancelled" | "failed"> {
  const blob = await toBlob(c);
  if (!blob) return "failed";
  const file = new File([blob], filename, { type: "image/png" });
  if (opts.preferShare !== false && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], text: opts.text }); return "shared"; }
    catch (e) { if ((e as Error).name === "AbortError") return "cancelled"; }
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.rel = "noopener";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return "saved";
  } catch { return "failed"; }
}
