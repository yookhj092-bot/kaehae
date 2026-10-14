"use client";

/* 운영자 전용 통계. 서비스 화면에는 연결하지 않는다. 열쇠는 Vercel의 ADMIN_KEY(없으면 CRON_SECRET) 값이다.
   숫자는 모두 한국 시간 기준. 방문·공유·이탈은 통계 수집(004_events.sql)을 켠 뒤부터 쌓인다. */

import { useCallback, useEffect, useMemo, useState } from "react";
import { setTrackingOff, trackingOff } from "@/lib/track";

type Ev = { at: number; kind: string; role: string; lab: string | null; dev: string; meta: Record<string, string | number> };
type LabRow = { id: string; name: string; createdAt: number; open: boolean; samples: { id: string; at: number; bonus: boolean }[] };
type Dump = { labs: LabRow[]; events: Ev[] };

const KST = 9 * 3_600_000;
const day = (t: number) => new Date(t + KST).toISOString().slice(0, 10);
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
const fmt = (t: number) => new Date(t + KST).toISOString().slice(5, 16).replace("T", " ");
const STEP_NAME: Record<string, string> = {
  landing: "첫 화면", greet: "인사", name: "이름", rel: "관계", years: "알고 지낸 기간", know: "이해도", loading: "준비", idcard: "연구원증",
  intro2: "02 컬러 추출", color: "02 색 고르기", sat: "02 채도", tone: "02 톤", intro5: "05 성분 분석", ingredient: "05 성분", home: "05 집", tension: "05 긴장",
  intro10: "10 관계 데이터", word: "10 한 단어", secret: "10 비밀", intro11: "11 연구 소견", opinion: "11 소견", charm: "11 매력", vis: "공개 범위",
  pour: "붓기", done: "접수증", intro9: "보너스 안내", sync: "싱크로율",
};
const CH_NAME: Record<string, string> = { copy: "링크 복사", kakao: "카카오톡", native: "기기 공유", "invite-story": "스토리 이미지", sync: "싱크로율 이미지" };

