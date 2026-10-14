import { createHash, randomBytes } from "node:crypto";
import { anyBad, isBad } from "@/lib/moderation";
import { RETENTION_DAYS } from "@/lib/site";
import type { LabCreate, LabFull, LabPublic, Sample, SelfAnswers } from "@/lib/types";
import type { DB, Lab, LabPatch } from "./db";
import { fileDB } from "./db-file";
import { hasSupabase, supabaseDB } from "./db-supabase";

/* 저장 규칙(검사 · 권한 · 보관 기간). 실제 저장은 db가 맡는다:
   SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY 환경 변수가 있으면 Supabase, 없으면 개발용 파일. */
const db: DB = hasSupabase() ? supabaseDB : fileDB;

const DAY = 86_400_000;
const rid = (n: number) => { const abc = "abcdefghjkmnpqrstuvwxyz23456789"; return Array.from(randomBytes(n), (b) => abc[b % abc.length]).join(""); };
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const num = (v: unknown, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null);
const int = (v: unknown, lo: number, hi: number) => { const n = num(v, lo, hi); return n == null ? null : Math.round(n); };
const hexOf = (v: unknown) => (typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : null);
const ROT_A = ["01", "03", "04", "07"], ROT_B = ["06", "08"];
function cleanSelf(v: unknown): SelfAnswers | null {
  if (!v || typeof v !== "object") return null;
  const s = v as Record<string, unknown>;
  const taste = Array.isArray(s.taste) ? s.taste.slice(0, 5).map((x) => int(x, 0, 9)) : [];
  while (taste.length < 5) taste.push(null);
  return { color: hexOf(s.color), taste };
}
/** 공용 문항의 답: 숫자 · 짧은 글 · 짧은 글 목록만 받는다 */
function cleanG(v: unknown) {
  const out: Record<string, unknown> = {};
  if (!v || typeof v !== "object") return out;
  for (const [k, x] of Object.entries(v as Record<string, unknown>).slice(0, 40)) {
    if (!/^[a-z0-9_]{1,20}$/.test(k)) continue;
    if (typeof x === "number" && Number.isFinite(x)) out[k] = x;
    else if (typeof x === "string") { const t = str(x, 100); if (t) out[k] = t; }
    else if (Array.isArray(x)) { const a = x.filter((y) => typeof y === "string").map((y) => str(y, 20)).filter(Boolean).slice(0, 8); if (a.length) out[k] = a; }
  }
  return out;
}
/* 보관 기간: 마지막 표본이 들어온 뒤(없으면 만든 뒤) RETENTION_DAYS일 */
const expiresAt = (l: Lab) => (l.samples.length ? Math.max(...l.samples.map((s) => s.at)) : l.createdAt) + RETENTION_DAYS * DAY;
const pub = (l: Lab): LabPublic => ({ id: l.id, name: l.name, rotA: l.rotA, rotB: l.rotB, rel: l.rel, open: l.open, self: l.self, count: l.samples.length, expiresAt: expiresAt(l) });
/** 기한이 지난 연구소는 지우고 없는 것으로 본다 */
async function alive(id: string): Promise<Lab | null> {
  const l = await db.get(id);
  if (!l) return null;
  if (Date.now() > expiresAt(l)) { await db.remove(id); return null; }
  return l;
}

