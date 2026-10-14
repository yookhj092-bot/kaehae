"use client";

/* B 플로우: 연구 대상이 열쇠 링크로 들어와 보는 연구소 홈과 리포트.
   B-01 연구소 홈 · B-02 새 표본 도착 · B-03 리포트 종합 · B-04 연구원별 목록 · B-05 연구원 상세 · B-06 문항별 보기
   B-07 나 vs 친구들 · B-08 공유 카드 · B-09 숨기기·신고 · B-10 카카오 연결 · B-12 설정 (B-11 알림은 지인 테스트 단계에서 뺐다)
   /b?lab=…&key=… (열쇠 링크) 또는 이 기기에서 만든 연구소가 있으면 서버의 실제 표본으로 그린다.
   둘 다 없으면 예시 데이터. 예시 옵션: ?demo=1 · ?n=0~4 · ?self=0. 공통: ?at=home|arrive|report|people|compare|card|settings · ?instant=1 */

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { AiOrb, Beaker, BottomSheet, Button, Guide, Icon, Modal, Navigation, Selection, Tabs, TextButton, Toast, buzz, copyText, cx, useToast } from "@/components/ui";
import { Device } from "./Device";
import { useFlaskSrc } from "./widgets";
import { QDEFS, type QDef } from "./questions";
import { mix } from "@/lib/color";
import { expById, pad2 } from "@/lib/experiments";
import { renderCard, renderStoryReport, shareCanvas, type CardKind } from "@/lib/shareImage";
import { deleteLab, getLabFull, isFail, myLab, setMyLab, updateLab } from "@/lib/api";
import type { Sample } from "@/lib/types";
import { RETENTION_DAYS } from "@/lib/site";
import { kakaoShareReady, shareInviteToKakao } from "@/lib/kakao";
import { DEMO_SELF, demoSamples, INGREDIENTS, SEASONS, TASTE, TEXTURES, VIS, ZOMBIE, ago, avg, tally, type Self } from "./reportData";

type View = "home" | "arrive" | "report" | "person" | "question" | "card" | "settings";
type Tab = "all" | "people" | "compare";
type R = Sample;

const pct = (v: number) => `${Math.round(v * 100)}%`;
const lean = (v: number, ends: [string, string]) => (Math.abs(v - 0.5) < 0.06 ? "딱 중간" : `‘${v < 0.5 ? ends[0] : ends[1]}’ 쪽으로 ${Math.round(Math.abs(v - 0.5) * 200)}%`);
const dotColor = (r: R) => r.color ?? "#BDBDBD";

/* 문항 정의: 종합 · 문항별 · 연구원 상세가 함께 쓴다. text가 null이면 그 연구원은 답하지 않은 것. */
type Item = { key: string; exp: number; title: string; def?: QDef; text: (r: R) => string | null; dot?: (r: R) => string | null };
const CUSTOM: Item[] = [
  { key: "color", exp: 2, title: "색으로 추출한다면 어떤 색일까요?", text: (r) => (r.color ? `${r.colorName ?? ""} ${r.color}`.trim() : null), dot: (r) => r.color },
  { key: "sat", exp: 2, title: "채도는 몇 퍼센트쯤일까요?", text: (r) => (r.sat != null ? pct(r.sat) : null) },
  { key: "season", exp: 3, title: "가장 닮은 계절은 언제인가요?", text: (r) => (r.season != null ? SEASONS[r.season] : null) },
  { key: "texture", exp: 3, title: "촉각으로 표현한다면 어떤 질감일까요?", text: (r) => (r.texture != null ? TEXTURES[r.texture] : null) },
  { key: "ing", exp: 5, title: "성분표를 만들어 주세요.", text: (r) => (r.ing ? r.ing.map((v, i) => [INGREDIENTS[i].name, v] as const).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map((x) => `${x[0]} ${x[1]}%`).join(" · ") : null) },
  { key: "zombie", exp: 8, title: "좀비가 창궐한 세상에서 어떤 역할일까요?", text: (r) => (r.zombie != null ? ZOMBIE[r.zombie] : null) },
  { key: "opinion", exp: 11, title: "한 줄 소견", text: (r) => r.opinion },
];
function fmt(def: QDef, v: unknown): string | null {
  if (v == null) return null;
  switch (def.kind) {
    case "choice": case "grid": case "ox": return typeof v === "number" ? def.opts?.[v] ?? null : null;
    case "chips": return Array.isArray(v) && v.length ? v.join(", ") : null;
    case "text": return typeof v === "string" ? v : null;
    case "blank2": return Array.isArray(v) && v.length === 2 ? `처음엔 ${v[0]}, 알고 보니 ${v[1]}` : null;
    case "bipolar": return typeof v === "number" ? lean(v, def.ends!) : null;
    case "scale": return typeof v === "number" ? `${v} / 5` : null;
    case "dial": return typeof v === "number" ? String(v) : null;
  }
}
const EXP_ORDER = [2, 1, 3, 4, 7, 5, 6, 8, 10, 11];
const REPORT_REASONS = ["욕설·비방이 담겨 있어요", "나를 특정해 괴롭히는 내용이에요", "개인정보가 들어 있어요", "장난·도배성 답변이에요", "기타"];

