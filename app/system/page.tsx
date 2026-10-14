"use client";

/* 디자인 시스템 모음 — 피그마 컴포넌트를 코드로 옮긴 결과를 한 페이지에서 확인한다. */

import { useRef, useState, type ReactNode } from "react";
import {
  AiOrb, Bar, BarEnds, Beaker, BottomSheet, Button, ContextField, Guide, IconButton, IdCard, IngredientOption, Icon, Logo,
  Modal, Navigation, ProgressBar, Radio, RangeSticks, ResearchIntro, ResearchOpinion, ScaleTubes, Selection, Tabs, Tag,
  TextButton, TextField, Toast, useToast, type IconName,
} from "@/components/ui";
import { EXPERIMENTS } from "@/lib/experiments";
import "./system.css";

const ICONS: IconName[] = ["arrow-left", "arrow-right", "toward", "next", "export", "copy", "beaker", "minus", "plus", "check", "close"];
const INGREDIENTS = [
  { name: "다정", color: "var(--pink-300)" }, { name: "엉뚱", color: "var(--yellow-200)" }, { name: "열정", color: "var(--red-400)" },
  { name: "여유", color: "var(--teal-300)" }, { name: "예민", color: "var(--violet-300)" }, { name: "웃김", color: "var(--blue-300)" },
];
const SEASONS = [
  { id: "spring", label: "봄", g: "linear-gradient(118deg, var(--pink-200), var(--yellow-50))" },
  { id: "summer", label: "여름", g: "linear-gradient(118deg, var(--blue-200), var(--teal-50))" },
  { id: "autumn", label: "가을", g: "linear-gradient(118deg, var(--red-300), var(--yellow-50))" },
  { id: "winter", label: "겨울", g: "linear-gradient(118deg, var(--violet-200), #fff)" },
];
const TEXTURES = [["velvet", "벨벳"], ["glass", "유리"], ["cotton", "솜"], ["knit", "니트"], ["leather", "가죽"], ["jelly", "젤리"], ["powder", "가루"], ["honey", "꿀"], ["water", "물"]];
const YEARS = ["1개월 미만", "3개월", "6개월", "1년", "2년", "3년", "4년", "5년", "7년", "9년", "10년 이상"];

function Block({ id, title, note, children, isNew }: { id: string; title: string; note?: string; children: ReactNode; isNew?: boolean }) {
  return (
    <section className="sys-block" id={id}>
      <header>
        <h2 className="t-heading-03">{title}{isNew ? <span className="new">새로 추가</span> : null}</h2>
        {note ? <p className="t-body-compact-01">{note}</p> : null}
      </header>
      <div className="sys-stage">{children}</div>
    </section>
  );
}
const Row = ({ children, gap = 16, wrap = true }: { children: ReactNode; gap?: number; wrap?: boolean }) => (
  <div style={{ display: "flex", gap, flexWrap: wrap ? "wrap" : "nowrap", alignItems: "center" }}>{children}</div>
);

