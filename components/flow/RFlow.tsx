"use client";

/* R 플로우: 연구원(친구)이 초대 링크로 들어와 응답하고 플라스크에 붓기까지.
   피그마 design 페이지의 R-01 · R-02 · R-03 · R-08 · R-09 시안을 따르고,
   시안에 없는 문항·화면(R-06 · R-07 · R-10 · R-11 · R-12)은 같은 컴포넌트로 파생해 그린다.
   주소 옵션: ?a=01|03|04|07 (로테이션 A) · ?b=06|08 (로테이션 B) · ?at=단계 (바로 가기) · ?instant=1 (전환 없이) */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  AiOrb, Bar, BarEnds, Beaker, BottomSheet, Button, Guide, IdCard, IngredientOption, Logo, Modal, Navigation, ProgressBar,
  RangeSticks, ResearchIntro, ResearchOpinion, ScaleTubes, Selection, TextButton, TextField, Toast, buzz, copyText, cx, useToast,
} from "@/components/ui";
import { ColorPicker, LoaderArt, Particles, preloadMotion, useFlaskSrc, useHeroFit } from "./widgets";
import { Device } from "./Device";
import { GenericQ } from "./GenericQ";
import { Done, Sync } from "./Ending";
import { BONUS, INTRO_GUIDE, QDEFS, ROT_A, ROT_B, dropColor, isValid } from "./questions";
import { hexToRgb, hslToHex, hsvToHex, mix, nameOf, rgbToHsl, type HSV } from "@/lib/color";
import { expById, pad2 } from "@/lib/experiments";
import { renderCard, shareCanvas } from "@/lib/shareImage";
import { getLab, isFail, myLab, submitSample, submitTaste } from "@/lib/api";
import { setTrackCtx, track } from "@/lib/track";
import { BAD_MSG, isBad } from "@/lib/moderation";
import { PrivacyLine, PrivacySheet } from "./Privacy";

/* 연구 대상(링크 주인)의 이름. 초대 링크(?lab=)로 들어오면 서버에서 받은 이름으로 바뀐다.
   화면은 이름을 받은 뒤에만 그리므로(ready), 아래 문구 함수들은 항상 받은 이름으로 만들어진다. */
let SUBJECT = "지원";
const SAVE_KEY = "kaehae-r-v1";

type StepId = string;
const NO_NAV: StepId[] = ["landing", "greet", "loading", "pour", "done", "sync"];
/* 2(고정) → 로테이션 A → 5(고정) → 로테이션 B → 10(선택) → 11(고정) → 붓기 → 제출 완료 → 9(보너스) → 싱크로율 */
const buildOrder = (a: string, b: string, rel = true, bonus: string[] = BONUS): StepId[] => [
  "landing", "greet", "name", "rel", "years", "know", "loading", "idcard",
  "intro2", "color", "sat", "tone",
  `intro${+a}`, ...ROT_A[a],
  "intro5", "ingredient", "home", "tension",
  `intro${+b}`, ...ROT_B[b],
  ...(rel ? ["intro10", "word", "secret"] : []),
  "intro11", "opinion", "charm", "vis",
  "pour", "done", ...(bonus.length ? ["intro9", ...bonus, "sync"] : []),
];
const sub = (t: string) => t.replaceAll("{S}", SUBJECT);

const RELS = ["가족", "친구", "회사·알바", "동아리·모임", "온라인 친구", "연인", "기타"];
const YEARS = ["1개월 미만", "3개월", "6개월", "1년", "2년", "3년", "4년", "5년", "7년", "9년", "10년 이상"];
const SEASONS = [
  { id: "spring", label: "봄", g: "linear-gradient(118deg, var(--pink-200), var(--yellow-50))", c: "#F1CCE8" },
  { id: "summer", label: "여름", g: "linear-gradient(118deg, var(--blue-200), var(--teal-50))", c: "#C3DBFF" },
  { id: "autumn", label: "가을", g: "linear-gradient(118deg, var(--red-300), var(--yellow-50))", c: "#FFA7A4" },
  { id: "winter", label: "겨울", g: "linear-gradient(118deg, var(--violet-200), #fff)", c: "#D8D3FF" },
];
const TEXTURES: [string, string, string][] = [["velvet", "벨벳", "#C9BDB6"], ["glass", "유리", "#C3DBFF"], ["cotton", "솜", "#F5F5F5"], ["knit", "니트", "#CFC3B0"], ["leather", "가죽", "#B5673C"], ["jelly", "젤리", "#FF5A6E"], ["powder", "가루", "#D77BD0"], ["honey", "꿀", "#FF9A1F"], ["water", "물", "#7CAAF3"]];
const INGREDIENTS = [
  { name: "다정", color: "#E5AFD8" }, { name: "엉뚱", color: "#ECE09C" }, { name: "열정", color: "#FF7A7A" },
  { name: "여유", color: "#9ACCC2" }, { name: "예민", color: "#C1B8FE" }, { name: "웃김", color: "#9EC4FF" },
];
const ZOMBIE = ["리더", "행동 대장", "분위기 메이커", "첫 희생자", "엔딩까지 살아남는 마이웨이 생존자"];
const ZOMBIE_C = ["#7CAAF3", "#FF7A7A", "#ECE09C", "#B0B8C1", "#9ACCC2"];
const visOpts = () => ["공개해도 괜찮아요", `${SUBJECT}님만 볼 수 있게 해주세요`, "익명으로 남길게요"];
const greets = () => ["안녕하세요.", "캐해 연구소에 오신 것을\n환영합니다.", `이곳에서는\n‘타인이 보는 나’를 주제로\n\n{b}${SUBJECT}{/b}님을 위한 다양한\n문답이 준비되어 있습니다.`];
const qTitle = (): Record<StepId, string> => ({
  color: `${SUBJECT}님을 색으로 추출한다면 어떤 색일 것 같나요?`, sat: `${SUBJECT}님의 채도는 몇 퍼센트쯤일까요?`,
  season: `${SUBJECT}님과 가장 닮은 계절은 언제인가요?`, texture: `${SUBJECT}님을 촉각으로 표현한다면 어떤 질감일까요?`,
  ingredient: `${SUBJECT}님의 성분표를 만들어 주세요.`, zombie: `좀비가 창궐한 세상에 떨어졌습니다. 이때 ${SUBJECT}님은 어떤 역할일 것 같나요?`,
  opinion: `${SUBJECT}님께 남길 한 줄 소견을 적어 주세요.`, vis: "이 기록의 공개 범위를 지정해 주세요.",
});
const EXP_OF: Record<StepId, number> = { color: 2, sat: 2, season: 3, texture: 3, ingredient: 5, zombie: 8, opinion: 11, vis: 11 };
/** 문항이면 소속 실험과 제목을 돌려준다 */
const metaOf = (s: StepId): { exp: number; title: string } | null =>
  EXP_OF[s] ? { exp: EXP_OF[s], title: qTitle()[s] } : QDEFS[s] ? { exp: QDEFS[s].exp, title: sub(QDEFS[s].title) } : null;

