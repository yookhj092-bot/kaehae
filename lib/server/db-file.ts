import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DB, Ev, Lab } from "./db";

/* 개발용 저장소: .data/kaehae.json 파일 하나. 배포 환경에서는 쓰지 않는다(파일이 보관되지 않음). */
type Data = { labs: Record<string, Lab>; reports?: { labId: string; sampleId: string; reason: string; at: number }[]; rate?: Record<string, { n: number; win: number }>; errors?: { at: number; path: string; message: string }[]; events?: Ev[] };
const FILE = path.join(process.cwd(), ".data", "kaehae.json");
let queue: Promise<unknown> = Promise.resolve();
async function load(): Promise<Data> {
  try { return JSON.parse(await readFile(FILE, "utf-8")) as Data; } catch { return { labs: {} }; }
}
async function save(db: Data) {
  await mkdir(path.dirname(FILE), { recursive: true });
  await writeFile(FILE + ".tmp", JSON.stringify(db));
  await rename(FILE + ".tmp", FILE);
}
/** 읽고-고치고-쓰기를 한 번에 하나씩만 실행한다 */
function tx<T>(fn: (db: Data) => T): Promise<T> {
  const run = queue.then(async () => { const db = await load(); const out = fn(db); await save(db); return out; });
  queue = run.catch(() => {});
  return run;
}
const lastAt = (l: Lab) => (l.samples.length ? Math.max(...l.samples.map((s) => s.at)) : l.createdAt);

export const fileDB: DB = {
  get: async (id) => (await load()).labs[id] ?? null,
  create: (lab) => tx((db) => { db.labs[lab.id] = lab; }),
  patch: (id, patch) => tx((db) => { if (db.labs[id]) Object.assign(db.labs[id], patch); }),
  remove: (id) => tx((db) => { delete db.labs[id]; }),
  addSample: (id, s) => tx((db) => { db.labs[id]?.samples.push(s); }),
  setTaste: (id, sid, taste) => tx((db) => { const s = db.labs[id]?.samples.find((x) => x.id === sid); if (!s) return false; s.taste = taste; return true; }),
  addReport: (labId, sampleId, reason, at) => tx((db) => { (db.reports ??= []).push({ labId, sampleId, reason, at }); }),
  hit: (k, win) => tx((db) => { const r = (db.rate ??= {}); const n = r[k]?.n ?? 0; r[k] = { n: n + 1, win }; return n; }),
  logError: (at, path, message) => tx((db) => { (db.errors ??= []).push({ at, path, message }); }),
  stats: async (since) => { const db = await load(); return { errors: (db.errors ?? []).filter((e) => e.at >= since).length, reports: (db.reports ?? []).filter((r) => db.labs[r.labId]).length }; },
  addEvent: (e) => tx((db) => { (db.events ??= []).push(e); }),
  dump: async (since) => {
    const db = await load();
    return {
      labs: Object.values(db.labs).map((l) => ({ id: l.id, name: l.name, createdAt: l.createdAt, open: l.open, samples: l.samples.map((s) => ({ id: s.id, at: s.at, bonus: s.taste.some((x) => x != null) })) })),
      events: (db.events ?? []).filter((e) => e.at >= since),
    };
  },
  sweep: (before) => tx((db) => { db.events = (db.events ?? []).filter((e) => e.at >= before - 89 * 86_400_000); for (const [k, v] of Object.entries(db.rate ?? {})) if (v.win < before) delete db.rate![k]; db.errors = (db.errors ?? []).filter((e) => e.at >= before - 29 * 86_400_000); }),
  purge: (before) => tx((db) => { let n = 0; for (const [id, l] of Object.entries(db.labs)) if (lastAt(l) < before) { delete db.labs[id]; n++; } return n; }),
};
