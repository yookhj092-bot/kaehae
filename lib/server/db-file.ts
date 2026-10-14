import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import type { DB, Lab } from "./db";

/* 개발용 저장소: .data/kaehae.json 파일 하나. 배포 환경에서는 쓰지 않는다(파일이 보관되지 않음). */
type Data = { labs: Record<string, Lab> };
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
  purge: (before) => tx((db) => { let n = 0; for (const [id, l] of Object.entries(db.labs)) if (lastAt(l) < before) { delete db.labs[id]; n++; } return n; }),
};