export function BFlow() {
  const [view, setView] = useState<View>("home");
  const [tab, setTab] = useState<Tab>("all");
  const [ready, setReady] = useState(false);
  const [live, setLive] = useState<{ lab: string; key: string } | null>(null); // 없으면 예시 데이터
  const [name, setName] = useState("지원");
  const [samples, setSamples] = useState<Sample[]>([]);
  const [self, setSelf] = useState<Self | null>(DEMO_SELF);
  const [seen, setSeen] = useState(0); // 이미 확인한 표본 수
  const [person, setPerson] = useState<string | null>(null);
  const [qkey, setQkey] = useState<string | null>(null);
  const [hidden, setHiddenState] = useState<string[]>([]);
  const [menu, setMenu] = useState<{ id: string; step: "menu" | "report"; reason: number | null } | null>(null);
  const [sheet, setSheet] = useState<null | "kakao" | "invite">(null);
  const [kakao, setKakao] = useState(false);
  const [open, setOpen] = useState(true); // 응답 받는 중
  const [expiresAt, setExpiresAt] = useState<number | null>(null); // 자동 삭제 예정 시각
  const [confirmDel, setConfirmDel] = useState(false);
  const [tpl, setTpl] = useState<"color" | "ing" | "quote">("color");
  const [instant, setInstant] = useState(false);
  const toast = useToast();
  const flask = useFlaskSrc();

  /* 서버에서 연구소와 표본을 받아 온다 */
  const refresh = useCallback(async (l: { lab: string; key: string }, first = false) => {
    const d = await getLabFull(l.lab, l.key);
    if (isFail(d)) {
      if (first) location.replace(d.error === "network" ? "/e?k=offline" : d.error === "nokey" ? "/e?k=nokey" : "/e?k=notfound");
      return;
    }
    setName(d.name); setSamples(d.samples); setOpen(d.open); setHiddenState(d.hidden); setExpiresAt(d.expiresAt);
    setSelf(d.self ? { color: d.self.color, taste: d.self.taste } : null);
    setKakao(d.kakao);
    if (first) {
      let s = d.samples.length;
      try { const raw = localStorage.getItem(`kaehae-seen-${l.lab}`); if (raw != null) s = Math.min(d.samples.length, Number(raw) || 0); else localStorage.setItem(`kaehae-seen-${l.lab}`, String(s)); } catch {}
      setSeen(s);
      setReady(true);
    }
  }, []);
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setInstant(q.has("instant"));
    const at = q.get("at");
    if (at === "people" || at === "compare") { setView("report"); setTab(at); }
    else if (at && ["home", "arrive", "report", "card", "settings"].includes(at)) setView(at as View);
    if (q.get("lab") && !q.get("key")) return location.replace("/e?k=nokey"); // 열쇠 없이 연구소 주소만 들고 온 경우
    const kk = q.get("kakao");
    if (kk) {
      setTimeout(() => toast.show(kk === "linked" ? "카카오에 열쇠를 보관했습니다" : kk === "found" ? "보관해 둔 연구소를 열었습니다" : kk === "off" ? "카카오 연결은 아직 준비 중입니다" : kk === "cancel" ? "카카오 연결을 취소했습니다" : "카카오 연결에 실패했습니다. 다시 시도해 주세요"), 400);
      q.delete("kakao"); history.replaceState(null, "", `${location.pathname}?${q}`);
    }
    const mine = myLab();
    const demo = q.has("demo") || q.has("n") || q.has("self");
    const l = q.get("lab") ? { lab: q.get("lab")!, key: q.get("key")! } : !demo && mine ? { lab: mine.lab, key: mine.key } : null;
    if (!l) {
      /* 예시 데이터 */
      const all = demoSamples();
      const k = q.has("n") ? Math.max(0, Math.min(4, Number(q.get("n")) || 0)) : all.length;
      setSamples(all.slice(all.length - k)); setSeen(Math.max(0, k - 1));
      if (q.get("self") === "0") setSelf(null);
      return setReady(true);
    }
    setLive(l);
    refresh(l, true);
    /* 새 표본이 오는지 주기적으로 확인한다 */
    const tick = () => { if (document.visibilityState === "visible") refresh(l); };
    const id = setInterval(tick, 15000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [refresh]);

  const setHidden = (next: string[]) => { setHiddenState(next); if (live) updateLab(live.lab, live.key, { hidden: next }); };
  const markSeen = () => { setSeen(samples.length); if (live) { try { localStorage.setItem(`kaehae-seen-${live.lab}`, String(samples.length)); } catch {} } };

  /* ---------- 집계 ---------- */
  const list = useMemo(() => [...samples].sort((a, b) => b.at - a.at), [samples]);
  const n = list.length;
  const hasSelf = !!self;
  const newcomer = n > seen ? list[0] : null;
  const isNew = (r: R) => !!newcomer && r.id === newcomer.id;
  const colored = useMemo(() => list.filter((r) => r.color), [list]);
  const mixed = useMemo(() => mix(colored.length ? colored.map((r) => r.color!) : ["#E0E0E0"]), [colored]);
  const withIng = useMemo(() => list.filter((r) => r.ing), [list]);
  const ingAvg = useMemo(() => INGREDIENTS.map((_, i) => Math.round(avg(withIng.map((r) => r.ing![i])))), [withIng]);
  const topIng = INGREDIENTS.map((g, i) => ({ ...g, v: ingAvg[i] })).sort((a, b) => b.v - a.v);
  const charms = useMemo(() => tally(list.flatMap((r) => (Array.isArray(r.g.charm) ? (r.g.charm as string[]) : []))), [list]);
  const seasons = tally(list.filter((r) => r.season != null).map((r) => r.season!), SEASONS);
  /* 답이 하나라도 있는 문항만, 실험 순서대로 */
  const items = useMemo(() => {
    const keys = new Set(list.flatMap((r) => Object.keys(r.g)));
    const generic: Item[] = Object.entries(QDEFS).filter(([k, d]) => d.exp !== 9 && keys.has(k)).map(([k, d]) => ({ key: k, exp: d.exp, def: d, title: d.title.replaceAll("{S}", name), text: (r: R) => fmt(d, r.g[k]) }));
    const all = [...CUSTOM.filter((c) => c.key !== "opinion"), ...generic, CUSTOM.find((c) => c.key === "opinion")!];
    return all.filter((it) => list.some((r) => it.text(r) != null)).sort((a, b) => EXP_ORDER.indexOf(a.exp) - EXP_ORDER.indexOf(b.exp));
  }, [list, name]);
  const expLabel = (no: number) => `EXP. ${pad2(no)} ${expById(no).title}`;
  const tasteOf = (r: R) => (self ? (r.taste.map((v, i) => (v != null && self.taste[i] != null ? v === self.taste[i] : null)).filter((x) => x != null) as boolean[]) : []);
  const syncOf = (r: R) => { const t = tasteOf(r); return t.length ? Math.round((t.filter(Boolean).length / t.length) * 100) : null; };

  const origin = typeof window !== "undefined" ? location.origin : "";
  const inviteUrl = live ? `${origin}/r?lab=${live.lab}` : `${origin}/r`;
  const copy = async (text: string, msg: string) => { buzz(8); toast.show((await copyText(text)) ? msg : "복사하지 못했습니다"); };

  /* 공유 카드 이미지 (피그마 sharing image의 card/* · story/report) */
  const exportCard = async (mode: "save" | "share" | "story") => {
    const best = list.find((r) => r.vis === 0 && r.opinion && !hidden.includes(r.id));
    const data = { name, n, mixed, colors: colored.map((r) => r.color!), ing: topIng.map((g) => ({ name: g.name, color: g.color, v: g.v })), quote: best ? { text: best.opinion!, by: `${best.rel} ${best.name}의 소견` } : null };
    const kind: CardKind = tpl;
    toast.show("이미지를 만드는 중입니다");
    const c = mode === "story" ? await renderStoryReport(kind, data) : await renderCard(kind, data);
    const r = await shareCanvas(c, mode === "story" ? "kaehae-story.png" : `kaehae-${kind}.png`, { preferShare: mode !== "save", text: `친구들이 본 ${name}의 캐해 리포트` });
    if (r !== "cancelled") toast.show(r === "saved" ? "이미지를 저장했습니다" : r === "shared" ? "공유했습니다" : "이미지를 만들지 못했습니다");
  };

  const openQ = (key: string) => { setQkey(key); setView("question"); };
  const openP = (id: string) => { setPerson(id); setView("person"); };
  const back = () => setView(view === "person" || view === "question" || view === "card" ? "report" : "home");

  /* ---------- 조각 ---------- */
  const sec = (it: Item, children: ReactNode) => (
    <section className="rp-sec glass" key={it.key}>
      <button type="button" className="rp-head pressable" onClick={() => openQ(it.key)} aria-label={`${it.title} 문항별 보기`}>
        <span className="exp">{expLabel(it.exp)}</span>
        <b>{it.title}</b>
        <Icon name="next" size={20} />
      </button>
      {children}
    </section>
  );
  const dist = (rows: { label: string; count: number }[], total: number) => (
    <div className="rp-dist">
      {rows.map((it, i) => (
        <div key={it.label} className={i === 0 ? "top" : undefined}>
          <span className="lb">{it.label}</span>
          <span className="bar"><i style={{ "--w": `${(it.count / Math.max(1, total)) * 100}%`, "--i": i } as CSSProperties} /></span>
          <span className="ct">{it.count}명</span>
        </div>
      ))}
    </div>
  );
  const who = (r: R) => (
    <span className="rp-who"><i style={{ background: dotColor(r) }} />{r.name}<em>{r.rel}</em></span>
  );
  const quote = (r: R) =>
    hidden.includes(r.id) ? (
      <div className="rp-quote hiddenq" key={r.id}><span>숨긴 답변입니다.</span><TextButton size="sm" onClick={() => setHidden(hidden.filter((x) => x !== r.id))}>다시 보기</TextButton></div>
    ) : (
      <div className="rp-quote" key={r.id}>
        <p>“{r.opinion}”</p>
        <div className="meta">
          {who(r)}
          <span className={cx("vis", `v${r.vis}`)}>{VIS[r.vis]}</span>
          <button type="button" className="pressable" aria-label="답변 메뉴" onClick={() => setMenu({ id: r.id, step: "menu", reason: null })}><Icon name="more" size={20} /></button>
        </div>
      </div>
    );
  /** 문항 하나의 종합 결과 */
  const summary = (it: Item): ReactNode => {
    const rs = list.filter((r) => it.text(r) != null);
    switch (it.key) {
      case "color":
        return (
          <div className="rp-color">
            <i className="mixed" style={{ "--mix": mixed } as CSSProperties} />
            <div className="sw">{rs.map((r) => <i key={r.id} style={{ background: r.color! }} title={r.name} />)}</div>
            <span>{rs.length}명의 색을 섞은 {name}님의 대표 컬러</span>
          </div>
        );
      case "sat":
        return (<>
          <div className="rp-avg"><b>{pct(avg(rs.map((r) => r.sat!)))}</b><span>평균 채도</span></div>
          <div className="rp-line" style={{ "--track": `linear-gradient(90deg, ${mixed}00, ${mixed})` } as CSSProperties}>{rs.map((r) => <i key={r.id} style={{ left: pct(r.sat!), background: dotColor(r) }} />)}</div>
          <div className="rp-ends"><span>무채색</span><span>선명함</span></div>
        </>);
      case "season": return dist(tally(rs.map((r) => r.season!), SEASONS), rs.length);
      case "texture": return dist(tally(rs.map((r) => r.texture!), TEXTURES), rs.length);
      case "zombie": return dist(tally(rs.map((r) => r.zombie!), ZOMBIE), rs.length);
      case "ing":
        return (
          <div className="rp-ing">
            <Beaker layers={INGREDIENTS.map((g, i) => ({ ...g, value: ingAvg[i] }))} />
            <ul>{topIng.map((g) => <li key={g.name}><i style={{ background: g.color }} /><span>{g.name}</span><b>{g.v}%</b></li>)}</ul>
          </div>
        );
      case "opinion": return <div className="stack-12">{rs.map((r) => quote(r))}</div>;
    }
    const def = it.def!;
    const vals = rs.map((r) => r.g[it.key]);
    switch (def.kind) {
      case "choice": case "grid": case "ox": return dist(tally(vals as number[], def.opts), rs.length);
      case "chips": {
        const words = tally((vals as string[][]).flat());
        return <div className="rp-words">{words.map((c) => <span key={c.label} className={`w${Math.min(3, c.count)}`}>{c.label}<em>{c.count}</em></span>)}</div>;
      }
      case "bipolar": {
        const m = avg(vals as number[]);
        return (<>
          <div className="rp-line">{rs.map((r) => <i key={r.id} style={{ left: pct(r.g[it.key] as number), background: dotColor(r) }} />)}<em style={{ left: pct(m) }} /></div>
          <div className="rp-ends"><span>{def.ends![0]}</span><span>{def.ends![1]}</span></div>
          <p className="rp-note">평균은 <b>{lean(m, def.ends!)}</b>입니다.</p>
        </>);
      }
      case "scale": case "dial": {
        const max = def.kind === "scale" ? 5 : 99, min = def.kind === "scale" ? 1 : 0, m = avg(vals as number[]);
        return (<>
          <div className="rp-avg"><b>{def.kind === "scale" ? m.toFixed(1) : Math.round(m)}</b><span>평균{def.kind === "scale" ? " (5점 만점)" : ""}</span></div>
          <div className="rp-line">{rs.map((r) => <i key={r.id} style={{ left: pct(((r.g[it.key] as number) - min) / (max - min)), background: dotColor(r) }} />)}</div>
          <div className="rp-ends"><span>{def.ends?.[0] ?? min}</span><span>{def.ends?.[1] ?? max}</span></div>
        </>);
      }
      default:
        return <ul className="rp-texts">{rs.map((r) => <li key={r.id}><b>{it.text(r)}</b>{who(r)}</li>)}</ul>;
    }
  };

  if (!ready) return <Device><div className="scr" /></Device>;

  /* ---------- 화면 ---------- */
  let title = "";
  let content: ReactNode = null;
  switch (view) {
    case "home":
      content = (<>
        <div className="scr-body">
          <Guide text={n === 0 ? "아직 도착한 표본이 없습니다. 링크를 보내 보세요." : newcomer ? `${newcomer.name}님의 새 표본이 도착했습니다.` : `지금까지 표본 ${n}개가 모였습니다.`} />
          <div className="lab-hero">
            <div className={cx("glow", n === 0 && "empty")} style={{ "--mix": mixed } as CSSProperties} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={flask} alt="" draggable={false} />
            <div className="cap">
              <b>{name}님의 캐해 연구소</b>
              <span>{n === 0 ? `표본 0개 · ${open ? "응답 받는 중" : "마감됨"}` : `표본 ${n}개 · 마지막 도착 ${ago(list[0].at)}${open ? "" : " · 마감됨"}`}</span>
            </div>
          </div>
          {newcomer ? (
            <button type="button" className="bonus-card pressable" onClick={() => { buzz(8); setView("arrive"); }}>
              <span className="tag">NEW · 새 표본 {n - seen}개</span>
              <b>{newcomer.name}님이 {newcomer.color ? "색을 부었습니다" : "표본을 남겼습니다"}</b>
              <span>눌러서 플라스크에 섞이는 모습을 확인해 보세요</span>
            </button>
          ) : null}
          {n > 0 ? (
            <section className="home-sec">
              <h2>참여한 연구원 <span>{n}명</span></h2>
              <div className="people-row">
                {list.map((r) => (
                  <button key={r.id} type="button" className="pressable" onClick={() => openP(r.id)}>
                    <i style={{ background: dotColor(r) }}>{isNew(r) ? <em /> : null}</i>
                    <span>{r.anon ? "익명" : r.name}</span>
                  </button>
                ))}
                <button type="button" className="pressable" onClick={() => setSheet("invite")}><i className="add"><Icon name="plus" size={20} /></i><span>초대</span></button>
              </div>
            </section>
          ) : (
            <div className="empty-box glass">
              <b>첫 표본을 기다리고 있습니다</b>
              <span>한 명만 답해도 리포트가 열립니다. 친한 친구 한 명에게 먼저 보내 보세요.</span>
            </div>
          )}
          <section className="home-sec">
            <h2>연구소 관리</h2>
            <div className="stack-12">
              {!hasSelf ? <button type="button" className="nudge glass pressable" onClick={() => location.assign("/a?at=s_color")}><b>내가 보는 나 남기기</b><span>답해 두면 ‘나 vs 친구들’ 비교가 열립니다 · 약 40초</span><Icon name="next" size={20} /></button> : null}
              {!kakao ? <button type="button" className="nudge glass pressable" onClick={() => setSheet("kakao")}><b>카카오로 열쇠 보관하기</b><span>링크를 잃어버려도 다시 들어올 수 있습니다</span><Icon name="next" size={20} /></button> : null}
              {kakao && hasSelf ? <p className="all-set">연구소 준비가 모두 끝났습니다.</p> : null}
            </div>
          </section>
        </div>
        <div className="scr-bottom">
          {n > 0 ? <Button block onClick={() => { setTab("all"); setView("report"); }} className="sheen">리포트 보기</Button> : <Button block iconLeft="export" onClick={() => setSheet("invite")} className="sheen">친구 초대하기</Button>}
          {n > 0 ? <div className="later"><TextButton size="sm" onClick={() => setSheet("invite")}>친구 더 초대하기</TextButton></div> : null}
        </div>
      </>);
      break;

    case "arrive": {
      const r = newcomer ?? list[0];
      content = r ? (
        <div className="scr hero-scr" style={{ paddingTop: "var(--safe-t)" }}>
          <div className="scr-body">
            <div style={{ height: 62 }} />
            <div className="hero-stage" style={{ marginTop: -12 }}>
              <motion.div className="hero-glow on" style={{ "--mix": mixed } as CSSProperties} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 0.85, scale: 1 }} transition={{ duration: 1.4, delay: 1.1 }} />
              <div className="hero-ring" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <motion.img className="hero-flask" src={flask} alt="" draggable={false} animate={{ scale: [1, 1, 1.06, 0.98, 1], rotate: [0, 0, -3, 2, 0] }} transition={{ duration: 2, times: [0, 0.5, 0.65, 0.8, 1] }} />
              <motion.span className="arrive-drop" style={{ background: dotColor(r) }} initial={{ y: -150, opacity: 0, scale: 0.6 }} animate={{ y: [-150, -150, 110], opacity: [0, 1, 0], scale: [0.6, 1, 0.5] }} transition={{ duration: 1.3, times: [0, 0.25, 1], ease: [0.5, 0, 0.8, 0.4] }} />
            </div>
            <motion.p className="hero-text" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2, duration: 0.6 }}>
              <span><b>{r.name}</b>님의 {r.color ? "색이" : "표본이"}</span><span>플라스크에 {r.color ? "섞였습니다" : "담겼습니다"}</span>
            </motion.p>
            {r.color ? (
              <motion.div className="arrive-mix" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>
                <i style={{ background: r.color }} /><span>{r.colorName ?? r.color}</span><em>→</em><i style={{ background: mixed }} /><span>지금의 색</span>
              </motion.div>
            ) : null}
          </div>
          <div className="scr-bottom">
            <Button block onClick={() => { markSeen(); openP(r.id); }} className="sheen">{r.name}님의 답 보기</Button>
            <div className="later"><TextButton size="sm" onClick={() => { markSeen(); setView("home"); }}>연구소로 돌아가기</TextButton></div>
          </div>
        </div>
      ) : null;
      break;
    }

    case "report": {
      title = "캐해 리포트";
      const selfIng = self?.ing, selfTop = selfIng ? INGREDIENTS[selfIng.indexOf(Math.max(...selfIng))].name : null;
      const homes = list.filter((r) => typeof r.g.home === "number").map((r) => r.g.home as number);
      const played = list.filter((r) => tasteOf(r).length > 0);
      content = (<>
        <div className="rp-tabs"><Tabs<Tab> items={[{ id: "all", label: "종합" }, { id: "people", label: "연구원별" }, { id: "compare", label: "나 vs 친구들" }]} value={tab} onChange={(t) => { buzz(6); setTab(t); }} /></div>
        <div className="scr-body rp-body" key={tab}>
          {n === 0 ? (
            <div className="empty-box glass"><b>아직 도착한 표본이 없습니다</b><span>한 명만 답해도 리포트가 열립니다.</span><Button size="md" onClick={() => setSheet("invite")}>친구 초대하기</Button></div>
          ) : tab === "all" ? (<>
            {/* AI 요약은 맨 위, 연파랑 */}
            <section className="rp-ai">
              <div className="h"><AiOrb size={24} /><b>AI 요약</b><span>연구원 {n}명 기준</span></div>
              <p>
                {charms.length ? <>친구들이 본 {name}님을 대표하는 단어는 <b>{charms.slice(0, 2).map((c) => c.label).join(", ")}</b>입니다. </> : null}
                {withIng.length ? <>성분은 <b>{topIng[0].name} {topIng[0].v}%</b>, <b>{topIng[1].name} {topIng[1].v}%</b> 순으로 많았습니다. </> : null}
                {seasons.length ? <>가장 많이 고른 계절은 <b>{seasons[0].label}</b>입니다. </> : null}
                {!charms.length && !withIng.length && !seasons.length ? <>지금까지 연구원 {n}명이 표본을 남겼습니다. </> : null}
                {n < 3 ? "표본이 더 모이면 요약이 더 정확해집니다." : ""}
              </p>
            </section>
            {items.map((it) => sec(it, summary(it)))}
          </>) : tab === "people" ? (
            <div className="stack-12 stagger">
              {list.map((r) => (
                <button key={r.id} type="button" className="person-row glass pressable" onClick={() => openP(r.id)}>
                  <i style={{ background: dotColor(r) }} />
                  <span className="tx"><b>{r.name}{isNew(r) ? <em>NEW</em> : null}</b><span>{[r.rel, r.years, `이해도 ${r.know}/5`].filter(Boolean).join(" · ")}</span></span>
                  <span className="ago">{ago(r.at)}</span>
                  <Icon name="next" size={20} />
                </button>
              ))}
            </div>
          ) : self ? (<>
            <section className="rp-ai"><div className="h"><AiOrb size={24} /><b>AI 요약</b></div>
              <p>
                {selfTop && withIng.length ? <>{name}님은 스스로를 <b>{selfTop}</b> 성분이 많다고 보았지만, 친구들이 가장 크게 느낀 성분은 <b>{topIng[0].name}</b>입니다. </> : null}
                {played.length ? <>보너스 라운드에 참여한 {played.length}명의 평균 싱크로율은 <b>{Math.round(avg(played.map((r) => syncOf(r)!)))}%</b>입니다. </> : <>아직 보너스 라운드에 참여한 연구원이 없습니다. </>}
                {self.color && colored.length ? "내가 고른 색과 친구들이 섞은 색을 아래에서 비교해 보세요." : ""}
              </p>
            </section>
            {self.color && colored.length ? (
              <section className="rp-sec glass">
                <div className="rp-head static"><span className="exp">{expLabel(2)}</span><b>내가 고른 색 vs 친구들이 섞은 색</b></div>
                <div className="cmp-color">
                  <div><i style={{ background: self.color }} /><b>나</b><span>{self.colorName ?? self.color}{self.sat != null ? ` · 채도 ${pct(self.sat)}` : ""}</span></div>
                  <div><i style={{ background: mixed }} /><b>친구들</b><span>{colored.length}명의 색을 섞음</span></div>
                </div>
              </section>
            ) : null}
            {selfIng && withIng.length ? (
              <section className="rp-sec glass">
                <div className="rp-head static"><span className="exp">{expLabel(5)}</span><b>성분표 비교</b></div>
                <div className="cmp-bars">
                  {INGREDIENTS.map((g, i) => (
                    <div key={g.name}>
                      <span className="lb">{g.name}</span>
                      <span className="pair">
                        <i className="me" style={{ "--w": `${selfIng[i] * 2}%` } as CSSProperties} />
                        <i style={{ "--w": `${ingAvg[i] * 2}%`, background: g.color } as CSSProperties} />
                      </span>
                      <span className="ct">{selfIng[i]} / {ingAvg[i]}</span>
                    </div>
                  ))}
                  <p className="legend"><i className="me" />나 <i style={{ background: "var(--blue-300)" }} />친구들 평균</p>
                </div>
              </section>
            ) : null}
            {self.home != null && homes.length ? (
              <section className="rp-sec glass">
                <div className="rp-head static"><span className="exp">{expLabel(5)}</span><b>집 vs 밖</b></div>
                <div className="rp-line"><i className="me" style={{ left: pct(self.home) }} /><em style={{ left: pct(avg(homes)) }} /></div>
                <div className="rp-ends"><span>이불 밖은 위험해</span><span>일주일 내내 약속</span></div>
                <p className="rp-note">나는 <b>{lean(self.home, QDEFS.home.ends!)}</b>, 친구들은 <b>{lean(avg(homes), QDEFS.home.ends!)}</b>라고 답했습니다.</p>
              </section>
            ) : null}
            <section className="rp-sec glass">
              <div className="rp-head static"><span className="exp">{expLabel(9)}</span><b>친구들은 내 취향을 얼마나 알까요?</b></div>
              <ul className="cmp-taste">
                {TASTE.map((t, i) => {
                  const mine = self.taste[i];
                  if (mine == null) return null;
                  const tried = list.filter((r) => r.taste[i] != null), hit = tried.filter((r) => r.taste[i] === mine).length;
                  return <li key={t.title}><span>{t.title}</span><b>{t.opts[mine]}</b><em className={tried.length && hit === tried.length ? "all" : undefined}>{tried.length ? `${hit}/${tried.length}명 적중` : "아직 답 없음"}</em></li>;
                })}
              </ul>
              {played.length ? (
                <div className="cmp-rank">
                  {played.map((r) => ({ r, s: syncOf(r)! })).sort((a, b) => b.s - a.s).map(({ r, s }, i) => (
                    <div key={r.id}><span className="rk">{i + 1}</span>{who(r)}<b>{s}%</b></div>
                  ))}
                </div>
              ) : <p className="rp-note">친구가 제출 뒤 보너스 라운드에 참여하면 순위가 여기에 쌓입니다.</p>}
            </section>
          </>) : (
            <div className="empty-box glass">
              <b>아직 ‘내가 보는 나’가 없습니다</b>
              <span>6문항에 답해 두면 내 답과 친구들의 답을 나란히 볼 수 있습니다.</span>
              <Button size="md" onClick={() => location.assign("/a?at=s_color")}>지금 답하러 가기</Button>
            </div>
          )}
        </div>
        {tab === "all" && n > 0 ? <div className="scr-bottom"><Button block iconLeft="export" onClick={() => setView("card")} className="sheen">공유 카드 만들기</Button></div> : null}
      </>);
      break;
    }

    case "person": {
      const r = list.find((x) => x.id === person) ?? list[0];
      title = "연구원 상세";
      const s = r ? syncOf(r) : null;
      content = r ? (
        <div className="scr-body rp-body">
          <div className="person-head glass">
            <i style={{ background: dotColor(r) }} />
            <b>{r.name}</b>
            <div className="tags">{[r.rel, r.years, `이해도 ${r.know}/5`, s != null ? `싱크로율 ${s}%` : ""].filter(Boolean).map((t) => <span key={t}>{t}</span>)}</div>
            <span className="ago">{ago(r.at)} 제출</span>
          </div>
          <div className="stack-12 stagger">
            {items.filter((q) => q.key !== "opinion" && q.text(r) != null).map((q) => (
              <button key={q.key} type="button" className="qa glass pressable" onClick={() => openQ(q.key)}>
                <span className="exp">{expLabel(q.exp)}</span>
                <span className="q">{q.title}</span>
                <b>{q.dot?.(r) ? <i style={{ background: q.dot(r)! }} /> : null}{q.text(r)}</b>
              </button>
            ))}
            {r.opinion ? <div className="qa glass"><span className="exp">{expLabel(11)}</span><span className="q">한 줄 소견</span>{quote(r)}</div> : null}
          </div>
        </div>
      ) : null;
      break;
    }

    case "question": {
      const q = items.find((x) => x.key === qkey) ?? items[0];
      const i = items.indexOf(q);
      title = "문항별 보기";
      const rs = q ? list.filter((r) => q.text(r) != null) : [];
      content = q ? (<>
        <div className="scr-body rp-body">
          <div className="q-head"><div className="q-step"><span className="tag">{expLabel(q.exp)}</span><span className="cnt">{i + 1}/{items.length}</span></div><h1 className="q-title">{q.title}</h1></div>
          <div className="stack-12 stagger" key={q.key}>
            {q.key === "opinion" ? rs.map((r) => quote(r)) : rs.map((r) => (
              <button key={r.id} type="button" className="qa glass pressable" onClick={() => openP(r.id)}>
                {who(r)}
                <b>{q.dot?.(r) ? <i style={{ background: q.dot(r)! }} /> : null}{q.text(r)}</b>
              </button>
            ))}
          </div>
          {rs.length < n ? <p className="rp-note center">{n - rs.length}명은 이 문항에 답하지 않았습니다.</p> : null}
        </div>
        <div className="scr-bottom row">
          <Button variant="assistive" disabled={i === 0} onClick={() => setQkey(items[i - 1].key)} iconLeft="arrow-left">이전 문항</Button>
          <Button disabled={i === items.length - 1} onClick={() => setQkey(items[i + 1].key)} iconRight="arrow-right">다음 문항</Button>
        </div>
      </>) : null;
      break;
    }

    case "card": {
      const best = list.find((r) => r.vis === 0 && r.opinion && !hidden.includes(r.id));
      title = "공유 카드 만들기";
      content = (<>
        <div className="scr-body rp-body">
          <div className="share-card" data-tpl={tpl} style={{ "--mix": mixed } as CSSProperties}>
            <span className="brand">KAEHAE</span>
            <AnimatePresence mode="wait">
              <motion.div key={tpl} className="in" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
                {tpl === "color" ? (<>
                  <i className="blob" />
                  <p>친구 {n}명이 본<br /><b>{name}</b>의 색</p>
                  <div className="sw">{colored.map((r) => <i key={r.id} style={{ background: r.color! }} />)}</div>
                </>) : tpl === "ing" ? (<>
                  <p><b>{name}</b> 성분표</p>
                  <ul>{topIng.map((g) => <li key={g.name}><span>{g.name}</span><i><em style={{ width: `${g.v * 2.4}%`, background: g.color }} /></i><b>{g.v}%</b></li>)}</ul>
                </>) : (<>
                  <p className="quote">“{best?.opinion ?? "공개된 소견이 아직 없습니다."}”</p>
                  <span className="by">{best ? `${best.rel} ${best.name}의 소견` : ""}</span>
                  <p><b>{name}</b>에 대한 한 줄</p>
                </>)}
              </motion.div>
            </AnimatePresence>
            <span className="foot">타인의 눈으로 보는 나</span>
          </div>
          <div className="rp-tabs center"><Tabs<typeof tpl> variant="assistive" items={[{ id: "color", label: "대표 컬러" }, { id: "ing", label: "성분표" }, { id: "quote", label: "한 줄 소견" }]} value={tpl} onChange={(t) => { buzz(6); setTpl(t); }} /></div>
          <p className="rp-note center">‘나만 보기’와 숨긴 답변은 카드에 들어가지 않습니다.</p>
          <div style={{ display: "grid", placeItems: "center" }}><TextButton size="sm" onClick={() => exportCard("story")}>스토리 비율(9:16)로 저장</TextButton></div>
        </div>
        <div className="scr-bottom row">
          <Button variant="assistive" onClick={() => exportCard("save")}>이미지 저장</Button>
          <Button iconLeft="export" onClick={() => exportCard("share")}>공유하기</Button>
        </div>
      </>);
      break;
    }

    case "settings":
      title = "설정";
      content = (
        <div className="scr-body rp-body">
          <section className="set-sec glass">
            <div className="set-row"><div><b>응답 받기</b><span>{open ? "친구들이 링크로 참여할 수 있습니다" : "마감되었습니다. 링크를 열면 마감 안내가 보입니다"}</span></div><Switch on={open} onChange={async (v) => {
              setOpen(v);
              if (live && isFail(await updateLab(live.lab, live.key, { open: v }))) { setOpen(!v); return toast.show("바꾸지 못했습니다. 잠시 뒤 다시 시도해 주세요"); }
              toast.show(v ? "다시 응답을 받습니다" : "응답을 마감했습니다");
            }} label="응답 받기" /></div>
          </section>
          <section className="set-sec glass">
            <button type="button" className="set-row pressable" onClick={async () => {
              if (!kakao) return setSheet("kakao");
              if (!live) return;
              if (isFail(await updateLab(live.lab, live.key, { kakao: false }))) return toast.show("바꾸지 못했습니다. 잠시 뒤 다시 시도해 주세요");
              setKakao(false); toast.show("카카오 연결을 끊었습니다");
            }}><div><b>카카오 연결</b><span>{kakao ? "열쇠가 카카오 계정에 보관되어 있습니다. 누르면 연결을 끊습니다" : "연결하면 열쇠 링크 없이도 들어올 수 있습니다"}</span></div><em className={kakao ? "on" : undefined}>{kakao ? "연결됨" : "연결하기"}</em></button>
            <button type="button" className="set-row pressable" onClick={() => copy(live ? `${origin}/b?lab=${live.lab}&key=${live.key}` : `${origin}/b`, "열쇠 링크를 복사했습니다")}><div><b>연구소 열쇠 복사</b><span>나만 보는 비밀 링크입니다</span></div><Icon name="copy" size={20} /></button>
            <button type="button" className="set-row pressable" onClick={() => setSheet("invite")}><div><b>초대 링크 보내기</b><span>친구에게 보내는 링크입니다</span></div><Icon name="export" size={20} /></button>
          </section>
          <section className="set-sec glass">
            <button type="button" className="set-row pressable" onClick={() => location.assign("/a?at=pick")}><div><b>실험 구성 바꾸기</b><span>이미 받은 답은 그대로 남습니다</span></div><Icon name="next" size={20} /></button>
            <button type="button" className="set-row pressable" onClick={() => location.assign("/a?at=s_color")}><div><b>셀프 캐해 {hasSelf ? "다시 하기" : "하러 가기"}</b><span>내가 보는 나를 남깁니다</span></div><Icon name="next" size={20} /></button>
            {hidden.length ? <button type="button" className="set-row pressable" onClick={() => { setHidden([]); toast.show("숨긴 답변을 모두 되돌렸습니다"); }}><div><b>숨긴 답변 {hidden.length}개 되돌리기</b><span>리포트에 다시 보입니다</span></div><Icon name="next" size={20} /></button> : null}
          </section>
          <section className="set-sec glass">
            <button type="button" className="set-row pressable danger" onClick={() => setConfirmDel(true)}><div><b>연구소 삭제</b><span>모든 표본과 리포트가 사라집니다</span></div></button>
          </section>
          {live && expiresAt ? <p className="rp-note center">마지막 표본이 들어온 뒤 {RETENTION_DAYS}일이 지나면 연구소가 자동으로 지워집니다.<br /><b>{new Date(expiresAt).toLocaleDateString("ko-KR", { month: "long", day: "numeric" })}</b>까지 보관 · {Math.max(0, Math.ceil((expiresAt - Date.now()) / 86_400_000))}일 남음</p> : null}
          {!live ? <p className="rp-note center">지금은 예시 데이터로 보는 중입니다.</p> : null}
        </div>
      );
      break;
  }

  const target = menu ? list.find((r) => r.id === menu.id) : null;
  return (
    <Device>
      <div className="scr">
        {view !== "arrive" ? (
          <div className="scr-top">
            {view === "home" ? <Navigation right="settings" rightLabel="설정" onRight={() => setView("settings")} /> : <Navigation variant="sub" title={title} onBack={back} />}
          </div>
        ) : null}
        {instant ? (
          <div key={view} className="scr-inner">{content}</div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={view + (view === "person" ? person : "")} className="scr-inner" initial={{ opacity: 0, y: 14, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -10, filter: "blur(6px)" }} transition={{ duration: 0.26, ease: [0.2, 0.8, 0.2, 1] }}>
              {content}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      {/* B-09 숨기기 · 신고 */}
      <BottomSheet open={!!menu} onClose={() => setMenu(null)} title={menu?.step === "report" ? "신고 사유를 골라 주세요" : "이 답변을"} desc={menu?.step === "report" ? "신고한 답변은 바로 숨겨지고, 운영팀이 확인합니다." : target ? `${target.name}님의 한 줄 소견` : undefined}
        actions={menu?.step === "report"
          ? <Button block disabled={menu.reason == null} onClick={() => { setHidden([...new Set([...hidden, menu.id])]); setMenu(null); toast.show("신고가 접수되었습니다"); }}>신고하기</Button>
          : <Button block variant="assistive" onClick={() => setMenu(null)}>닫기</Button>}>
        {menu?.step === "report"
          ? REPORT_REASONS.map((l, i) => <Selection key={l} variant="list" label={l} active={menu.reason === i} onClick={() => setMenu({ ...menu, reason: i })} />)
          : menu ? (<>
            <Selection variant="list" label="리포트에서 숨기기" onClick={() => { setHidden([...new Set([...hidden, menu.id])]); setMenu(null); toast.show("답변을 숨겼습니다. 설정에서 되돌릴 수 있어요"); }} />
            <Selection variant="list" label="신고하기" onClick={() => setMenu({ ...menu, step: "report" })} />
          </>) : null}
      </BottomSheet>
      {/* B-10 카카오 연결 권유 */}
      <BottomSheet open={sheet === "kakao"} onClose={() => setSheet(null)} title="열쇠를 카카오에 보관할까요?" desc="로그인이 없어서 열쇠 링크를 잃어버리면 연구소에 다시 들어올 수 없습니다. 카카오에 연결해 두면 언제든 다시 열 수 있어요."
        actions={<>
          <button type="button" className="kakao-btn pressable" onClick={() => {
            if (!live) { setSheet(null); return toast.show("예시 화면에서는 연결할 수 없습니다"); }
            location.assign(`/api/kakao/login?lab=${live.lab}&key=${live.key}`);
          }}>카카오로 연결하기</button>
          <TextButton size="sm" onClick={() => setSheet(null)}>나중에 할게요</TextButton>
        </>}>
        <ul className="sheet-list"><li>카카오에서는 회원번호만 받습니다. 이름·프로필·친구 목록은 받지 않습니다</li><li>카카오 계정으로 어느 기기에서든 연구소를 다시 열 수 있습니다</li><li>연결은 설정에서 언제든 끊을 수 있습니다</li></ul>
      </BottomSheet>
      {/* 초대 링크 */}
      <BottomSheet open={sheet === "invite"} onClose={() => setSheet(null)} title="친구 초대하기" desc={open ? "링크를 받은 친구는 로그인 없이 바로 참여할 수 있습니다." : "지금은 응답을 마감한 상태입니다. 설정에서 다시 열 수 있어요."}
        actions={<Button block variant="assistive" onClick={() => setSheet(null)}>닫기</Button>}>
        <div className="link-box glass"><div className="lb-row"><code>{inviteUrl.replace(/^https?:\/\//, "")}</code><button type="button" className="pressable" aria-label="초대 링크 복사" onClick={() => copy(inviteUrl, "초대 링크를 복사했습니다")}><Icon name="copy" size={20} /></button></div></div>
        {kakaoShareReady() ? <button type="button" className="kakao-btn pressable" onClick={async () => { if (!(await shareInviteToKakao(name, inviteUrl))) toast.show("카카오톡을 열지 못했습니다"); }}>카카오톡으로 보내기</button> : null}
      </BottomSheet>
      <Modal open={confirmDel} onClose={() => setConfirmDel(false)} title="연구소를 삭제할까요?" desc={`표본 ${n}개와 리포트가 모두 사라지고 되돌릴 수 없습니다.`}
        actions={<>
          <Button block variant="assistive" onClick={() => setConfirmDel(false)}>취소</Button>
          <Button block onClick={async () => {
            setConfirmDel(false);
            if (!live) return toast.show("예시 화면이라 실제로 삭제되지는 않습니다");
            if (isFail(await deleteLab(live.lab, live.key))) return toast.show("삭제하지 못했습니다. 잠시 뒤 다시 시도해 주세요");
            if (myLab()?.lab === live.lab) setMyLab(null);
            location.replace("/a");
          }}>삭제하기</Button>
        </>} />
      <Toast message={toast.message} />
    </Device>
  );
}

function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" role="switch" aria-checked={on} aria-label={label} className={cx("k-switch", on && "on")} onClick={() => { buzz(8); onChange(!on); }}><i /></button>;
}
