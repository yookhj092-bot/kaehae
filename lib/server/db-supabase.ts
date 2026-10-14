import type { Sample } from "@/lib/types";
import type { DB, Lab, LabPatch } from "./db";

/* 배포용 저장소: Supabase(Postgres)를 REST로 부른다. 표는 supabase/schema.sql 로 만든다.
   서비스 키는 서버에서만 쓰고 브라우저로 나가지 않는다. */
/* 붙여 넣다가 섞인 줄바꿈·공백·끝 슬래시는 걷어 낸다 */
const URL_ = (process.env.SUPABASE_URL ?? "").trim().replace(/\/+$/, "");
const KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? "").replace(/\s+/g, "");
export const hasSupabase = () => !!URL_ && !!KEY;

async function rest(path: string, init: RequestInit & { prefer?: string } = {}) {
  const res = await fetch(`${URL_}/rest/v1/${path}`, {
    ...init,
    cache: "no-store",
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...(init.prefer ? { Prefer: init.prefer } : {}) },
  });
  if (!res.ok) throw new Error(`supabase ${res.status}`);
  return res;
}
const q = (v: string) => encodeURIComponent(v);
type LabRow = { id: string; key: string; name: string; rot_a: string; rot_b: string; rel: boolean; open: boolean; self: Lab["self"]; hidden: string[]; owner?: string | null; created_at: number; last_at: number; samples?: { id: string; at: number; data: Omit<Sample, "id" | "at"> }[] };
const toLab = (r: LabRow): Lab => ({
  id: r.id, key: r.key, name: r.name, rotA: r.rot_a, rotB: r.rot_b, rel: r.rel, open: r.open, self: r.self, hidden: r.hidden ?? [], owner: r.owner ?? null, createdAt: Number(r.created_at),
  samples: (r.samples ?? []).map((s) => ({ ...s.data, id: s.id, at: Number(s.at) })).sort((a, b) => a.at - b.at),
});
const COLS: Record<keyof LabPatch, string> = { rotA: "rot_a", rotB: "rot_b", rel: "rel", open: "open", self: "self", hidden: "hidden", owner: "owner" };

export const supabaseDB: DB = {
  async get(id) {
    const rows = (await (await rest(`labs?id=eq.${q(id)}&select=*,samples(id,at,data)`)).json()) as LabRow[];
    return rows[0] ? toLab(rows[0]) : null;
  },
  async byOwner(owner) {
    const rows = (await (await rest(`labs?owner=eq.${q(owner)}&select=*,samples(id,at,data)`)).json()) as LabRow[];
    return rows.map(toLab);
  },
  async create(lab) {
    await rest("labs", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ id: lab.id, key: lab.key, name: lab.name, rot_a: lab.rotA, rot_b: lab.rotB, rel: lab.rel, open: lab.open, self: lab.self, hidden: lab.hidden, created_at: lab.createdAt, last_at: lab.createdAt }) });
  },
  async patch(id, patch) {
    const body: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) body[COLS[k as keyof LabPatch]] = v;
    if (Object.keys(body).length) await rest(`labs?id=eq.${q(id)}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify(body) });
  },
  async remove(id) {
    await rest(`labs?id=eq.${q(id)}`, { method: "DELETE", prefer: "return=minimal" }); // 표본은 함께 지워진다(on delete cascade)
  },
  async addSample(id, s) {
    const { id: sid, at, ...data } = s;
    await rest("samples", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ id: sid, lab_id: id, at, data }) });
    await rest(`labs?id=eq.${q(id)}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ last_at: at }) });
  },
  async setTaste(id, sid, taste) {
    const rows = (await (await rest(`samples?id=eq.${q(sid)}&lab_id=eq.${q(id)}&select=data`)).json()) as { data: Record<string, unknown> }[];
    if (!rows[0]) return false;
    await rest(`samples?id=eq.${q(sid)}&lab_id=eq.${q(id)}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ data: { ...rows[0].data, taste } }) });
    return true;
  },
  async purge(before) {
    const rows = (await (await rest(`labs?last_at=lt.${before}`, { method: "DELETE", prefer: "return=representation" })).json()) as unknown[];
    return rows.length;
  },
};
