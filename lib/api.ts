import type { LabCreate, LabFull, LabPublic } from "@/lib/types";

/* 브라우저에서 부르는 저장소 요청 */
const json = (body: unknown): RequestInit => ({ headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
export type Fail = { error: "notfound" | "nokey" | "closed" | "full" | "invalid" | "profanity" | "busy" | "server" | "network" };
async function call<T>(url: string, init?: RequestInit): Promise<T | Fail> {
  try {
    const res = await fetch(url, { cache: "no-store", ...init });
    const data = await res.json().catch(() => ({}));
    return res.ok ? (data as T) : ({ error: data.error ?? "network" } as Fail);
  } catch { return { error: "network" }; }
}
export const isFail = (v: unknown): v is Fail => !!v && typeof v === "object" && "error" in (v as object);

export const createLab = (v: LabCreate) => call<{ id: string; key: string }>("/api/labs", { method: "POST", ...json(v) });
export const getLab = (id: string) => call<LabPublic>(`/api/labs/${id}`);
export const getLabFull = (id: string, key: string) => call<LabFull>(`/api/labs/${id}?key=${encodeURIComponent(key)}`);
export const updateLab = (id: string, key: string, v: Record<string, unknown>) => call<{ ok: true }>(`/api/labs/${id}?key=${encodeURIComponent(key)}`, { method: "PATCH", ...json(v) });
export const deleteLab = (id: string, key: string) => call<{ ok: true }>(`/api/labs/${id}?key=${encodeURIComponent(key)}`, { method: "DELETE" });
export const submitSample = (id: string, v: Record<string, unknown>) => call<{ id: string; count: number }>(`/api/labs/${id}/responses`, { method: "POST", ...json(v) });
export const reportSample = (id: string, key: string, sample: string, reason: number) => call<{ ok: true }>(`/api/labs/${id}/reports?key=${encodeURIComponent(key)}`, { method: "POST", ...json({ sample, reason }) });
export const submitTaste = (id: string, sid: string, taste: (number | null)[]) => call<{ ok: true }>(`/api/labs/${id}/responses/${sid}`, { method: "PATCH", ...json({ taste }) });

/** 이 기기에서 만든 연구소 (열쇠 보관) */
export type MyLab = { lab: string; key: string; name: string };
const MY = "kaehae-lab-v2";
export const myLab = (): MyLab | null => { try { return JSON.parse(localStorage.getItem(MY) ?? "null"); } catch { return null; } };
/* 주인이 열쇠 링크를 복사(또는 내보내기)해 둔 적이 있는지. 기기에만 적어 둔다. */
export const keySaved = (lab: string) => { try { return localStorage.getItem(`kaehae-keysaved-${lab}`) === "1"; } catch { return false; } };
export const markKeySaved = (lab: string) => { try { localStorage.setItem(`kaehae-keysaved-${lab}`, "1"); } catch {} };
export const setMyLab = (v: MyLab | null) => { try { if (v) localStorage.setItem(MY, JSON.stringify(v)); else localStorage.removeItem(MY); } catch {} };