export default function Admin() {
  const [key, setKey] = useState("");
  const [data, setData] = useState<Dump | null>(null);
  const [err, setErr] = useState("");
  const [range, setRange] = useState(14);
  const [off, setOff] = useState(false);

  const load = useCallback(async (k: string) => {
    setErr("");
    const res = await fetch("/api/admin", { headers: { "x-admin-key": k }, cache: "no-store" }).catch(() => null);
    if (!res || !res.ok) { setErr(res?.status === 403 ? "열쇠가 맞지 않습니다" : res?.status === 429 ? "너무 많이 틀렸습니다. 한 시간 뒤 다시 시도해 주세요" : "불러오지 못했습니다"); return; }
    setData(await res.json());
    try { sessionStorage.setItem("kaehae-admin", k); } catch {}
  }, []);
  useEffect(() => {
    setOff(trackingOff());
    let k = ""; try { k = sessionStorage.getItem("kaehae-admin") ?? ""; } catch {}
    if (k) { setKey(k); load(k); }
  }, [load]);

  const s = useMemo(() => (data ? analyze(data, range) : null), [data, range]);

  if (!data || !s) return (
    <main className="adm">
      <form className="adm-login" onSubmit={(e) => { e.preventDefault(); load(key.trim()); }}>
        <h1>KAEHAE 운영 통계</h1>
        <input type="password" value={key} onChange={(e) => setKey(e.target.value)} placeholder="운영자 열쇠" aria-label="운영자 열쇠" autoComplete="current-password" />
        <button type="submit" className="adm-btn dark" style={{ height: 48 }}>열기</button>
        {err ? <p className="adm-err">{err}</p> : null}
      </form>
    </main>
  );

  return (
    <main className="adm">
      <div className="adm-in">
        <div className="adm-head">
          <div><h1>KAEHAE 운영 통계</h1><p className="adm-sub">한국 시간 기준 · 불러온 시각 {fmt(Date.now())}</p></div>
          <div className="tools">
            <button type="button" className="adm-btn" onClick={() => load(key)}>새로고침</button>
            <button type="button" className={off ? "adm-btn dark" : "adm-btn"} onClick={() => { setTrackingOff(!off); setOff(!off); }}>{off ? "이 기기는 통계에서 빠짐" : "이 기기 통계에서 빼기"}</button>
          </div>
        </div>

        <section className="adm-kpis">
          <Kpi v={s.labs} l="만든 연구소" e={`첫 응답 받은 곳 ${pct(s.labsWithResp, s.labs)}%`} />
          <Kpi v={s.responses} l="받은 응답" e={`연구소당 ${s.labs ? (s.responses / s.labs).toFixed(1) : 0}개`} />
          <Kpi v={s.people} l="참여한 사람(기기)" e="만든 사람 + 응답한 사람" />
          <Kpi v={`${s.partRate}%`} l="응답 완료율" e={`초대 링크 연 ${s.rVisitors}명 중 ${s.rSubmitted}명`} />
          <Kpi v={`${s.ownerShareRate}%`} l="주인 공유율" e={`연구소 ${s.labsSince}곳 중 ${s.labsShared}곳이 공유`} />
          <Kpi v={`${s.viral}%`} l="응답자 → 새 연구소" e={`응답자 ${s.rSubmitted}명 중 ${s.converted}명`} />
        </section>

        <section className="adm-card">
          <div className="adm-head" style={{ marginBottom: 12 }}>
            <h2 style={{ margin: 0 }}>일별 추이</h2>
            <div className="adm-tabs" style={{ margin: 0 }}>{[7, 14, 30].map((n) => <button key={n} type="button" aria-pressed={range === n} onClick={() => setRange(n)}>{n}일</button>)}</div>
          </div>
          <DayChart rows={s.daily} pick="responses" label="받은 응답" />
          <div className="adm-scroll" style={{ marginTop: 16 }}>
            <table className="adm-table">
              <thead><tr><th>날짜</th><th className="n">방문 기기</th><th className="n">초대 링크 방문</th><th className="n">응답</th><th className="n">응답 완료율</th><th className="n">새 연구소</th><th className="n">공유</th></tr></thead>
              <tbody>{[...s.daily].reverse().map((d) => (
                <tr key={d.day}><td>{d.day.slice(5)}</td><td className="n">{d.visitors}</td><td className="n">{d.rVisitors}</td><td className="n">{d.responses}</td><td className="n">{d.rVisitors ? `${pct(d.rSubmitted, d.rVisitors)}%` : "–"}</td><td className="n">{d.labs}</td><td className="n">{d.shares}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </section>

        <div className="adm-grid2">
          <section className="adm-card"><h2>응답 흐름 (초대 링크를 연 사람 기준)</h2><Bars rows={s.rFunnel} /></section>
          <section className="adm-card"><h2>만들기 흐름 (첫 화면을 연 기기 기준)</h2><Bars rows={s.aFunnel} /></section>
          <section className="adm-card"><h2>공유 채널</h2>{s.channels.length ? <Bars rows={s.channels} /> : <p className="adm-sub">아직 공유 기록이 없습니다</p>}</section>
          <section className="adm-card"><h2>응답 중 그만둔 곳</h2>{s.drop.length ? <Bars rows={s.drop} /> : <p className="adm-sub">아직 중간에 그만둔 기록이 없습니다</p>}</section>
        </div>

        <section className="adm-card">
          <h2>연구소 목록 ({s.labRows.length})</h2>
          <div className="adm-scroll">
            <table className="adm-table">
              <thead><tr><th>이름</th><th>만든 때</th><th className="n">응답</th><th className="n">보너스</th><th className="n">공유</th><th>마지막 응답</th><th>상태</th></tr></thead>
              <tbody>{s.labRows.map((l) => (
                <tr key={l.id}><td>{l.name}</td><td>{fmt(l.createdAt)}</td><td className="n">{l.n}</td><td className="n">{l.bonus}</td><td className="n">{l.shares}</td><td>{l.last ? fmt(l.last) : "–"}</td><td>{l.state}</td></tr>
              ))}</tbody>
            </table>
          </div>
        </section>

        <ul className="adm-note">
          <li>방문·공유·흐름·그만둔 곳은 통계 수집을 켠 뒤부터 쌓입니다. 그 전에 만든 연구소와 응답은 목록과 합계에만 들어갑니다.</li>
          <li>사람 수는 기기 기준입니다. 같은 사람이 휴대폰과 컴퓨터로 들어오면 두 명으로 셉니다.</li>
          <li>연구소는 마지막 응답 30일 뒤 지워지지만, 통계 기록은 90일 동안 남아 &apos;삭제됨&apos;으로 보입니다.</li>
          <li>내 기기로 시험한 기록이 섞이지 않게, 쓰는 기기마다 이 화면에서 &apos;이 기기 통계에서 빼기&apos;를 눌러 두세요.</li>
        </ul>
      </div>
    </main>
  );
}

function Kpi({ v, l, e }: { v: number | string; l: string; e?: string }) {
  return <div className="adm-kpi"><b>{v}</b><span>{l}</span>{e ? <em>{e}</em> : null}</div>;
}
function Bars({ rows }: { rows: { label: string; n: number; of?: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.of ?? r.n));
  return (
    <div className="adm-bars">{rows.map((r) => (
      <div key={r.label} className="adm-bar" title={`${r.label}: ${r.n}${r.of ? ` / ${r.of}` : ""}`}>
        <span>{r.label}</span>
        <span className="tr"><i style={{ width: `${(r.n / max) * 100}%` }} /></span>
        <span className="v">{r.n}{r.of != null ? <small> · {pct(r.n, r.of)}%</small> : null}</span>
      </div>
    ))}</div>
  );
}
function DayChart({ rows, pick, label }: { rows: Daily[]; pick: keyof Daily; label: string }) {
  const max = Math.max(1, ...rows.map((r) => Number(r[pick])));
  return (<>
    <div className="adm-days" role="img" aria-label={`일별 ${label}`}>{rows.map((r) => (
      <div key={r.day} title={`${r.day.slice(5)} · ${label} ${r[pick]}`}><i style={{ height: `${(Number(r[pick]) / max) * 100}%` }} /></div>
    ))}</div>
    <div className="adm-days-x"><span>{rows[0]?.day.slice(5)}</span><span>{label} · 막대에 올리면 숫자</span><span>{rows.at(-1)?.day.slice(5)}</span></div>
  </>);
}

type Daily = { day: string; visitors: number; rVisitors: number; rSubmitted: number; responses: number; labs: number; shares: number };

function analyze({ labs, events }: Dump, range: number) {
  const now = Date.now();
  /* 연구소 · 응답: 지금 남아 있는 것 + 통계 기록에만 남은 것(삭제됨)을 번호로 합친다 */
  const labMap = new Map<string, { name: string; createdAt: number; open: boolean | null }>();
  for (const l of labs) labMap.set(l.id, { name: l.name, createdAt: l.createdAt, open: l.open });
  for (const e of events) if (e.kind === "lab_created" && e.lab && !labMap.has(e.lab)) labMap.set(e.lab, { name: "(삭제됨)", createdAt: e.at, open: null });
  const resp = new Map<string, { at: number; lab: string }>();
  for (const l of labs) for (const x of l.samples) resp.set(x.id, { at: x.at, lab: l.id });
  for (const e of events) if (e.kind === "submit" && e.meta.sid && !resp.has(String(e.meta.sid))) resp.set(String(e.meta.sid), { at: e.at, lab: e.lab ?? "" });

  const pair = (e: Ev) => `${e.dev}|${e.lab}`;
  const R = events.filter((e) => e.role === "r");
  const rVisit = new Set(R.filter((e) => e.kind === "step").map(pair));
  const rEnter = new Set(R.filter((e) => e.kind === "step" && e.meta.s !== "landing").map(pair));
  const rQuest = new Set(R.filter((e) => e.kind === "step" && !["landing", "greet", "name", "rel", "years", "know", "loading", "idcard"].includes(String(e.meta.s))).map(pair));
  const rSub = new Set(R.filter((e) => e.kind === "submit").map(pair));
  const rBonus = new Set(R.filter((e) => e.kind === "step" && e.meta.s === "sync").map(pair));
  const rMake = new Set(R.filter((e) => e.kind === "make_click").map((e) => e.dev));
  const subDevs = new Set(R.filter((e) => e.kind === "submit").map((e) => e.dev));
  const created = events.filter((e) => e.kind === "lab_created");
  const converted = new Set(created.filter((e) => e.meta.from || subDevs.has(e.dev)).map((e) => e.dev));

  const A = events.filter((e) => e.role === "a");
  const aHome = new Set(A.filter((e) => e.kind === "step" && e.meta.s === "home").map((e) => e.dev));
  const aStart = new Set(A.filter((e) => e.kind === "step" && e.meta.s === "name").map((e) => e.dev));
  const aMade = new Set(created.map((e) => e.dev));
  const labsSince = new Set(created.map((e) => e.lab));
  const ownerShares = events.filter((e) => e.kind === "share" && (e.role === "a" || e.role === "b") && e.lab);
  const labsShared = new Set(ownerShares.map((e) => e.lab).filter((l) => labsSince.has(l)));
  const keySaved = new Set(events.filter((e) => e.kind === "key_saved").map((e) => e.lab));
  const aShared = new Set(created.filter((e) => labsShared.has(e.lab)).map((e) => e.dev));

  /* 그만둔 곳: 제출하지 않은 (기기, 연구소)의 마지막 단계 */
  const lastStep = new Map<string, { at: number; s: string }>();
  for (const e of R) if (e.kind === "step") { const k = pair(e), p = lastStep.get(k); if (!p || e.at > p.at) lastStep.set(k, { at: e.at, s: String(e.meta.s) }); }
  const dropCount = new Map<string, number>();
  for (const [k, v] of lastStep) if (!rSub.has(k) && now - v.at > 30 * 60_000) dropCount.set(v.s, (dropCount.get(v.s) ?? 0) + 1);

  const ch = new Map<string, number>();
  for (const e of events) if (e.kind === "share") { const c = String(e.meta.ch ?? "기타"); ch.set(c, (ch.get(c) ?? 0) + 1); }

  /* 일별 */
  const daily: Daily[] = [];
  for (let i = range - 1; i >= 0; i--) {
    const d = day(now - i * 86_400_000);
    const ev = events.filter((e) => day(e.at) === d);
    const rv = new Set(ev.filter((e) => e.role === "r" && e.kind === "step").map(pair));
    daily.push({
      day: d, visitors: new Set(ev.map((e) => e.dev)).size, rVisitors: rv.size,
      rSubmitted: new Set(ev.filter((e) => e.kind === "submit").map(pair)).size,
      responses: [...resp.values()].filter((x) => day(x.at) === d).length,
      labs: [...labMap.values()].filter((x) => day(x.createdAt) === d).length,
      shares: ev.filter((e) => e.kind === "share").length,
    });
  }

  const shareByLab = new Map<string, number>();
  for (const e of ownerShares) shareByLab.set(e.lab!, (shareByLab.get(e.lab!) ?? 0) + 1);
  const labRows = [...labMap.entries()].map(([id, l]) => {
    const live = labs.find((x) => x.id === id);
    const mine = [...resp.values()].filter((x) => x.lab === id);
    return { id, name: l.name, createdAt: l.createdAt, n: mine.length, bonus: live ? live.samples.filter((x) => x.bonus).length : 0, shares: shareByLab.get(id) ?? 0, last: mine.length ? Math.max(...mine.map((x) => x.at)) : 0, state: l.open == null ? "삭제됨" : l.open ? (keySaved.has(id) ? "응답 받는 중" : "응답 받는 중 · 열쇠 미보관") : "마감" };
  }).sort((a, b) => b.createdAt - a.createdAt);

  const allDevs = new Set(events.map((e) => e.dev));
  return {
    labs: labMap.size, labsWithResp: new Set([...resp.values()].map((x) => x.lab)).size, responses: resp.size,
    people: Math.max(allDevs.size, resp.size), rVisitors: rVisit.size, rSubmitted: rSub.size, partRate: pct(rSub.size, rVisit.size),
    labsSince: labsSince.size, labsShared: labsShared.size, ownerShareRate: pct(labsShared.size, labsSince.size),
    converted: converted.size, viral: pct(converted.size, subDevs.size),
    rFunnel: [
      { label: "링크 열기", n: rVisit.size, of: rVisit.size }, { label: "입장하기", n: rEnter.size, of: rVisit.size }, { label: "문항 시작", n: rQuest.size, of: rVisit.size },
      { label: "제출", n: rSub.size, of: rVisit.size }, { label: "보너스 완료", n: rBonus.size, of: rVisit.size }, { label: "나도 만들기 누름", n: rMake.size, of: rVisit.size },
    ],
    aFunnel: [
      { label: "첫 화면", n: aHome.size, of: aHome.size }, { label: "만들기 시작", n: aStart.size, of: aHome.size }, { label: "연구소 완성", n: aMade.size, of: aHome.size },
      { label: "열쇠 보관", n: new Set(created.filter((e) => keySaved.has(e.lab)).map((e) => e.dev)).size, of: aHome.size }, { label: "친구에게 공유", n: aShared.size, of: aHome.size },
    ],
    channels: [...ch.entries()].sort((a, b) => b[1] - a[1]).map(([c, n]) => ({ label: CH_NAME[c] ?? c, n })),
    drop: [...dropCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([st, n]) => ({ label: STEP_NAME[st] ?? st, n })),
    daily, labRows,
  };
}