type Ans = { nick: string; rel: string | null; years: number | null; know: number | null; color: HSV | null; sat: number | null; season: string | null; texture: string | null; ing: number[]; zombie: number | null; opinion: string; vis: number | null };
const EMPTY: Ans = { nick: "", rel: null, years: null, know: null, color: null, sat: 0.5, season: null, texture: null, ing: [0, 0, 0, 0, 0, 0], zombie: null, opinion: "", vis: null };
type Cfg = { a: string; b: string; rel: boolean; bonus: string[] };
type Saved = { step: StepId; a: Ans; g: Record<string, unknown>; deferred: StepId[]; answered: StepId[]; cfg: Cfg };

const rich = (s: string) => s.split(/(\{b\}.*?\{\/b\})/g).map((p, i) => (p.startsWith("{b}") ? <b key={i}>{p.slice(3, -4)}</b> : p));

export function RFlow() {
  const [step, setStep] = useState<StepId>("landing");
  const [cfg, setCfg] = useState<Cfg>({ a: "03", b: "08", rel: true, bonus: BONUS });
  const [ready, setReady] = useState(false); // 연구소 정보를 받은 뒤에 그린다
  const [labId, setLabId] = useState<string | null>(null); // 없으면 예시 모드
  const [ownerUrl, setOwnerUrl] = useState<string | null>(null); // 이 기기에서 만든 연구소의 초대 링크를 주인이 연 경우
  const [sample, setSample] = useState<{ id: string; count: number } | null>(null); // 제출한 표본
  const saveKey = useRef(SAVE_KEY);
  const [a, setA] = useState<Ans>(EMPTY);
  const [g, setG] = useState<Record<string, unknown>>({}); // 공용 문항의 답
  const [deferred, setDeferred] = useState<StepId[]>([]);
  const [answered, setAnswered] = useState<StepId[]>([]);
  const [returnTo, setReturnTo] = useState<StepId | null>(null);
  const [rack, setRack] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [ask, setAsk] = useState(false); // 보관한 문항이 남은 채 끝에 닿았을 때 묻는 창
  const [saved, setSaved] = useState<Saved | null>(null); // R-07 이어하기
  const [reveal, setReveal] = useState(false); // 보너스: 정답 공개 중
  const deferredRef = useRef<StepId[]>([]);
  deferredRef.current = deferred;
  const [flash, setFlash] = useState(0);
  const [drops, setDrops] = useState<{ id: number; c: string; x0: number; y0: number; x1: number; y1: number }[]>([]);
  const [navBump, setNavBump] = useState(0);
  const toast = useToast();
  const set = useCallback(<K extends keyof Ans>(k: K, v: Ans[K]) => setA((p) => ({ ...p, [k]: v })), []);
  const deviceRef = useRef<HTMLDivElement>(null);
  const [instant, setInstant] = useState(false);
  const ORDER = useMemo(() => buildOrder(cfg.a, cfg.b, cfg.rel, cfg.bonus), [cfg]);
  const noSave = useRef(false); // 바로 가기(?at) · 검사(?instant)로 들어오면 진행 상황을 저장하지 않는다

  /* 주소 옵션 · 연구소 정보 · 저장된 진행 상황 읽기 */
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setInstant(q.has("instant"));
    preloadMotion();
    noSave.current = q.has("at") || q.has("instant");
    const at = q.get("at");
    const start = (c: Cfg, key: string) => {
      setCfg(c);
      saveKey.current = key;
      if (at && buildOrder(c.a, c.b, c.rel, c.bonus).includes(at)) { setA((p) => ({ ...p, nick: "수진", rel: "친구", years: 5, know: 4 })); setStep(at); }
      else {
        try {
          const raw = localStorage.getItem(key);
          if (raw && !q.has("a") && !q.has("b") && !q.has("instant")) { const sv = JSON.parse(raw) as Saved; setSaved({ ...sv, cfg: { ...c, ...sv.cfg, rel: sv.cfg.rel ?? c.rel, bonus: sv.cfg.bonus ?? c.bonus } }); }
        } catch {}
      }
      setReady(true);
    };
    const lab = q.get("lab");
    const mine = myLab();
    if (lab && mine?.lab === lab) setOwnerUrl(`/b?lab=${mine.lab}&key=${mine.key}`);
    if (!lab) {
      /* 예시 모드: 주소 옵션으로 실험 조합만 바꾼다 */
      return start({ a: ROT_A[q.get("a") ?? ""] ? q.get("a")! : "03", b: ROT_B[q.get("b") ?? ""] ? q.get("b")! : "08", rel: true, bonus: BONUS }, SAVE_KEY);
    }
    let alive = true;
    getLab(lab).then((l) => {
      if (!alive) return;
      if (isFail(l)) return location.replace(l.error === "network" ? "/e?k=offline" : "/e?k=notfound");
      const nm = encodeURIComponent(l.name);
      /* 이미 제출한 기기: 보너스 라운드(?at=)로 다시 들어온 경우만 통과 */
      let done: string | null = null;
      try { done = localStorage.getItem(`kaehae-done-${lab}`); } catch {}
      if (done && !at) return location.replace(`/e?k=submitted&name=${nm}&lab=${lab}`);
      if (!l.open && !done) return location.replace(`/e?k=closed&name=${nm}`);
      SUBJECT = l.name;
      /* 보너스 라운드는 주인이 미리 답한 문항만 연다 */
      const bonus = BONUS.filter((id, i) => { const v = l.self?.taste?.[i]; if (typeof v === "number") { QDEFS[id].self = v; return true; } return false; });
      setLabId(lab);
      if (done) setSample({ id: done, count: l.count });
      start({ a: ROT_A[l.rotA] ? l.rotA : "03", b: ROT_B[l.rotB] ? l.rotB : "08", rel: l.rel, bonus }, `${SAVE_KEY}:${lab}`);
    });
    return () => { alive = false; };
  }, []);
  /* 등록을 마친 뒤부터 붓기 전까지 자동 저장 */
  useEffect(() => {
    const i = ORDER.indexOf(step);
    if (noSave.current) return;
    try {
      if (i >= ORDER.indexOf("done")) localStorage.removeItem(saveKey.current);
      else if (i > ORDER.indexOf("name")) localStorage.setItem(saveKey.current, JSON.stringify({ step, a, g, deferred, answered, cfg } satisfies Saved));
    } catch {}
  }, [step, a, g, deferred, answered, cfg, ORDER]);
  const resume = () => {
    if (!saved) return;
    setCfg(saved.cfg); setA(saved.a); setG(saved.g); setDeferred(saved.deferred); setAnswered(saved.answered ?? []);
    setStep(saved.step === "loading" ? "idcard" : saved.step);
    setSaved(null);
  };

  /* ---- 답에서 나온 색 ---- */
  const picked = a.color ? hsvToHex(a.color) : null;
  const satColor = useMemo(() => {
    if (!picked) return "#BDBDBD";
    const [h, , l] = rgbToHsl(...hexToRgb(picked));
    const s = a.sat ?? 0.5;
    return hslToHex(h, s, Math.min(0.78, Math.max(0.42, l)) - s * 0.08 + 0.08);
  }, [picked, a.sat]);
  const total = a.ing.reduce((x, y) => x + y, 0);
  const sampleColors = useMemo(() => {
    const out: string[] = [];
    if (picked) out.push(satColor);
    const se = SEASONS.find((s) => s.id === a.season); if (se) out.push(se.c);
    const tx = TEXTURES.find((t) => t[0] === a.texture); if (tx) out.push(tx[2]);
    if (total > 0) out.push(INGREDIENTS[a.ing.indexOf(Math.max(...a.ing))].color);
    if (a.zombie != null) out.push(ZOMBIE_C[a.zombie]);
    for (const id of answered) if (out.length < 6 && QDEFS[id] && QDEFS[id].exp !== 9) { const c = dropColor(QDEFS[id], g[id]); if (!out.includes(c)) out.push(c); }
    return out;
  }, [picked, satColor, a.season, a.texture, a.ing, a.zombie, total, answered, g]);
  const mixed = useMemo(() => mix(sampleColors.length ? sampleColors : ["#C3DBFF", "#D8D3FF"]), [sampleColors]);

  /* ---- 이동 ---- */
  const idx = ORDER.indexOf(step);
  const go = useCallback((s: StepId) => { setStep(s); }, []);
  const next = useCallback(() => {
    const target = returnTo ?? ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(step) + 1)];
    if (returnTo) setReturnTo(null);
    /* 붓기 직전: 보관해 둔 문항이 남아 있으면 그대로 낼지 먼저 묻는다 */
    if (target === "pour" && deferredRef.current.length) return setAsk(true);
    go(target);
  }, [go, returnTo, step, ORDER]);
  const canBack = step !== "name" && step !== "intro9";
  const back = () => {
    let i = idx - 1;
    while (i > 0 && (ORDER[i] === "loading" || ORDER[i] === "greet")) i--;
    setReturnTo(null);
    go(ORDER[Math.max(0, i)]);
  };

  /* 답을 내면 방울이 오른쪽 위 플라스크로 날아간다 */
  const flyDrop = (color: string) => {
    const dev = deviceRef.current?.closest("[data-device]") as HTMLElement | null;
    const from = dev?.querySelector(".scr-bottom .k-btn"); const to = dev?.querySelector("[data-nav-right]");
    if (!dev || !from || !to) return;
    const d = dev.getBoundingClientRect(), f = from.getBoundingClientRect(), t = to.getBoundingClientRect();
    const id = Date.now();
    setDrops((s) => [...s, { id, c: color, x0: f.left - d.left + f.width / 2, y0: f.top - d.top + 8, x1: t.left - d.left + t.width / 2, y1: t.top - d.top + t.height / 2 }]);
    setTimeout(() => { setDrops((s) => s.filter((x) => x.id !== id)); setNavBump((n) => n + 1); buzz(6); }, 620);
  };
  const answer = (color: string) => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    setFlash((f) => f + 1);
    deferredRef.current = deferredRef.current.filter((x) => x !== step);
    setDeferred(deferredRef.current);
    setAnswered((s) => (s.includes(step) ? s : [...s, step]));
    flyDrop(color);
    setTimeout(next, 260);
  };
  const defer = () => {
    if (!deferred.includes(step)) { deferredRef.current = [...deferred, step]; setDeferred(deferredRef.current); }
    setAnswered((s) => s.filter((x) => x !== step));
    toast.show("시험관 랙에 보관해 두었습니다");
    buzz(8);
    setTimeout(next, 420);
  };
  /* 이용 통계: 단계마다 한 번 (예시 화면은 보내지 않는다) */
  useEffect(() => { if (!ready) return; setTrackCtx({ role: "r", lab: labId }); track("step", { s: step }); }, [step, ready, labId]);
  const soon = () => { track("make_click", { at: step }); try { if (labId) sessionStorage.setItem("kaehae-from", labId); } catch {} location.assign("/a"); };
  /* 붓는 순간 서버에 표본을 낸다. 답한 문항만 보낸다(보관해 둔 문항은 빈 값). */
  const submit = async (): Promise<boolean> => {
    if (!labId || sample) return true;
    const has = (k: StepId) => answered.includes(k);
    const gg: Record<string, unknown> = {};
    for (const k of answered) if (QDEFS[k] && QDEFS[k].exp !== 9 && g[k] != null) gg[k] = g[k];
    const r = await submitSample(labId, {
      name: a.nick.trim() || "연구원", rel: a.rel ?? "", years: YEARS[a.years ?? 3], know: a.know ?? 3,
      color: has("color") ? picked : null, colorName: has("color") && picked ? nameOf(picked) : null, sat: has("sat") ? a.sat : null,
      season: has("season") ? SEASONS.findIndex((x) => x.id === a.season) : null, texture: has("texture") ? TEXTURES.findIndex((x) => x[0] === a.texture) : null,
      ing: has("ingredient") ? a.ing : null, zombie: has("zombie") ? a.zombie : null, opinion: has("opinion") ? a.opinion : null, vis: a.vis ?? 0, g: gg,
    });
    if (isFail(r)) {
      if (r.error === "closed") { location.replace(`/e?k=closed&name=${encodeURIComponent(SUBJECT)}`); return false; }
      toast.show(r.error === "network" ? "연결이 불안정합니다. 다시 눌러 주세요" : r.error === "busy" ? "요청이 너무 많습니다. 잠시 뒤 다시 눌러 주세요" : r.error === "profanity" ? "답변에 제출할 수 없는 표현이 있습니다. 고친 뒤 다시 시도해 주세요" : "제출하지 못했습니다. 다시 눌러 주세요");
      return false;
    }
    setSample(r);
    track("submit", { sid: r.id });
    try { localStorage.setItem(`kaehae-done-${labId}`, r.id); } catch {}
    return true;
  };
  /* 보너스 라운드가 끝나면 맞힌 답을 표본에 덧붙인다 */
  useEffect(() => {
    if (step !== "sync" || !labId || !sample) return;
    submitTaste(labId, sample.id, BONUS.map((id) => (typeof g[id] === "number" ? (g[id] as number) : null)));
  }, [step, labId, sample, g]);
  const share = async () => {
    track("share", { ch: "copy" });
    toast.show((await copyText(labId ? `${location.origin}/r?lab=${labId}` : `${location.origin}/r`)) ? "초대 링크를 복사했습니다" : "링크를 복사하지 못했습니다");
  };

  /* ---- 화면별 내용 ---- */
  const hasNav = !NO_NAV.includes(step);
  const meta = metaOf(step);
  const head = (title: ReactNode, subText?: string, reg?: string) => {
    const sibs = meta ? ORDER.filter((s) => metaOf(s)?.exp === meta.exp) : [];
    return (
      <div className="q-head">
        <div className="q-step">
          {reg ? <><span className="tag reg">연구원 등록</span><span className="nm">{reg}</span></> : meta ? <><span className="tag">EXP. {pad2(meta.exp)}</span><span className="nm">{expById(meta.exp).title}</span><span className="cnt">{sibs.indexOf(step) + 1}/{sibs.length}</span></> : null}
        </div>
        <h1 className="q-title">{title}</h1>
        {subText ? <p className="q-sub">{subText}</p> : null}
      </div>
    );
  };
  const bottom = (label: string, can: boolean, onNext: () => void, later = true) => (
    <div className="scr-bottom">
      <Button block disabled={!can} onClick={onNext} className="sheen">{label}</Button>
      {later ? <div className="later"><TextButton size="sm" onClick={defer}>조금 더 생각해볼게요</TextButton></div> : null}
    </div>
  );

  let content: ReactNode = null;
  switch (step) {
    case "landing":
      content = <Hero mode="landing" onEnter={() => go("greet")} onPrivacy={() => setPrivacy(true)} ownerUrl={ownerUrl} />;
      break;
    case "greet":
      content = <Greeting onDone={() => go("name")} />;
      break;
    case "name":
      content = (<>
        <div className="scr-body">
          <Guide text="시작에 앞서 몇 가지만 여쭙겠습니다." />
          <div className="q-block">
            {head(<><span>성함</span><span className="light">이 어떻게 되시나요?</span></>, `${SUBJECT}님이 알아볼 수 있는 이름이면 충분합니다.`, "1/4")}
            <form onSubmit={(e) => { e.preventDefault(); if (a.nick.trim() && a.nick.length <= 12 && !isBad(a.nick)) { (document.activeElement as HTMLElement)?.blur(); next(); } }}>
              <TextField value={a.nick} onChange={(v) => set("nick", v)} placeholder="닉네임 또는 이름" label="이름" />
            </form>
            {isBad(a.nick) ? <p className="field-warn" role="alert" style={{ marginTop: -8 }}>{BAD_MSG}</p> : null}
          </div>
        </div>
        {bottom("다음", a.nick.trim().length > 0 && a.nick.length <= 12 && !isBad(a.nick), next, false)}
      </>);
      break;
    case "rel":
      content = (<>
        <div className="scr-body">
          <Guide text={`${a.nick || "연구원"}님, 반갑습니다. 사원증을 준비하겠습니다.`} />
          <div className="q-block">
            {head(`${SUBJECT}님과는 어떤 사이인가요?`, undefined, "2/4")}
            <div className="chips-wrap stagger">{RELS.map((r) => <Selection key={r} variant="multi" label={r} active={a.rel === r} onClick={() => set("rel", r)} />)}</div>
          </div>
        </div>
        {bottom("다음", !!a.rel, next, false)}
      </>);
      break;
    case "years":
      content = (<>
        <div className="scr-body">
          <Guide text={"함께한 시간만큼 결정이 자라납니다."} />
          <div className="q-block">
            {head(`${SUBJECT}님을 알고 지낸지 얼마나 되셨나요?`, undefined, "3/4")}
            <div>
              <p className="range-val">{YEARS[a.years ?? 3]}</p>
              <RangeSticks active={a.years ?? 3} idle={a.years == null} />
              <div style={{ height: 24 }} />
              <Bar value={(a.years ?? 3) / 10} onChange={(v) => set("years", Math.round(v * 10))} steps={10} label="알고 지낸 기간" />
              <BarEnds left="1개월 미만" right="10년 이상" />
            </div>
          </div>
        </div>
        {bottom("다음", a.years != null, next, false)}
      </>);
      break;
    case "know":
      content = (<>
        <div className="scr-body">
          <Guide text="정답은 없으니 느끼시는 만큼 채워주세요." />
          <div className="q-block">
            {head(`${SUBJECT}님을 얼마나 잘 알고 계신다고 생각하시나요?`, undefined, "4/4")}
            <div style={{ paddingTop: 16 }}>
              <ScaleTubes value={a.know} onChange={(v) => set("know", v)} idle={a.know == null} />
              <div className="k-bar-ends" style={{ marginTop: 28 }}><span>이름만 아는 사이</span><span>너보다 내가 더 잘 앎</span></div>
            </div>
          </div>
        </div>
        {bottom("다음", a.know != null, next, false)}
      </>);
      break;
    case "loading":
      content = <Loading onDone={() => go("idcard")} />;
      break;
    case "idcard":
      content = (<>
        <div className="scr-body">
          <Guide text={`${a.nick || "연구원"}님, 등록을 마쳤습니다. 이제 실험을 시작하겠습니다.`} />
          <div className="idcard-wrap">
            <motion.div initial={{ y: -260, rotate: -8, opacity: 0 }} animate={{ y: 0, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 120, damping: 11, delay: 0.15 }}>
              <div className="idcard-swing"><IdCard name={a.nick || "이름"} tags={[a.rel ?? "", YEARS[a.years ?? 3], a.know ? `이해도 ${a.know}/5` : ""].filter(Boolean)} /></div>
            </motion.div>
          </div>
        </div>
        <div className="scr-bottom"><Button block onClick={next} className="sheen">첫 실험으로</Button></div>
      </>);
      break;
    case "color":
      content = (<>
        <div className="scr-body">
          <Guide text="색 위를 문질러 보세요. 닿는 색이 표본이 됩니다." flash={flash} />
          <div className="q-block">
            {head(qTitle().color)}
            <ColorPicker value={a.color} onChange={(c) => set("color", c)} />
          </div>
        </div>
        {bottom("다음", !!a.color, () => answer(picked!))}
      </>);
      break;
    case "sat":
      content = (<>
        <div className="scr-body">
          <Guide text="방금 추출한 색에 농도를 더해보겠습니다." />
          <div className="q-block">
            {head(qTitle().sat)}
            <div>
              <div className="sat-orb" style={{ "--c": satColor } as CSSProperties} />
              <p className="sat-val">{Math.round((a.sat ?? 0.5) * 100)}<small>%</small></p>
            </div>
            <div>
              <Bar value={a.sat ?? 0.5} onChange={(v) => set("sat", v)} label="채도" nofill knob={satColor} track={`linear-gradient(90deg, ${picked ?? "#A99CF0"}00, ${picked ?? "#A99CF0"})`} />
              <BarEnds left="무채색" right="선명함" />
            </div>
          </div>
        </div>
        {bottom("다음", a.sat != null, () => answer(satColor))}
      </>);
      break;
    case "season":
      content = (<>
        <div className="scr-body">
          <Guide text={`${SUBJECT}님과 가장 닮은 듯한 계절을 골라주세요.`} />
          <div className="q-block">
            {head(qTitle().season)}
            <div className="grid-2 stagger">{SEASONS.map((s) => <Selection key={s.id} variant="image" label={s.label} imageStyle={{ background: s.g }} active={a.season === s.id} onClick={() => { set("season", s.id); setFlash((f) => f + 1); }} />)}</div>
          </div>
        </div>
        {bottom("다음", !!a.season, () => answer(SEASONS.find((s) => s.id === a.season)!.c))}
      </>);
      break;
    case "texture":
      content = (<>
        <div className="scr-body">
          <Guide text={`사람마다 질감이 있습니다. ${SUBJECT}님의 질감을 알아봅니다.`} />
          <div className="q-block">
            {head(qTitle().texture)}
            <div className="grid-3 stagger">{TEXTURES.map(([id, l]) => <Selection key={id} variant="image" label={l} image={`/img/texture/${id}.jpg`} active={a.texture === id} onClick={() => set("texture", id)} />)}</div>
          </div>
        </div>
        {bottom("다음", !!a.texture, () => answer(TEXTURES.find((t) => t[0] === a.texture)![2]))}
      </>);
      break;
    case "ingredient":
      content = (<>
        <div className="scr-body">
          <Guide text="비커를 100%까지 채워 주세요. 정답은 없습니다." />
          <div className="q-block">
            {head(qTitle().ingredient, "시약병을 꾹 누르면 비커가 차오릅니다.")}
            <Ingredient values={a.ing} onChange={(v) => set("ing", v)} onFull={() => toast.show("비커가 가득 찼습니다")} />
          </div>
        </div>
        {bottom("다음", total === 100, () => answer(INGREDIENTS[a.ing.indexOf(Math.max(...a.ing))].color))}
      </>);
      break;
    case "zombie":
      content = (<>
        <div className="scr-body">
          <Guide text="상황이 재생되고 있습니다. 직감으로 골라주세요." />
          <div className="q-block">
            {head(qTitle().zombie)}
            <div className="stack-16 stagger">{ZOMBIE.map((l, i) => <Selection key={l} variant="list" no={pad2(i + 1)} label={l} active={a.zombie === i} onClick={() => set("zombie", i)} />)}</div>
          </div>
        </div>
        {bottom("다음", a.zombie != null, () => answer(ZOMBIE_C[a.zombie!]))}
      </>);
      break;
    case "opinion":
      content = (<>
        <div className="scr-body">
          <Guide text={`${SUBJECT}님에 대한 생각을 자유롭게 적어 주세요.`} />
          <div className="q-block">
            {head(qTitle().opinion)}
            <ResearchOpinion subject={SUBJECT} researcher={a.nick || "연구원"} value={a.opinion} onChange={(v) => set("opinion", v)} />
            {isBad(a.opinion) ? <p className="field-warn" role="alert" style={{ marginTop: -8 }}>{BAD_MSG}</p> : <p className="privacy-note">다른 사람의 실명·연락처 같은 개인정보는 적지 말아 주세요.</p>}
          </div>
        </div>
        {bottom("다음", a.opinion.trim().length > 0 && !isBad(a.opinion), () => answer("#D8D3FF"))}
      </>);
      break;
    case "vis":
      content = (<>
        <div className="scr-body">
          <Guide text="공개 범위는 적어주신 연구 소견에만 적용됩니다." />
          <div className="q-block">
            {head(qTitle().vis)}
            <div className="stack-16 stagger">{visOpts().map((l, i) => <Selection key={l} variant="list" no={pad2(i + 1)} label={l} active={a.vis === i} onClick={() => set("vis", i)} />)}</div>
          </div>
        </div>
        {bottom("다음", a.vis != null, () => answer("#C3DBFF"))}
      </>);
      break;
    case "pour":
      content = <Hero mode="pour" colors={sampleColors} onPour={submit} onDone={() => go("done")} />;
      break;
    case "done":
      content = <Done subject={SUBJECT} nick={a.nick || "연구원"} colors={sampleColors} mixed={mixed} answered={answered.filter((s) => QDEFS[s]?.exp !== 9).length} skipped={deferred.length} count={sample?.count ?? 4} bonus={cfg.bonus.length} onBonus={() => go("intro9")} onMake={soon} onShare={share} />;
      break;
    case "sync":
      content = <Sync subject={SUBJECT} onMake={soon} onShare={async (s) => {
          toast.show("이미지를 만드는 중입니다");
          const r = await shareCanvas(await renderCard("sync", { name: SUBJECT, n: 0, mixed: "#ffffff", colors: [], ing: [], sync: s }), "kaehae-sync.png", { text: `${SUBJECT}님과의 싱크로율 ${s.pct}%` });
          if (r !== "cancelled") toast.show(r === "saved" ? "이미지를 저장했습니다" : r === "shared" ? "공유했습니다" : "이미지를 만들지 못했습니다");
        }}
        items={cfg.bonus.map((id) => { const d = QDEFS[id], v = g[id]; return { title: sub(d.title), mine: typeof v === "number" ? d.opts![v] : "답하지 않음", self: d.opts![d.self!], ok: v === d.self }; })} />;
      break;
    default: {
      /* 실험 인트로 (R-03) */
      if (step.startsWith("intro")) {
        const no = Number(step.slice(5));
        content = (<>
          <div className="scr-body">
            <Guide text={sub(INTRO_GUIDE[no])} />
            <ResearchIntro exp={no} name={SUBJECT} style={{ flex: "none" }} />
          </div>
          <div className="scr-bottom">
            <Button block onClick={next} className="sheen">{no === 9 ? "보너스 라운드 시작" : "실험 시작"}</Button>
            {no === 10 ? <div className="later"><TextButton size="sm" onClick={() => go("intro11")}>이 실험은 건너뛸게요</TextButton></div> : null}
            {no === 9 ? <div className="later"><TextButton size="sm" onClick={() => go("done")}>다음에 할게요</TextButton></div> : null}
          </div>
        </>);
        break;
      }
      /* 공용 문항 */
      const def = QDEFS[step];
      if (!def) break;
      const v = g[step];
      const ok = isValid(def, v);
      const bonus = def.exp === 9;
      const hit = v === def.self;
      content = (<>
        <div className="scr-body">
          <Guide text={sub(def.guide)} flash={flash} />
          <div className="q-block">
            {head(sub(def.title), def.sub)}
            <GenericQ def={def} value={v} name={SUBJECT} reveal={bonus && reveal} onChange={(nv) => setG((p) => ({ ...p, [step]: nv }))} />
          </div>
        </div>
        {bonus ? (
          <div className="scr-bottom">
            {reveal ? (
              <motion.p className={cx("b-reveal", hit && "hit")} initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} role="status">
                {hit ? <><b>적중했습니다</b> {SUBJECT}님도 같은 답을 남겼습니다.</> : <><b>아쉽습니다</b> {SUBJECT}님의 답은 ‘{def.opts![def.self!]}’입니다.</>}
              </motion.p>
            ) : <Button block disabled={!ok} className="sheen" onClick={() => { setReveal(true); buzz(hit ? [8, 30, 14] : 20); setAnswered((s) => (s.includes(step) ? s : [...s, step])); setTimeout(() => { setReveal(false); next(); }, 1500); }}>정답 확인</Button>}
          </div>
        ) : bottom("다음", ok, () => answer(dropColor(def, v)))}
      </>);
    }
  }

  const inFlow = !!meta || step.startsWith("intro");
  if (!ready) return <Device><div className="scr" /></Device>;
  return (
    <Device>
      <div className="scr" ref={deviceRef}>
        <AnimatePresence initial={false}>
          {hasNav ? (
            <motion.div className="scr-top" key="nav" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
              <div key={navBump} className={navBump ? "nav-bump" : undefined}>
                <Navigation onBack={canBack ? back : undefined} right="beaker" rightLabel="시험관 랙" badge={deferred.length || undefined} onRight={() => setRack(true)} />
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
        {instant ? (
          <div key={step} className="scr-inner">{content}</div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={step} className={cx("scr-inner", !hasNav && "full")} initial={{ opacity: 0, y: 14, filter: "blur(6px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -10, filter: "blur(6px)" }} transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}>
              {content}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <Particles kind={step === "season" ? a.season : null} burst={step === "season" ? flash : 0} />
      {drops.map((d) => (
        <motion.span key={d.id} className="fly-drop" style={{ "--c": d.c } as CSSProperties}
          initial={{ x: d.x0, y: d.y0, scale: 0.4, opacity: 0, rotate: -45 }}
          animate={{ x: [d.x0, d.x0 + (d.x1 - d.x0) * 0.35, d.x1], y: [d.y0, d.y0 - 90, d.y1], scale: [0.4, 1.3, 0.5], opacity: [0, 1, 0.9], rotate: -45 }}
          transition={{ duration: 0.6, ease: [0.5, 0, 0.3, 1] }} />
      ))}

      {/* R-06 시험관 랙 */}
      <BottomSheet open={rack} onClose={() => setRack(false)} title="시험관 랙" desc={deferred.length ? `잠시 넘겨 둔 문항이 ${deferred.length}개 꽂혀 있습니다. 누르면 그 문항으로 돌아가고, 끝까지 답하지 않아도 제출하실 수 있습니다.` : "보관해 둔 문항이 없습니다. 답하기 어려운 문항은 “조금 더 생각해볼게요”로 넘기실 수 있어요."}
        actions={<Button block variant="assistive" onClick={() => setRack(false)}>닫기</Button>}>
        <div className={cx("rack", !deferred.length && "empty")} aria-hidden="true">
          {Array.from({ length: Math.max(5, deferred.length) }, (_, i) => <i key={i} className={i < deferred.length ? "on" : undefined} style={{ "--i": i } as CSSProperties} />)}
        </div>
        {deferred.map((d) => (
          <Selection key={d} variant="list" no={`EXP. ${pad2(metaOf(d)?.exp ?? 0)}`} label={metaOf(d)?.title ?? ""} onClick={() => { setRack(false); setReturnTo(inFlow ? step : "pour"); go(d); }} />
        ))}
      </BottomSheet>
      {/* R-07 이어하기 */}
      <BottomSheet open={!!saved && step === "landing"} onClose={() => setSaved(null)} title={`${saved?.a.nick || "연구원"}님, 다시 오셨네요`}
        desc={saved ? `지난번에 ${saved.answered?.length ?? 0}개 문항까지 답하셨습니다. 멈춘 곳에서 이어서 하실 수 있습니다.` : undefined}
        actions={<>
          <Button block onClick={resume} className="sheen">이어서 하기</Button>
          <TextButton size="sm" onClick={() => { try { localStorage.removeItem(saveKey.current); } catch {} setSaved(null); }}>처음부터 다시 할게요</TextButton>
        </>}>
        {saved ? <div className="resume-bar"><ProgressBar value={Math.round((Math.max(0, buildOrder(saved.cfg.a, saved.cfg.b, saved.cfg.rel, saved.cfg.bonus).indexOf(saved.step)) / buildOrder(saved.cfg.a, saved.cfg.b, saved.cfg.rel, saved.cfg.bonus).indexOf("pour")) * 100)} /></div> : null}
      </BottomSheet>
      <Modal open={ask} onClose={() => setAsk(false)} title="아직 답하지 않은 문항이 있습니다"
        desc={`시험관 랙에 ${deferred.length}개가 남아 있습니다. 답하지 않고 이대로 제출하셔도 괜찮습니다.`}
        actions={<>
          <Button block onClick={() => { setAsk(false); setReturnTo("pour"); go(deferred[0]); }}>다시 답하러 가기</Button>
          <Button block variant="assistive" onClick={() => { setAsk(false); go("pour"); }}>이대로 제출하기</Button>
        </>} />
      <PrivacySheet open={privacy} onClose={() => setPrivacy(false)} role="researcher" />
      <Toast message={toast.message} />
    </Device>
  );
}

/* ================================================================ 화면 조각 */

/** R-01 초대 랜딩 · R-09 붓기: 3D 플라스크 뒤로 흐릿한 색 원이 흐른다 */
function Hero({ mode, colors = [], onEnter, onPour, onDone, onPrivacy, ownerUrl }: { mode: "landing" | "pour"; colors?: string[]; ownerUrl?: string | null; onEnter?: () => void; onPrivacy?: () => void; onPour?: () => Promise<boolean>; onDone?: () => void }) {
  const [phase, setPhase] = useState<"idle" | "merging" | "done">("idle");
  const heroRef = useHeroFit(`${mode}-${phase === "done"}`);
  const flask = useFlaskSrc();
  const base = mode === "landing" ? ["#E0E0E0"] : colors.length ? colors : ["#E0E0E0", "#B0B8C1", "#F6F0CF"];
  const row = Array.from({ length: 10 }, (_, i) => base[i % base.length]);
  const mixed = mix(colors.length ? colors : ["#C3DBFF", "#D8D3FF"]);

  const pour = async () => {
    setPhase("merging");
    buzz([10, 40, 20]);
    /* 모이는 연출이 도는 동안 제출한다. 실패하면 다시 누를 수 있게 되돌린다. */
    const [ok] = await Promise.all([onPour ? onPour() : Promise.resolve(true), new Promise((r) => setTimeout(r, 1500))]);
    if (!ok) return setPhase("idle");
    setPhase("done"); buzz(16);
  };

  return (
    <div className={cx("scr hero-scr")} style={{ paddingTop: "var(--safe-t)" }}>
      <div className="scr-body">
        {mode === "landing" ? (
          <div className="hero-title"><p>타인의 눈으로 보는 나</p><Logo height={38} className="k-logo" /></div>
        ) : <div style={{ height: 62 }} />}
        <div className="hero-stage" ref={heroRef} style={{ marginTop: -12 }}>
          <div className={cx("hero-glow", phase === "done" && "on")} style={{ "--mix": mixed } as CSSProperties} />
          <motion.div className={cx("hero-circles", phase !== "idle" && "merge")} animate={{ opacity: phase === "idle" ? 1 : 0 }} transition={{ duration: 0.5 }}>
            <div className="track" style={{ "--blur": mode === "pour" ? "30px" : "16px" } as CSSProperties}>
              {[...row, ...row].map((c, i) => <i key={i} style={{ "--c": c } as CSSProperties} />)}
            </div>
          </motion.div>
          {phase === "merging" ? base.map((c, i) => {
            const ang = (i / base.length) * Math.PI * 2;
            return <motion.span key={i} className="merge-dot" style={{ "--c": c, left: "50%", top: 150, marginLeft: -65, marginTop: -65 } as CSSProperties}
              initial={{ x: Math.cos(ang) * 190, y: Math.sin(ang) * 60, scale: 1, opacity: 0.95 }}
              animate={{ x: [Math.cos(ang) * 190, Math.cos(ang + 1.4) * 90, 0], y: [Math.sin(ang) * 60, Math.sin(ang + 1.4) * 70, 30], scale: [1, 0.8, 0.3], opacity: [0.95, 0.9, 0] }}
              transition={{ duration: 1.35, delay: i * 0.07, ease: [0.5, 0, 0.3, 1] }} />;
          }) : null}
          <div className="hero-ring" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <motion.img className="hero-flask" src={flask} alt="" draggable={false}
            animate={phase === "merging" ? { scale: [1, 1.06, 0.98, 1.03, 1], rotate: [0, -3, 3, -1, 0] } : { scale: 1, rotate: 0 }} transition={{ duration: 1.4 }} />
        </div>
        <AnimatePresence mode="wait">
          {mode === "landing" ? (
            <motion.p key="l" className="hero-text"><span><b>{SUBJECT}</b>님의 캐해 연구에</span><span>초대되셨습니다</span></motion.p>
          ) : phase !== "done" ? (
            <motion.p key="p" className="hero-text" exit={{ opacity: 0, y: -8 }}><span>실험이 모두 끝났습니다.</span><span>모은 표본을</span><span><b>{SUBJECT}</b>님의 플라스크에 부어 주세요.</span></motion.p>
          ) : (
            <motion.p key="d" className="hero-text" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}><span>당신의 색이 <b>{SUBJECT}</b>님의</span><span>플라스크에 스며들었습니다.</span></motion.p>
          )}
        </AnimatePresence>
      </div>
      <div className="scr-bottom">
        {mode === "landing" ? (<>
          <Button block onClick={onEnter} className="sheen">입장하기</Button>
          <span className="hero-caption">약 5분 · 로그인 없이 참여</span>
          {ownerUrl ? <div className="link-row"><TextButton size="sm" onClick={() => location.assign(ownerUrl)}>내 연구소입니다 · 리포트 열기</TextButton></div> : null}
          {onPrivacy ? <PrivacyLine onOpen={onPrivacy} /> : null}
        </>) : phase === "done" ? (<>
          <Button block onClick={onDone} className="sheen">접수증 확인하기</Button>
        </>) : (
          <Button block disabled={phase === "merging"} onClick={pour} className="sheen">{phase === "merging" ? "붓는 중…" : "클릭하여 표본 붓기"}</Button>
        )}
      </div>
    </div>
  );
}

/** 인사 3장: 한 화면 안에서 앞 문장이 작아지고 흐려지며 내려앉고, 그 위로 새 문장이 번져 나온다. 탭하면 바로 넘어간다. */
const AGE = [
  { scale: 1, opacity: 1, blur: 0 },
  { scale: 0.7, opacity: 0.16, blur: 0.6 },
  { scale: 0.58, opacity: 0.07, blur: 1.4 },
];
const GREET_GAP = [44, 26];
function Greeting({ onDone }: { onDone: () => void }) {
  const GREETS = useMemo(greets, []);
  const [i, setI] = useState(0);
  const [h, setH] = useState<number[]>([]);
  const refs = useRef<(HTMLParagraphElement | null)[]>([]);
  const done = useRef(onDone); done.current = onDone;
  useEffect(() => {
    const t = setTimeout(() => (i < GREETS.length - 1 ? setI(i + 1) : done.current()), i === GREETS.length - 1 ? 4600 : 2500);
    return () => clearTimeout(t);
  }, [i]);
  /* 줄마다 높이가 달라서, 새 문장의 높이를 재고 그만큼 앞 문장을 밀어 내린다 */
  useLayoutEffect(() => { setH(refs.current.map((el) => el?.offsetHeight ?? 0)); }, [i]);
  const advance = () => { buzz(4); if (i < GREETS.length - 1) setI(i + 1); else onDone(); };
  const yOf = (k: number) => {
    let y = 0;
    for (let j = i; j > k; j--) y += (h[j] ?? 36) * AGE[i - j].scale + GREET_GAP[Math.min(i - j, GREET_GAP.length - 1)];
    return y;
  };
  return (
    <div className="scr greet" onClick={advance} role="button" tabIndex={0} aria-label="다음" onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && advance()}>
      <AiOrb speaking />
      <div className="lines" aria-live="polite">
        {GREETS.slice(0, i + 1).map((g, k) => {
          const age = AGE[Math.min(i - k, AGE.length - 1)];
          return (
            <motion.p key={k} ref={(el) => { refs.current[k] = el; }} aria-hidden={k !== i}
              initial={{ opacity: 0, y: -14, scale: 1.04, filter: "blur(12px)" }}
              animate={{ opacity: age.opacity, y: yOf(k), scale: age.scale, filter: `blur(${age.blur}px)` }}
              transition={k === i ? { duration: 1.1, delay: i ? 0.35 : 0.1, ease: [0.2, 0.7, 0.2, 1] } : { duration: 1.25, ease: [0.45, 0, 0.15, 1] }}>
              {rich(g)}
            </motion.p>
          );
        })}
      </div>
      <span className="tap">화면을 누르면 바로 넘어갑니다</span>
    </div>
  );
}

/** R-02 로딩: 유리 원반 모션과 진행률 */
function Loading({ onDone }: { onDone: () => void }) {
  const [p, setP] = useState(0);
  const done = useRef(onDone); done.current = onDone;
  useEffect(() => {
    const t0 = performance.now(), dur = 2800;
    const id = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      setP(Math.round((1 - Math.pow(1 - k, 2.2)) * 100));
      if (k >= 1) { clearInterval(id); setTimeout(() => done.current(), 350); }
    }, 60);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="scr loading">
      <h2>연구원 등록 중...</h2>
      <LoaderArt />
      <ProgressBar value={p} />
    </div>
  );
}

/** 성분표: 시약병을 꾹 누르면 비커가 차오른다 */
function Ingredient({ values, onChange, onFull }: { values: number[]; onChange: (v: number[]) => void; onFull: () => void }) {
  const [pouring, setPouring] = useState<number | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const ref = useRef(values); ref.current = values;
  const start = useRef(0);
  const total = values.reduce((a, b) => a + b, 0);
  const cur = useRef<number | null>(null);
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    const i = cur.current;
    cur.current = null;
    setPouring(null);
    if (i == null) return;
    /* 짧게 톡 누르면 5%를 붓는다 */
    const v = [...ref.current], t = v.reduce((x, y) => x + y, 0), added = v[i] - start.current;
    if (added < 5) { v[i] += Math.min(5 - added, 100 - t); onChange(v); }
  };
  const begin = (i: number) => {
    if (total >= 100) return onFull();
    start.current = values[i];
    cur.current = i;
    setPouring(i); buzz(6);
    timer.current = setInterval(() => {
      const v = [...ref.current];
      if (v.reduce((a, b) => a + b, 0) >= 100) return stop();
      v[i] += 1; onChange(v);
      if (v[i] % 5 === 0) buzz(3);
    }, 55);
  };
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  return (
    <div className="ingredient">
      <div className="left">
        <Beaker layers={INGREDIENTS.map((g, i) => ({ ...g, value: values[i] }))} />
        <div className="remain"><span>남은 용량</span><b>{100 - total}%</b></div>
      </div>
      <div className="right">
        {INGREDIENTS.map((g, i) => (
          <IngredientOption key={g.name} name={g.name} color={g.color} pct={values[i]} pouring={pouring === i} hint={total === 0 && i === 0}
            onPourStart={() => begin(i)} onPourEnd={stop} onMinus={() => onChange(values.map((x, k) => (k === i ? Math.max(0, x - 5) : x)))} />
        ))}
      </div>
    </div>
  );
}
