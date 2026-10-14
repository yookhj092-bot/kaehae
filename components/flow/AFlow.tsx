"use client";

/* A 플로우: 연구 대상(링크 주인)이 연구소를 만들고 초대 링크와 열쇠를 받는다.
   A-01 첫 화면 → A-02 이름·사진 → A-03 실험 고르기 → A-04 셀프 캐해 안내 → A-05 셀프 응답 → A-06 연구소 완성·열쇠 → A-07 공유 시트
   시안이 없는 화면이라 R 플로우의 컴포넌트와 화면 틀을 그대로 쓴다. 주소 옵션: ?at=단계 · ?instant=1 */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BottomSheet, Button, Guide, Icon, Logo, Navigation, ProgressBar, Radio, TextButton, TextField, Toast, buzz, copyText, cx, useToast } from "@/components/ui";
import { ColorPicker, LoaderArt, preloadMotion, useFlaskSrc, useHeroFit } from "./widgets";
import { Device } from "./Device";
import { GenericQ } from "./GenericQ";
import { isValid, type QDef } from "./questions";
import { hsvToHex, type HSV } from "@/lib/color";
import { EXPERIMENTS, expById, pad2 } from "@/lib/experiments";
import { renderStoryInvite, shareCanvas } from "@/lib/shareImage";
import { createLab, getLab, isFail, markKeySaved, myLab, setMyLab, updateLab } from "@/lib/api";
import { BAD_MSG, isBad } from "@/lib/moderation";
import { RETENTION_DAYS } from "@/lib/site";
import { kakaoShareReady, shareInviteToKakao } from "@/lib/kakao";
import { PrivacyLine, PrivacySheet } from "./Privacy";

type Step = "home" | "name" | "pick" | "selfIntro" | "s_color" | "s1" | "s2" | "s3" | "s4" | "s5" | "build" | "key";
const ORDER: Step[] = ["home", "name", "pick", "selfIntro", "s_color", "s1", "s2", "s3", "s4", "s5", "build", "key"];
const NO_NAV: Step[] = ["home", "build"];

/* 셀프 캐해: 친구들이 맞히게 될 취향 문답의 '나' 버전 */
const SELF: Record<string, QDef> = {
  s1: { exp: 9, kind: "ox", title: "민트초코, 호인가요 불호인가요?", guide: "친구들이 맞혀 볼 문항입니다. 솔직하게 골라 주세요.", opts: ["불호", "호"] },
  s2: { exp: 9, kind: "ox", title: "탕수육은 부먹인가요, 찍먹인가요?", guide: "카드를 밀거나 아래 버튼을 눌러 주세요.", opts: ["부먹", "찍먹"] },
  s3: { exp: 9, kind: "choice", title: "카페에 가면 주로 무엇을 주문하시나요?", guide: "가장 자주 고르는 메뉴 하나면 됩니다.", opts: ["아이스 아메리카노", "라떼", "달달한 시즌 메뉴", "차", "에이드", "카페 안 감"] },
  s4: { exp: 9, kind: "grid", cols: 3, title: "여행을 간다면 어디로 떠나고 싶으신가요?", guide: "셋 중 하나만 골라 주세요.", opts: ["산", "바다", "도시"], emoji: ["⛰️", "🌊", "🏙️"] },
  s5: { exp: 9, kind: "ox", title: "여름과 겨울 중 어느 쪽을 더 좋아하시나요?", guide: "마지막 문항입니다.", opts: ["여름", "겨울"] },
};
const SELF_IDS = ["s_color", "s1", "s2", "s3", "s4", "s5"];
const HERO_COLORS = ["#C3DBFF", "#D8D3FF", "#F1CCE8", "#F6F0CF", "#CDE9E3"];