export async function createLab(v: Partial<LabCreate>) {
  const name = str(v.name, 12);
  if (!name) return { error: "invalid" as const };
  if (isBad(name)) return { error: "profanity" as const };
  const lab: Lab = { id: rid(6), key: rid(14), name, rotA: ROT_A.includes(v.rotA ?? "") ? v.rotA! : "03", rotB: ROT_B.includes(v.rotB ?? "") ? v.rotB! : "08", rel: v.rel !== false, open: true, self: cleanSelf(v.self), createdAt: Date.now(), hidden: [], samples: [] };
  await db.create(lab);
  return { id: lab.id, key: lab.key };
}
export async function getLab(id: string, key?: string | null): Promise<{ lab: LabPublic | LabFull; owner: boolean } | null> {
  const l = await alive(id);
  if (!l) return null;
  if (!key || key !== l.key) return { lab: pub(l), owner: false };
  /* 익명을 고른 연구원의 이름은 주인에게도 보내지 않는다 */
  let k = 0;
  const samples = l.samples.map((s) => (s.vis === 2 ? { ...s, name: `익명의 연구원 #${++k}`, anon: true } : s));
  return { lab: { ...pub(l), samples, hidden: l.hidden }, owner: true };
}
export async function updateLab(id: string, key: string, v: Record<string, unknown>) {
  const l = await alive(id);
  if (!l || l.key !== key) return false;
  const p: LabPatch = {};
  if (typeof v.open === "boolean") p.open = v.open;
  if (typeof v.rel === "boolean") p.rel = v.rel;
  if (typeof v.rotA === "string" && ROT_A.includes(v.rotA)) p.rotA = v.rotA;
  if (typeof v.rotB === "string" && ROT_B.includes(v.rotB)) p.rotB = v.rotB;
  if (Array.isArray(v.hidden)) p.hidden = v.hidden.filter((x) => typeof x === "string").slice(0, 500) as string[];
  if ("self" in v) p.self = cleanSelf(v.self);
  await db.patch(id, p);
  return true;
}
export async function deleteLab(id: string, key: string) {
  const l = await db.get(id);
  if (!l || l.key !== key) return false;
  await db.remove(id);
  return true;
}
export async function addSample(id: string, v: Record<string, unknown>) {
  const l = await alive(id);
  if (!l) return { error: "notfound" as const };
  if (!l.open) return { error: "closed" as const };
  if (l.samples.length >= 300) return { error: "full" as const };
  const name = str(v.name, 12);
  if (!name) return { error: "invalid" as const };
  if (isBad(name) || isBad(v.opinion) || anyBad(v.g)) return { error: "profanity" as const };
  const vis = int(v.vis, 0, 2) ?? 0;
  const ing = Array.isArray(v.ing) && v.ing.length === 6 ? v.ing.map((x) => int(x, 0, 100) ?? 0) : null;
  const s: Sample = {
    id: rid(8), at: Date.now(), name, rel: str(v.rel, 12), years: str(v.years, 12), know: int(v.know, 1, 5) ?? 3,
    color: hexOf(v.color), colorName: str(v.colorName, 20) || null, sat: num(v.sat, 0, 1), season: int(v.season, 0, 3), texture: int(v.texture, 0, 8),
    ing: ing && ing.reduce((a, b) => a + b, 0) > 0 ? ing : null, zombie: int(v.zombie, 0, 4), opinion: str(v.opinion, 100) || null,
    vis: vis as 0 | 1 | 2, taste: [null, null, null, null, null], g: cleanG(v.g),
  };
  await db.addSample(id, s);
  return { id: s.id, count: l.samples.length + 1 };
}
export async function setTaste(id: string, sid: string, taste: unknown) {
  if (!Array.isArray(taste)) return false;
  return db.setTaste(id, sid, [0, 1, 2, 3, 4].map((i) => int(taste[i], 0, 9)));
}
/** 기한이 지난 연구소를 모두 지운다 (정기 실행용) */
export async function purgeExpired() {
  const removed = await db.purge(Date.now() - RETENTION_DAYS * DAY);
  await db.sweep(Date.now() - DAY).catch(() => {});
  return removed;
}

/* ---------- 신고 · 남용 방지 · 오류 기록 ---------- */
export const REPORT_REASONS = 5;
/** 주인이 받은 답을 운영자에게 신고한다 */
export async function addReport(id: string, key: string, v: Record<string, unknown>) {
  const l = await alive(id);
  if (!l || l.key !== key) return false;
  const sid = str(v.sample, 12), reason = int(v.reason, 0, REPORT_REASONS - 1);
  if (reason == null || !l.samples.some((s) => s.id === sid)) return false;
  await db.addReport(id, sid, String(reason), Date.now());
  return true;
}
/** 같은 접속 주소에서 windowMs 동안 limit번까지만 허용한다. 주소는 알아볼 수 없게 바꿔서 센다.
    횟수 표가 아직 없거나 저장소가 응답하지 않으면 막지 않고 통과시킨다. */
export async function rateOk(ip: string, kind: string, limit: number, windowMs: number) {
  try {
    const win = Math.floor(Date.now() / windowMs) * windowMs;
    const who = createHash("sha256").update(`${ip}|${process.env.CRON_SECRET ?? "kaehae"}`).digest("hex").slice(0, 20);
    return (await db.hit(`${kind}:${who}:${win}`, win)) < limit;
  } catch { return true; }
}
/** 서버 오류를 남긴다. 열쇠처럼 보이는 긴 문자열은 지우고 앞부분만 적는다. */
export async function logError(path: string, err: unknown) {
  const raw = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  const message = raw.replace(/sb_[a-z]+_[\w-]+/g, "[key]").replace(/[\w-]{24,}/g, "[…]").slice(0, 200);
  await db.logError(Date.now(), path.split("?")[0].replace(/\/labs\/[^/]+/, "/labs/:id").slice(0, 80), message).catch(() => {});
}
/* ---------- 이용 통계 ---------- */
const KINDS = ["step", "submit", "share", "lab_created", "make_click", "key_saved", "b_view"];
export async function addEvent(v: Record<string, unknown>) {
  const kind = str(v.k, 20), role = str(v.role, 1), dev = str(v.dev, 16);
  if (!KINDS.includes(kind) || !["a", "r", "b"].includes(role) || !/^[a-z0-9]{4,16}$/.test(dev)) return;
  const meta: Record<string, string | number> = {};
  if (v.meta && typeof v.meta === "object") for (const [k, x] of Object.entries(v.meta as Record<string, unknown>).slice(0, 4)) {
    if (!/^[a-z]{1,10}$/.test(k)) continue;
    if (typeof x === "number" && Number.isFinite(x)) meta[k] = x; else if (typeof x === "string") meta[k] = x.slice(0, 24);
  }
  const lab = str(v.lab, 12) || null;
  await db.addEvent({ at: Date.now(), kind, role, lab: lab && /^[a-z0-9]+$/.test(lab) ? lab : null, dev, meta });
}
export const statsDump = (days = 90) => db.dump(Date.now() - days * DAY);
export const opsStats = () => db.stats(Date.now() - DAY).catch(() => null);