export default function SystemPage() {
  const [list, setList] = useState(2);
  const [chips, setChips] = useState("친구");
  const [season, setSeason] = useState("autumn");
  const [texture, setTexture] = useState("jelly");
  const [grid, setGrid] = useState(0);
  const [name, setName] = useState("수진");
  const [year, setYear] = useState(0.3);
  const [know, setKnow] = useState<number | null>(4);
  const [sat, setSat] = useState(0.4);
  const [tab, setTab] = useState<"a" | "b" | "c">("a");
  const [tab2, setTab2] = useState<"p" | "q">("p");
  const [opinion, setOpinion] = useState("");
  const [vals, setVals] = useState([10, 25, 5, 25, 10, 15]);
  const [pouring, setPouring] = useState<number | null>(null);
  const [sheet, setSheet] = useState(false);
  const [modal, setModal] = useState(false);
  const [prog, setProg] = useState(90);
  const toast = useToast();
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const total = vals.reduce((a, b) => a + b, 0);
  const pourStart = (i: number) => {
    if (total >= 100) return toast.show("비커가 가득 찼습니다");
    setPouring(i);
    timer.current = setInterval(() => setVals((v) => { if (v.reduce((a, b) => a + b, 0) >= 100) return v; const n = [...v]; n[i] += 1; return n; }), 50);
  };
  const pourEnd = () => { if (timer.current) clearInterval(timer.current); timer.current = null; setPouring(null); };

  return (
    <main className="sys">
      <header className="sys-hero">
        <Logo height={28} className="k-logo" />
        <h1 className="t-heading-05">디자인 시스템</h1>
        <p className="t-body-compact-02">피그마 design system 페이지의 변수·텍스트·효과 스타일과 컴포넌트를 코드로 옮긴 결과입니다. 모든 컴포넌트는 직접 눌러 볼 수 있어요.</p>
      </header>

      <Block id="compare" title="피그마 비교" note="왼쪽이 피그마 시안, 오른쪽이 코드로 그린 화면입니다. 리퀴드 글래스의 굴절은 브라우저에 같은 기능이 없어 블러와 가장자리 빛으로 근사했습니다.">
        <div className="sys-compare">
          <figure><img src="/ref/screen-list.png" alt="피그마 시안: 객관식 질문 화면" /><figcaption>피그마</figcaption></figure>
          <figure>
            <div className="sys-device">
              <div style={{ height: 44 }} />
              <Navigation onBack={() => {}} right="beaker" rightLabel="시험관 랙" />
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 24 }}>
                <div className="k-guide"><AiOrb /><ContextField>상황이 재생되고 있습니다. 직감으로 골라주세요.</ContextField></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div className="t-caption" style={{ display: "flex", gap: 8 }}><span style={{ color: "var(--violet-600)" }}>EXP. 08</span><span style={{ color: "var(--gray-800)" }}>만약에 시뮬레이션</span></div>
                    <h3 className="t-heading-03" style={{ wordBreak: "keep-all" }}>좀비가 창궐한 세상에 떨어졌습니다. 이때 이름님은 어떤 역할일 것 같나요?</h3>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {["리더", "행동 대장", "분위기 메이커", "첫 희생자", "엔딩까지 살아남는 마이웨이 생존자"].map((l, i) => (
                      <Selection key={l} variant="list" no={`0${i + 1}`} label={l} active={list === i} onClick={() => setList(i)} />
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ position: "absolute", left: 16, right: 16, bottom: 34, display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
                <Button block>다음</Button>
                <TextButton size="sm">조금 더 생각해볼게요</TextButton>
              </div>
            </div>
            <figcaption>코드</figcaption>
          </figure>
          <figure><img src="/ref/screen-intro.png" alt="피그마 시안: 실험 인트로 화면" /><figcaption>피그마</figcaption></figure>
          <figure>
            <div className="sys-device">
              <div style={{ height: 44 }} />
              <Navigation onBack={() => {}} right="beaker" rightLabel="시험관 랙" />
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 24 }}>
                <div className="k-guide"><AiOrb /><ContextField>이제 이름님을 색으로 추출해 보겠습니다. 떠오르는 대로 골라 주셔도 괜찮습니다.</ContextField></div>
                <ResearchIntro exp={2} />
              </div>
              <div style={{ position: "absolute", left: 16, right: 16, bottom: 34 }}><Button block>실험 시작</Button></div>
            </div>
            <figcaption>코드</figcaption>
          </figure>
        </div>
      </Block>

      <Block id="color" title="컬러" note="foundation 변수 138개 중 색상. 바탕은 gray/200, 포인트는 violet/600과 gradient-bv.">
        <div className="sys-swatches">
          {["gray", "cool-gray", "blue", "violet", "pink", "teal", "red", "yellow"].map((c) => (
            <div key={c} className="ramp">
              <b className="t-caption">{c}</b>
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((s) => <i key={s} style={{ background: `var(--${c}-${s})` }} title={`${c}/${s}`} />)}
            </div>
          ))}
          <div className="ramp"><b className="t-caption">gradient</b><i style={{ background: "var(--gradient-bv)", flex: 3 }} title="gradient-bv" /><i style={{ background: "var(--gray-900)", flex: 1 }} /><i style={{ background: "var(--gradient-line), var(--gray-900)", flex: 3 }} title="gradient-line" /></div>
        </div>
      </Block>

      <Block id="type" title="타이포그래피" note="IBM Plex Sans KR · 자간 -0.5%">
        <div className="sys-type">
          {[["heading-compact-07", "1년"], ["heading-05", "지원님의 연구 결과"], ["heading-compact-04", "컬러 추출"], ["heading-03", "이름님과 가장 닮은 계절은 언제인가요?"], ["heading-compact-03", "이름님의 캐해 연구에 초대되셨습니다"], ["heading-compact-02", "연구소 설정"], ["body-02", "시작에 앞서 우선 표본 수집을 위해 몇 가지만 여쭙겠습니다."], ["body-compact-01", "시약병을 꾹 누르면 비커가 차오릅니다."], ["caption", "조금 더 생각해볼게요 · 0/12"]].map(([k, s]) => (
            <div key={k}><span className="t-caption">{k}</span><p className={`t-${k}`}>{s}</p></div>
          ))}
        </div>
      </Block>

      <Block id="button" title="버튼" note="primary는 gray/900 캡슐, assistive는 리퀴드 글래스. 누르면 빛이 퍼지고 살짝 눌립니다.">
        <Row><Button>입장하기</Button><Button size="md">다음</Button><Button size="sm">답하기</Button><Button disabled>다음</Button></Row>
        <Row><Button variant="assistive">공유하기</Button><Button variant="assistive" size="md" iconRight="export">내보내기</Button><Button variant="assistive" size="sm">닫기</Button><IconButton icon="minus" label="덜기" /><IconButton icon="copy" size="md" label="복사" /><IconButton icon="minus" size="sm" label="덜기" /><IconButton icon="arrow-right" variant="primary" label="다음" /></Row>
        <Row><TextButton>텍스트 버튼</TextButton><TextButton size="sm">조금 더 생각해볼게요</TextButton><TextButton disabled>비활성</TextButton></Row>
        <div style={{ width: 343 }}><Button block holdMs={1200} onClick={() => toast.show("표본을 부었습니다")}>꾹 눌러 표본 붓기 (1.2초)</Button></div>
      </Block>

      <Block id="nav" title="내비게이션 · 안내 AI">
        <div style={{ width: 375, borderRadius: 16, overflow: "hidden" }}><Navigation onBack={() => {}} right="beaker" rightLabel="시험관 랙" badge={2} /></div>
        <div style={{ width: 375, borderRadius: 16, overflow: "hidden" }}><Navigation variant="sub" title="연구소 설정" onBack={() => {}} /></div>
        <Row><AiOrb size={24} /><AiOrb /><AiOrb speaking /><span className="t-caption" style={{ color: "var(--gray-600)" }}>24 · 36 · 말하는 중</span></Row>
        <div style={{ width: 343 }}><Guide key={list} text="수진님, 반갑습니다. 사원증을 준비하고 있습니다." flash={list} /></div>
      </Block>

      <Block id="selection" title="선택지" note="list · grid · multi · image · bento. 선택하면 유리가 밝아지고 라디오가 차오릅니다.">
        <div style={{ width: 343, display: "flex", flexDirection: "column", gap: 16 }}>
          {["공개해도 괜찮아요", "이름님만 볼 수 있게 해주세요", "익명으로 남길게요"].map((l, i) => <Selection key={l} variant="list" no={`0${i + 1}`} label={l} active={list === i} onClick={() => setList(i)} />)}
        </div>
        <div style={{ width: 343, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {["산", "바다", "도시", "집"].map((l, i) => <Selection key={l} variant="grid" no={`0${i + 1}`} label={l} active={grid === i} onClick={() => setGrid(i)} />)}
        </div>
        <div style={{ width: 343, display: "flex", flexWrap: "wrap", gap: 12 }}>
          {["가족", "친구", "회사·알바", "동아리·모임", "온라인 친구", "연인", "기타"].map((l) => <Selection key={l} variant="multi" label={l} active={chips === l} onClick={() => setChips(l)} />)}
        </div>
        <div style={{ width: 343, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {SEASONS.map((s) => <Selection key={s.id} variant="image" label={s.label} imageStyle={{ background: s.g }} active={season === s.id} onClick={() => setSeason(s.id)} />)}
        </div>
        <div style={{ width: 343, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {TEXTURES.map(([id, l]) => <Selection key={id} variant="image" label={l} image={`/img/texture/${id}.jpg`} active={texture === id} onClick={() => setTexture(id)} />)}
        </div>
        <Row><div style={{ width: 128 }}><Selection variant="bento" no="01" label="텍스트" active={grid === 0} onClick={() => setGrid(0)} image="/img/texture/water.jpg" /></div><div style={{ width: 128 }}><Selection variant="bento" no="02" label="텍스트" active={grid === 1} onClick={() => setGrid(1)} image="/img/texture/honey.jpg" /></div><Radio /><Radio on /></Row>
      </Block>

      <Block id="input" title="입력" note="텍스트 필드 · 바 · range-stick · 시험관 척도">
        <div style={{ width: 343 }}><TextField value={name} onChange={setName} placeholder="닉네임 또는 이름" label="이름" /></div>
        <div style={{ width: 343 }}>
          <p className="t-heading-compact-07">{YEARS[Math.round(year * 10)]}</p>
          <RangeSticks active={Math.round(year * 10)} />
          <div style={{ height: 24 }} />
          <Bar value={year} onChange={setYear} steps={10} label="알고 지낸 기간" />
          <BarEnds left="1개월 미만" right="10년 이상" />
        </div>
        <div style={{ width: 343 }}>
          <ScaleTubes value={know} onChange={setKnow} />
          <div className="k-bar-ends" style={{ marginTop: 24 }}><span>이름만 아는 사이</span><span>너보다 내가 더 잘 앎</span></div>
        </div>
        <div style={{ width: 343 }}>
          <p className="t-heading-compact-04" style={{ textAlign: "center" }}>{Math.round(sat * 100)}<span className="t-body-02" style={{ color: "var(--gray-700)" }}>%</span></p>
          <div style={{ height: 16 }} />
          <Bar value={sat} onChange={setSat} label="채도" light nofill track="linear-gradient(90deg, rgba(169,156,240,0), var(--violet-400))" />
          <BarEnds left="무채색" right="선명함" />
        </div>
      </Block>

      <Block id="ingredient" title="성분표" note="시약병을 꾹 누르면 병이 기울고 비커에 층이 쌓입니다.">
        <div style={{ width: 343, display: "flex", gap: 24 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center" }}>
            <Beaker layers={INGREDIENTS.map((g, i) => ({ ...g, value: vals[i] }))} />
            <div style={{ textAlign: "center" }}><p className="t-caption" style={{ color: "var(--gray-600)" }}>남은 용량</p><p className="t-heading-compact-03">{100 - total}%</p></div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 16 }}>
            {INGREDIENTS.map((g, i) => <IngredientOption key={g.name} name={g.name} color={g.color} pct={vals[i]} pouring={pouring === i} onPourStart={() => pourStart(i)} onPourEnd={pourEnd} onMinus={() => setVals((v) => v.map((x, k) => (k === i ? Math.max(0, x - 5) : x)))} />)}
          </div>
        </div>
      </Block>

      <Block id="misc" title="태그 · 탭 · 진행 바 · 아이콘">
        <Row><Tag>친구</Tag><Tag size="sm">이해도 4/5</Tag><span style={{ background: "var(--gray-900)", padding: 12, borderRadius: 16, display: "flex", gap: 8 }}><Tag color="glass" onDark>3문항</Tag><Tag color="glass" size="sm" onDark>약 40초 소요</Tag></span><Tag color="glass">글래스</Tag></Row>
        <Row><div style={{ background: "var(--gray-300)", borderRadius: 1000 }}><Tabs variant="primary" value={tab} onChange={setTab} items={[{ id: "a", label: "종합" }, { id: "b", label: "연구원별" }, { id: "c", label: "나 vs 친구들" }]} /></div><Tabs variant="assistive" value={tab2} onChange={setTab2} items={[{ id: "p", label: "사람별" }, { id: "q", label: "문항별" }]} /></Row>
        <div style={{ width: 327 }}><ProgressBar value={prog} /></div>
        <Row><Button size="sm" variant="assistive" onClick={() => setProg((p) => (p >= 100 ? 10 : p + 15 > 100 ? 100 : p + 15))}>진행률 올리기</Button></Row>
        <Row gap={20}>{ICONS.map((n) => <span key={n} style={{ display: "grid", justifyItems: "center", gap: 6, color: "var(--gray-700)" }}><Icon name={n} /><span className="t-caption">{n}</span></span>)}</Row>
      </Block>

      <Block id="idcard" title="사원증" note="마우스를 올리거나 기울이면 유리처럼 빛이 지나갑니다.">
        <div style={{ paddingTop: 50 }}><IdCard name={name || "이름"} tags={[chips, YEARS[Math.round(year * 10)], know ? `이해도 ${know}/5` : ""].filter(Boolean)} /></div>
      </Block>

      <Block id="intro" title="실험 인트로 카드" note="11종. 오브젝트가 천천히 떠 있고, 손가락을 따라 살짝 움직입니다.">
        <div className="sys-intros">{EXPERIMENTS.map((e) => <ResearchIntro key={e.no} exp={e} style={{ width: 343 }} />)}</div>
      </Block>

      <Block id="opinion" title="연구 소견서">
        <div style={{ width: 343 }}><ResearchOpinion subject="지원" researcher={name || "수진"} value={opinion} onChange={setOpinion} /></div>
      </Block>

      <Block id="overlay" title="바텀 시트 · 모달 · 토스트" isNew note="시안에 없어 같은 문법으로 새로 만든 컴포넌트입니다. 시트는 아래로 끌어서 닫을 수 있어요.">
        <div className="sys-device short">
          <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12, alignItems: "flex-start" }}>
            <Button size="md" onClick={() => setSheet(true)}>바텀 시트 열기</Button>
            <Button size="md" variant="assistive" onClick={() => setModal(true)}>모달 열기</Button>
            <Button size="md" variant="assistive" onClick={() => toast.show("기록되었습니다")}>토스트 띄우기</Button>
          </div>
          <BottomSheet open={sheet} onClose={() => setSheet(false)} title="시험관 랙" desc="잠시 넘겨 둔 문항입니다. 마지막 소견 전에 다시 보여 드립니다."
            actions={<><Button block onClick={() => setSheet(false)}>이어서 하기</Button><TextButton size="sm" onClick={() => setSheet(false)}>닫기</TextButton></>}>
            <Selection variant="list" no="03" label="이름님을 촉각으로 표현한다면?" />
            <Selection variant="list" no="05" label="계획형과 즉흥형 사이 어디쯤일까요?" />
          </BottomSheet>
          <Modal open={modal} onClose={() => setModal(false)} title="처음부터 다시 할까요?" desc="지금까지 남긴 표본이 모두 지워집니다."
            actions={<><Button size="md" variant="assistive" onClick={() => setModal(false)}>취소</Button><Button size="md" onClick={() => setModal(false)}>다시 하기</Button></>} />
          <Toast message={toast.message} />
        </div>
      </Block>
    </main>
  );
}
