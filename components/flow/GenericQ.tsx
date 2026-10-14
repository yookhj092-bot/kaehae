"use client";

/* 답변 형식별 공용 문항 화면. 시안의 선택지·입력·막대 컴포넌트를 그대로 조합한다. */

import { useState, type CSSProperties } from "react";
import { motion, useMotionValue, useTransform } from "motion/react";
import { Bar, BarEnds, RangeSticks, ScaleTubes, Selection, TextField, buzz, cx } from "@/components/ui";
import { pad2 } from "@/lib/experiments";
import type { QDef } from "./questions";
import { BAD_MSG, anyBad, isBad } from "@/lib/moderation";

type Props = { def: QDef; value: unknown; onChange: (v: unknown) => void; name: string; reveal?: boolean };

export function GenericQ({ def, value, onChange, name, reveal }: Props) {
  const mark = (i: number) => (reveal && def.self === i ? "is-answer" : undefined);
  switch (def.kind) {
    case "choice":
      return (
        <div className={cx("stack-16 stagger", reveal && "revealed")}>
          {def.opts!.map((l, i) => (
            <div key={l} className={mark(i)}><Selection variant="list" no={pad2(i + 1)} label={l} active={value === i} onClick={() => !reveal && onChange(i)} /></div>
          ))}
        </div>
      );
    case "grid":
      return (
        <div className={cx(def.cols === 2 ? "grid-2" : "grid-3", "stagger", reveal && "revealed")}>
          {def.opts!.map((l, i) => (
            <button key={l} type="button" aria-pressed={value === i} className={cx("tile glass pressable", value === i && "is-active", mark(i))} onClick={() => { if (reveal) return; buzz(8); onChange(i); }}>
              {def.swatch ? <i className="sw" style={{ background: def.swatch[i] }} /> : <span className="em" aria-hidden="true">{def.emoji?.[i]}</span>}
              <span className="tx">{l}</span>
            </button>
          ))}
        </div>
      );
    case "chips":
      return <Chips def={def} value={Array.isArray(value) ? (value as string[]) : []} onChange={onChange} />;
    case "text":
      return (<>
        <form onSubmit={(e) => { e.preventDefault(); (document.activeElement as HTMLElement)?.blur(); }}>
          <TextField value={typeof value === "string" ? value : ""} onChange={onChange} max={def.maxLen ?? 40} placeholder={def.placeholder?.replaceAll("{S}", name)} label={def.title} />
        </form>
        {isBad(value) ? <p className="field-warn" role="alert">{BAD_MSG}</p> : null}
      </>);
    case "blank2": {
      const v = Array.isArray(value) ? (value as string[]) : ["", ""];
      const put = (k: number, s: string) => onChange(k === 0 ? [s.slice(0, 14), v[1]] : [v[0], s.slice(0, 14)]);
      return (
        <div className="blank2 glass">
          <span>{def.tpl![0]}</span>
          <input value={v[0]} onChange={(e) => put(0, e.target.value)} placeholder="차가운 사람" aria-label="첫인상" enterKeyHint="next" style={{ width: `${Math.max(6, v[0].length + 1.5)}em` }} />
          <span>{def.tpl![1]}</span>
          <input value={v[1]} onChange={(e) => put(1, e.target.value)} placeholder="웃음 많은 사람" aria-label="지금" enterKeyHint="done" style={{ width: `${Math.max(7, v[1].length + 1.5)}em` }} />
          <span>이었어요.</span>
          {anyBad(v) ? <p className="field-warn" role="alert">{BAD_MSG}</p> : null}
        </div>
      );
    }
    case "bipolar": {
      const v = typeof value === "number" ? value : 0.5;
      const lean = Math.round(Math.abs(v - 0.5) * 200);
      return (
        <div>
          <div className={cx("bipolar", typeof value !== "number" && "idle")} style={{ "--v": v } as CSSProperties}>
            <span className="l">{def.ends![0]}</span>
            <span className="r">{def.ends![1]}</span>
          </div>
          <p className="range-val sm">{lean < 6 ? "딱 중간" : `${v < 0.5 ? "왼쪽" : "오른쪽"}으로 ${lean}%`}</p>
          <div style={{ height: 20 }} />
          <Bar value={v} onChange={onChange} label={def.title} nofill />
          <BarEnds left={def.ends![0]} right={def.ends![1]} />
        </div>
      );
    }
    case "scale":
      return (
        <div style={{ paddingTop: 16 }}>
          <ScaleTubes value={typeof value === "number" ? value : null} onChange={onChange} idle={typeof value !== "number"} />
          <div className="k-bar-ends" style={{ marginTop: 28 }}><span>{def.ends![0]}</span><span>{def.ends![1]}</span></div>
        </div>
      );
    case "dial": {
      const n = typeof value === "number" ? value : 50;
      const step = (d: number) => { buzz(4); onChange(Math.max(0, Math.min(99, n + d))); };
      return (
        <div>
          <div className="dial">
            <button type="button" className="glass pressable" aria-label="1 줄이기" onClick={() => step(-1)}>−</button>
            <p className={cx("range-val", typeof value !== "number" && "ghost")} key={n}>{n}</p>
            <button type="button" className="glass pressable" aria-label="1 늘리기" onClick={() => step(1)}>+</button>
          </div>
          <RangeSticks active={Math.round(n / 9.9)} idle={typeof value !== "number"} />
          <div style={{ height: 24 }} />
          <Bar value={n / 99} onChange={(v) => onChange(Math.round(v * 99))} steps={99} label={def.title} />
          <BarEnds left="0" right="99" />
        </div>
      );
    }
    case "ox":
      return <Swipe def={def} value={typeof value === "number" ? value : null} onChange={onChange} reveal={reveal} />;
  }
}