export function AFlow() {
  const [step, setStep] = useState<Step>("home");
  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [rotA, setRotA] = useState(3);
  const [rotB, setRotB] = useState(8);
  const [rel, setRel] = useState(true); // 10 관계 데이터 포함 여부
  const [color, setColor] = useState<HSV | null>(null);
  const [g, setG] = useState<Record<string, unknown>>({});
  const [selfOn, setSelfOn] = useState(false);
  const [share, setShare] = useState(false);
  const heroRef = useHeroFit(step);
  const [keyKept, setKeyKept] = useState(false); // 열쇠 링크를 보관했는지
  const [keyFail, setKeyFail] = useState(false); // 복사가 막힌 브라우저
  const [privacy, setPrivacy] = useState(false);
  const [instant, setInstant] = useState(false);
  const [ids, setIds] = useState({ lab: "", key: "" }); // 서버가 만들어 준다
  const [editing, setEditing] = useState(false); // 이미 만든 연구소를 고치는 중
  const toast = useToast();
  const flask = useFlaskSrc();
  const fileRef = useRef<HTMLInputElement>(null);
  const nm = name.trim() || "이름";

  useEffect(() => {
    const q = new URLSearchParams(location.search);
    setInstant(q.has("instant"));
    preloadMotion();
    const at = q.get("at") as Step | null;
    if (at && ORDER.includes(at)) {
      /* 설정에서 들어온 경우: 이 기기에서 만든 연구소를 고친다 */
      const mine = myLab();
      if (mine) { setName(mine.name); setIds({ lab: mine.lab, key: mine.key }); setEditing(true); getLab(mine.lab).then((l) => { if (!isFail(l)) { setRotA(Number(l.rotA)); setRotB(Number(l.rotB)); setRel(l.rel); } }); }
      else setName("지원");
      setSelfOn(true); setStep(at);
    }
  }, []);

  const go = (s: Step) => setStep(s);
  const next = () => go(ORDER[Math.min(ORDER.length - 1, ORDER.indexOf(step) + 1)]);
  const back = () => {
    if (step === "key") return;
    if (step === "build") return;
    go(ORDER[Math.max(0, ORDER.indexOf(step) - 1)]);
  };

  /* 문항 수 · 예상 시간 */
  const picked = useMemo(() => [2, rotA, 5, rotB, ...(rel ? [10] : []), 11], [rotA, rotB, rel]);
  const totalQ = 4 + picked.reduce((n, no) => n + expById(no).count, 0);
  const totalMin = Math.max(1, Math.round((40 + picked.reduce((n, no) => n + expById(no).seconds, 0)) / 60));
  const origin = typeof window !== "undefined" ? location.origin : "";
  const inviteUrl = ids.lab ? `${origin}/r?lab=${ids.lab}` : `${origin}/r?a=${pad2(rotA)}&b=${pad2(rotB)}`;
  const keyUrl = `${origin}/b?lab=${ids.lab}&key=${ids.key}`;
  const copy = async (text: string, msg: string) => {
    buzz(8);
    toast.show((await copyText(text)) ? msg : "복사하지 못했습니다. 길게 눌러 복사해 주세요");
  };
  /* 열쇠 링크 보관: 복사하거나, 공유 창으로 나에게 보낸다 */
  const keepKey = async (how: "copy" | "send") => {
    buzz(8);
    if (how === "send" && navigator.share) {
      try { await navigator.share({ title: `${nm}님의 연구소 열쇠`, text: "내 캐해 연구소 열쇠 (나만 보기)", url: keyUrl }); } catch { return; }
      toast.show("열쇠를 보냈습니다");
    } else if (await copyText(keyUrl)) toast.show("열쇠 링크를 복사했습니다. 메모나 나와의 채팅에 붙여 두세요");
    else { setKeyFail(true); return toast.show("복사하지 못했습니다. 링크를 길게 눌러 복사해 주세요"); }
    if (ids.lab) markKeySaved(ids.lab);
    setKeyKept(true);
  };
  const onPhoto = (f?: File) => {
    if (!f) return;
    const r = new FileReader();
    r.onload = () => setPhoto(String(r.result));
    r.readAsDataURL(f);
  };
  /* 연구소를 서버에 만든다(고치는 중이면 바꾼다). 초대 링크와 열쇠는 서버가 준 값으로 만든다. */
  const finish = async () => {
    const taste = ["s1", "s2", "s3", "s4", "s5"].map((k) => (typeof g[k] === "number" ? (g[k] as number) : null));
    const self = selfOn ? { color: color ? hsvToHex(color) : null, taste } : null;
    const body = { name: name.trim() || "이름", rotA: pad2(rotA), rotB: pad2(rotB), rel, self };
    if (editing && ids.lab) {
      const r = await updateLab(ids.lab, ids.key, selfOn ? body : { rotA: body.rotA, rotB: body.rotB, rel });
      if (isFail(r)) { toast.show("바꾸지 못했습니다. 잠시 뒤 다시 시도해 주세요"); return go("pick"); }
      return go("key");
    }
    const made = await createLab(body);
    if (isFail(made)) { toast.show(made.error === "profanity" ? "이름에 쓸 수 없는 표현이 있습니다" : made.error === "busy" ? "연구소를 너무 자주 만들었습니다. 한 시간 뒤 다시 시도해 주세요" : "연구소를 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요"); return go(made.error === "profanity" ? "name" : "selfIntro"); }
    setIds({ lab: made.id, key: made.key });
    setMyLab({ lab: made.id, key: made.key, name: body.name });
    go("key");
  };

  const selfIdx = SELF_IDS.indexOf(step);
  const head = (title: ReactNode, sub?: string, tag?: ReactNode) => (
    <div className="q-head">
      {tag ? <div className="q-step">{tag}</div> : null}
      <h1 className="q-title">{title}</h1>
      {sub ? <p className="q-sub">{sub}</p> : null}
    </div>
  );
  const selfTag = <><span className="tag">셀프 캐해</span><span className="nm">내가 보는 나</span><span className="cnt">{selfIdx + 1}/{SELF_IDS.length}</span></>;

  let content: ReactNode = null;
  switch (step) {
    case "home":
      content = (
        <div className="scr hero-scr" style={{ paddingTop: "var(--safe-t)" }}>
          <div className="scr-body">
            <div className="hero-title"><p>타인의 눈으로 보는 나</p><Logo height={38} className="k-logo" /></div>
            <div className="hero-stage" ref={heroRef} style={{ marginTop: -12 }}>
              <div className="hero-circles"><div className="track" style={{ "--blur": "22px" } as CSSProperties}>
                {[...HERO_COLORS, ...HERO_COLORS, ...HERO_COLORS, ...HERO_COLORS].map((c, i) => <i key={i} style={{ "--c": c } as CSSProperties} />)}
              </div></div>
              <div className="hero-ring" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="hero-flask" src={flask} alt="" draggable={false} />
            </div>
            <p className="hero-text"><span>친구들이 본 <b>나</b>를</span><span>한 병에 모아 보세요</span></p>
            <ol className="a-steps">
              <li><i>1</i>연구소를 만들고</li>
              <li><i>2</i>링크를 보내면</li>
              <li><i>3</i>리포트가 쌓여요</li>
            </ol>
          </div>
          <div className="scr-bottom">
            <Button block onClick={next} className="sheen">내 연구소 만들기</Button>
            <span className="hero-caption">약 1분 · 로그인 없이 시작</span>
            <div className="link-row"><TextButton size="sm" onClick={() => location.assign("/e?k=nokey")}>이미 만든 연구소 열기</TextButton></div>
            <PrivacyLine onOpen={() => setPrivacy(true)} />
          </div>
        </div>
      );
      break;
    case "name":
      content = (<>
        <div className="scr-body">
          <Guide text="연구소의 주인공을 등록하겠습니다." />
          <div className="q-block">
            {head(<><span>이름</span><span className="light">을 알려 주세요.</span></>, "친구들에게 보이는 이름입니다. 별명도 괜찮습니다.", <><span className="tag reg">연구소 만들기</span><span className="nm">1/3</span></>)}
            <form onSubmit={(e) => { e.preventDefault(); if (name.trim() && name.length <= 12 && !isBad(name)) { (document.activeElement as HTMLElement)?.blur(); next(); } }}>
              <TextField value={name} onChange={setName} placeholder="닉네임 또는 이름" label="이름" />
            </form>
            {isBad(name) ? <p className="field-warn" role="alert" style={{ marginTop: -8 }}>{BAD_MSG}</p> : null}
            <div className="a-photo hide-on-kb">
              <button type="button" className={cx("avatar pressable", !photo && "empty")} onClick={() => fileRef.current?.click()} aria-label="사진 고르기" style={photo ? { backgroundImage: `url(${photo})` } : undefined}>
                {photo ? null : <Icon name="plus" />}
              </button>
              <div>
                <p>프로필 사진 <span>선택</span></p>
                <span>초대 화면과 리포트에 함께 보입니다.</span>
                {photo ? <TextButton size="sm" onClick={() => setPhoto(null)}>사진 빼기</TextButton> : null}
              </div>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onPhoto(e.target.files?.[0])} />
            </div>
          </div>
        </div>
        <div className="scr-bottom"><Button block disabled={!name.trim() || name.length > 12 || isBad(name)} onClick={next} className="sheen">다음</Button></div>
      </>);
      break;
    case "pick": {
      const row = (no: number, on: boolean, onClick?: () => void, badge?: string, lock?: boolean) => {
        const e = expById(no);
        return (
          <button key={no} type="button" className={cx("exp-row glass pressable", on && "is-active", lock && "lock")} aria-pressed={on} onClick={() => { if (!onClick) return; buzz(8); onClick(); }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/img/research/${pad2(no)}.png`} alt="" />
            <span className="tx">
              <span className="no">EXP. {pad2(no)}{badge ? <em>{badge}</em> : null}</span>
              <b>{e.title}</b>
              <span className="ds">{e.desc.replace("{name}", nm)} · {e.count}문항</span>
            </span>
            {lock ? <span className="fix">고정</span> : <Radio on={on} />}
          </button>
        );
      };
      content = (<>
        <div className="scr-body">
          <Guide text={`${nm}님의 친구들이 진행할 실험을 골라 주세요.`} />
          <div className="q-block">
            {head("어떤 실험을 열어 둘까요?", "추천 조합이 미리 골라져 있습니다. 그대로 두셔도 됩니다.", <><span className="tag reg">연구소 만들기</span><span className="nm">2/3</span></>)}
            <section className="exp-sec">
              <h2>감각 실험 <span>1개 선택</span></h2>
              <div className="stack-12 stagger">{EXPERIMENTS.filter((e) => e.kind === "rotationA").map((e) => row(e.no, rotA === e.no, () => setRotA(e.no), e.no === 3 ? "추천" : undefined))}</div>
            </section>
            <section className="exp-sec">
              <h2>상황 실험 <span>1개 선택</span></h2>
              <div className="stack-12">{EXPERIMENTS.filter((e) => e.kind === "rotationB").map((e) => row(e.no, rotB === e.no, () => setRotB(e.no), e.no === 8 ? "추천" : undefined))}</div>
            </section>
            <section className="exp-sec">
              <h2>선택 실험 <span>켜고 끌 수 있어요</span></h2>
              <div className="stack-12">{row(10, rel, () => setRel((v) => !v))}</div>
            </section>
            <section className="exp-sec">
              <h2>기본 실험 <span>항상 포함</span></h2>
              <div className="stack-12">{[2, 5, 11].map((no) => row(no, true, undefined, undefined, true))}</div>
            </section>
          </div>
        </div>
        <div className="scr-bottom">
          <p className="pick-sum" aria-live="polite">총 <b>{totalQ}문항</b> · 친구 한 명당 약 <b>{totalMin}분</b></p>
          <Button block onClick={next} className="sheen">이 구성으로 열기</Button>
        </div>
      </>);
      break;
    }
    case "selfIntro":
      content = (<>
        <div className="scr-body">
          <Guide text={`${nm}님이 보는 ‘나’도 남겨 두시겠어요?`} />
          <div className="q-block">
            {head("내가 보는 나 vs 친구가 보는 나", "먼저 답해 두면 리포트에서 나란히 비교됩니다.", <><span className="tag reg">연구소 만들기</span><span className="nm">3/3</span></>)}
            <div className="self-vs glass">
              <div><i style={{ background: "var(--gray-900)" }} /><b>나</b><span>내가 고른 색과 취향</span></div>
              <em>vs</em>
              <div><i style={{ background: "var(--gradient-bv)" }} /><b>친구들</b><span>친구들이 본 색과 취향</span></div>
            </div>
            <ul className="self-list stagger">
              <li className="glass"><b>나 vs 친구들 비교</b><span>리포트에 비교 탭이 열립니다.</span></li>
              <li className="glass"><b>취향 적중 테스트</b><span>친구들이 내 답을 맞히는 보너스 라운드가 열립니다.</span></li>
              <li className="glass"><b>6문항 · 약 40초</b><span>나중에 연구소에서 답하셔도 됩니다.</span></li>
            </ul>
          </div>
        </div>
        <div className="scr-bottom">
          <Button block onClick={() => { setSelfOn(true); next(); }} className="sheen">지금 답해 두기</Button>
          <div className="later"><TextButton size="sm" onClick={() => { setSelfOn(false); go("build"); }}>나중에 할게요</TextButton></div>
        </div>
      </>);
      break;
    case "s_color":
      content = (<>
        <div className="scr-body">
          <Guide text="색 위를 문질러 보세요. 닿는 색이 표본이 됩니다." />
          <div className="q-block">
            {head("나를 색으로 추출한다면 어떤 색일까요?", undefined, selfTag)}
            <ColorPicker value={color} onChange={setColor} />
          </div>
        </div>
        <div className="scr-bottom"><Button block disabled={!color} onClick={next} className="sheen">다음</Button></div>
      </>);
      break;
    case "build":
      content = <Build name={nm} onDone={finish} />;
      break;
    case "key":
      content = (<>
        <div className="scr-body">
          <Guide text={`${nm}님의 연구소가 문을 열었습니다.`} />
          <motion.div className="lab-card glass" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 160, damping: 18, delay: 0.1 }}>
            <div className="lab-top">
              <i className="avatar sm" style={photo ? { backgroundImage: `url(${photo})` } : color ? { background: hsvToHex(color) } : undefined} />
              <div>
                <b>{nm}님의 캐해 연구소</b>
                <span>{totalQ}문항 · 약 {totalMin}분 · 표본 0개</span>
              </div>
            </div>
            <div className="lab-tags">{picked.map((no) => <span key={no}>{pad2(no)} {expById(no).title}</span>)}</div>
          </motion.div>
          <div className={cx("link-box glass key", keyKept ? "kept" : "must")}>
            <div className="lb-head"><b>연구소 열쇠</b><span>나만 보는 비밀 링크</span>{keyKept ? <em>보관함</em> : <em className="need">먼저 보관하기</em>}</div>
            <div className="lb-row"><code>{keyUrl.replace(/^https?:\/\//, "")}</code><button type="button" className="pressable" aria-label="열쇠 링크 복사" onClick={() => keepKey("copy")}><Icon name="copy" size={20} /></button></div>
            <p className="warn"><b>이 링크를 잃어버리면 리포트를 다시 열 수 없습니다.</b> 로그인이 없어서 되찾아 드릴 방법이 없어요. 지금 복사해서 메모나 나와의 채팅에 붙여 두세요.</p>
            <p>마지막 표본이 들어온 뒤 {RETENTION_DAYS}일이 지나면 연구소는 자동으로 지워집니다.</p>
          </div>
          <div className="link-box glass">
            <div className="lb-head"><b>초대 링크</b><span>친구에게 보내는 링크</span></div>
            <div className="lb-row"><code>{inviteUrl.replace(/^https?:\/\//, "")}</code><button type="button" className="pressable" aria-label="초대 링크 복사" onClick={() => copy(inviteUrl, "초대 링크를 복사했습니다")}><Icon name="copy" size={20} /></button></div>
          </div>
        </div>
        <div className="scr-bottom">
          {keyKept ? (<>
            <Button block iconLeft="export" onClick={() => setShare(true)} className="sheen">친구 초대하기</Button>
            <div className="later"><TextButton size="sm" onClick={() => location.assign(`/b?lab=${ids.lab}&key=${ids.key}`)}>내 연구소로 가기</TextButton></div>
          </>) : (<>
            <Button block iconLeft="copy" onClick={() => keepKey("copy")} className="sheen">열쇠 링크 복사하기</Button>
            <div className="link-row">
              <TextButton size="sm" onClick={() => keepKey("send")}>나에게 보내기</TextButton>
              {keyFail ? <><i /><TextButton size="sm" onClick={() => { if (ids.lab) markKeySaved(ids.lab); setKeyKept(true); }}>직접 복사했어요</TextButton></> : null}
            </div>
          </>)}
        </div>
      </>);
      break;
    default: {
      const def = SELF[step];
      if (!def) break;
      const v = g[step];
      content = (<>
        <div className="scr-body">
          <Guide text={def.guide} />
          <div className="q-block">
            {head(def.title, undefined, selfTag)}
            <GenericQ def={def} value={v} name={nm} onChange={(nv) => setG((p) => ({ ...p, [step]: nv }))} />
          </div>
        </div>
        <div className="scr-bottom">
          <Button block disabled={!isValid(def, v)} onClick={next} className="sheen">{step === "s5" ? "연구소 열기" : "다음"}</Button>
          <div className="later"><TextButton size="sm" onClick={next}>이 문항은 넘길게요</TextButton></div>
        </div>
      </>);
    }
  }

  const hasNav = !NO_NAV.includes(step);
  return (
    <Device>
      <div className="scr">
        <AnimatePresence initial={false}>
          {hasNav ? (
            <motion.div className="scr-top" key="nav" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.3 }}>
              <Navigation onBack={step === "key" ? undefined : back} />
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

      {/* A-07 공유 시트 */}
      <BottomSheet open={share} onClose={() => setShare(false)} title="친구 초대하기" desc="링크를 받은 친구는 로그인 없이 바로 참여할 수 있습니다."
        actions={<Button block variant="assistive" onClick={() => setShare(false)}>닫기</Button>}>
        <div className="share-preview glass">
          <i className="avatar sm" style={photo ? { backgroundImage: `url(${photo})` } : color ? { background: hsvToHex(color) } : undefined} />
          <div><b>{nm}님의 캐해 연구에 초대합니다</b><span>타인의 눈으로 보는 나, KAEHAE · 약 {totalMin}분</span></div>
        </div>
        <div className="share-grid">
          <button type="button" className="pressable" onClick={() => copy(inviteUrl, "초대 링크를 복사했습니다")}><i className="glass"><Icon name="copy" /></i>링크 복사</button>
          <button type="button" className="pressable" onClick={async () => { if (!(await shareInviteToKakao(nm, inviteUrl))) toast.show(kakaoShareReady() ? "카카오톡을 열지 못했습니다" : "카카오톡 공유는 아직 준비 중입니다"); }}><i className="glass kakao">톡</i>카카오톡</button>
          <button type="button" className="pressable" onClick={async () => {
            toast.show("이미지를 만드는 중입니다");
            const r = await shareCanvas(await renderStoryInvite(nm), "kaehae-invite-story.png");
            if (r !== "cancelled") toast.show(r === "saved" ? "스토리 이미지를 저장했습니다" : r === "shared" ? "공유했습니다" : "이미지를 만들지 못했습니다");
          }}><i className="glass">◎</i>스토리</button>
          <button type="button" className="pressable" onClick={async () => {
            if (navigator.share) { try { await navigator.share({ title: `${nm}님의 캐해 연구소`, text: `${nm}님의 캐해 연구에 초대합니다`, url: inviteUrl }); } catch {} }
            else copy(inviteUrl, "초대 링크를 복사했습니다");
          }}><i className="glass"><Icon name="export" /></i>더보기</button>
        </div>
      </BottomSheet>
      <PrivacySheet open={privacy} onClose={() => setPrivacy(false)} role="owner" />
      <Toast message={toast.message} />
    </Device>
  );
}

/** 연구소를 여는 동안: 유리 원반 모션과 진행률 */
function Build({ name, onDone }: { name: string; onDone: () => void }) {
  const [p, setP] = useState(0);
  const done = useRef(onDone); done.current = onDone;
  useEffect(() => {
    const t0 = performance.now(), dur = 2600;
    const id = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      setP(Math.round((1 - Math.pow(1 - k, 2.2)) * 100));
      if (k >= 1) { clearInterval(id); setTimeout(() => done.current(), 350); }
    }, 60);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="scr loading">
      <h2>{name}님의 연구소를<br />여는 중...</h2>
      <LoaderArt />
      <ProgressBar value={p} />
    </div>
  );
}