/* 칩 다중 선택 (+ 직접 입력) */
function Chips({ def, value, onChange }: { def: QDef; value: string[]; onChange: (v: unknown) => void }) {
  const [draft, setDraft] = useState("");
  const max = def.max ?? 99;
  const extra = value.filter((x) => !def.opts!.includes(x));
  const toggle = (l: string) => {
    if (value.includes(l)) return onChange(value.filter((x) => x !== l));
    if (max === 1) return onChange([l]);
    if (value.length >= max) return buzz([6, 30, 6]);
    onChange([...value, l]);
  };
  const add = () => {
    const t = draft.trim();
    if (!t || t.length > 10 || value.includes(t) || isBad(t)) return;
    if (max === 1) onChange([t]); else if (value.length < max) onChange([...value, t]); else return buzz([6, 30, 6]);
    setDraft("");
  };
  return (
    <div className="stack-16">
      <div className="chips-wrap stagger">
        {[...def.opts!, ...extra].map((l) => <Selection key={l} variant="multi" label={l} active={value.includes(l)} onClick={() => toggle(l)} />)}
      </div>
      {max > 1 ? <p className="chips-count" aria-live="polite"><b>{value.length}</b> / {max}</p> : null}
      {def.custom ? (
        <form className="chips-add" onSubmit={(e) => { e.preventDefault(); add(); }}>
          <TextField value={draft} onChange={setDraft} max={10} placeholder="직접 입력" label="직접 입력" />
          <button type="submit" className="glass pressable" disabled={!draft.trim() || draft.length > 10 || isBad(draft)}>추가</button>
        </form>
      ) : null}
      {def.custom && isBad(draft) ? <p className="field-warn" role="alert" style={{ marginTop: -8 }}>{BAD_MSG}</p> : null}
    </div>
  );
}

/* 둘 중 하나: 카드를 좌우로 밀거나 아래 버튼을 누른다 */
function Swipe({ def, value, onChange, reveal }: { def: QDef; value: number | null; onChange: (v: unknown) => void; reveal?: boolean }) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-140, 140], [-12, 12]);
  const pick = (i: number) => { if (reveal) return; buzz(10); onChange(i); };
  return (
    <div className="swipe">
      <div className="swipe-stage">
        <motion.div className={cx("swipe-card glass", value == null ? "idle" : "picked")} style={{ x, rotate }} drag={reveal ? false : "x"} dragSnapToOrigin dragElastic={0.6} dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(_, info) => { if (info.offset.x < -70) pick(0); else if (info.offset.x > 70) pick(1); }}>
          {value == null ? <span className="hint">← 좌우로 밀어 주세요 →</span> : <span className="pick" key={value}>{def.opts![value]}</span>}
        </motion.div>
      </div>
      <div className={cx("grid-2", reveal && "revealed")}>
        {def.opts!.map((l, i) => (
          <div key={l} className={reveal && def.self === i ? "is-answer" : undefined}><Selection variant="multi" label={l} active={value === i} onClick={() => pick(i)} style={{ width: "100%" }} /></div>
        ))}
      </div>
    </div>
  );
}
