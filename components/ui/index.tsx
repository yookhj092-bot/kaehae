"use client";

/* KAEHAE UI 컴포넌트 — 피그마 design system 페이지의 컴포넌트를 코드로 옮긴 것.
   스타일은 app/styles/ui.css, 토큰은 app/styles/tokens.css. */

import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Icon, Logo, type IconName } from "./Icon";
import { expById, pad2, type Experiment } from "@/lib/experiments";

export { Icon, Logo };
export type { IconName };

export const cx = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(" ");
export const buzz = (p: number | number[]) => {
  try {
    navigator.vibrate?.(p);
  } catch {}
};

/* ---------------------------------------------------------------- 버튼 */
type BtnProps = {
  variant?: "primary" | "assistive";
  size?: "lg" | "md" | "sm";
  block?: boolean;
  disabled?: boolean;
  iconLeft?: IconName;
  iconRight?: IconName;
  children?: ReactNode;
  onClick?: () => void;
  /** 길게 눌러야 실행되는 버튼. ms 동안 누르면 onClick이 불린다. */
  holdMs?: number;
  onHoldProgress?: (p: number) => void;
  className?: string;
  "aria-label"?: string;
};

/** 클립보드에 복사. 보안 연결(https)이 아니면 clipboard API가 없어서 예전 방식으로 대신한다. */
export async function copyText(text: string): Promise<boolean> {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); return true; } } catch {}
  try {
    const ta = document.createElement("textarea");
    ta.value = text; ta.readOnly = true;
    ta.style.cssText = "position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;font-size:16px";
    document.body.appendChild(ta);
    ta.focus({ preventScroll: true }); ta.select(); ta.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  } catch { return false; }
}

export function Button({ variant = "primary", size = "lg", block, disabled, iconLeft, iconRight, children, onClick, holdMs, onHoldProgress, className, ...rest }: BtnProps) {
  const ref = useRef<HTMLButtonElement>(null);
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const hold = useRef({ t0: 0, raf: 0, done: false });

  const ripple = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const id = Date.now();
    setRipples((s) => [...s, { id, x: e.clientX - r.left, y: e.clientY - r.top }]);
    setTimeout(() => setRipples((s) => s.filter((x) => x.id !== id)), 650);
  };
  const setP = (p: number) => {
    ref.current?.style.setProperty("--p", String(p));
    onHoldProgress?.(p);
  };
  const startHold = () => {
    if (!holdMs || disabled || hold.current.t0 || hold.current.done) return;
    hold.current.t0 = performance.now();
    let last = 0;
    const step = (now: number) => {
      const k = Math.min(1, (now - hold.current.t0) / holdMs);
      setP(k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
      if (k - last > 0.2) {
        last = k;
        buzz(4 + Math.round(k * 16));
      }
      if (k >= 1) {
        hold.current.t0 = 0;
        hold.current.done = true;
        onClick?.();
        return;
      }
      hold.current.raf = requestAnimationFrame(step);
    };
    hold.current.raf = requestAnimationFrame(step);
  };
  const cancelHold = () => {
    if (!hold.current.t0) return;
    cancelAnimationFrame(hold.current.raf);
    hold.current.t0 = 0;
    setP(0);
  };
  useEffect(() => () => cancelAnimationFrame(hold.current.raf), []);

  return (
    <button
      ref={ref}
      type="button"
      className={cx("k-btn pressable", variant, size !== "lg" && size, block && "block", variant === "assistive" && !disabled && "glass", className)}
      disabled={disabled}
      onPointerDown={(e) => {
        ripple(e);
        if (holdMs) {
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {}
          startHold();
        }
      }}
      onPointerUp={cancelHold}
      onPointerCancel={cancelHold}
      onKeyDown={(e) => {
        if (holdMs && (e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          startHold();
        }
      }}
      onKeyUp={cancelHold}
      onContextMenu={(e) => holdMs && e.preventDefault()}
      onClick={() => {
        if (!holdMs) {
          buzz(8);
          onClick?.();
        }
      }}
      style={holdMs ? { touchAction: "none" } : undefined}
      {...rest}
    >
      {holdMs ? <span className="hold-fill" /> : null}
      {ripples.map((r) => (
        <span key={r.id} className="ripple" style={{ left: r.x, top: r.y }} />
      ))}
      <span className="label">
        {iconLeft ? <Icon name={iconLeft} size={size === "sm" ? 20 : 24} /> : null}
        {children}
        {iconRight ? <Icon name={iconRight} size={size === "sm" ? 20 : 24} /> : null}
      </span>
    </button>
  );
}

export function IconButton({ icon, variant = "assistive", size = "lg", disabled, onClick, label, onPointerDown }: { icon: IconName; variant?: "primary" | "assistive"; size?: "lg" | "md" | "sm"; disabled?: boolean; onClick?: () => void; label: string; onPointerDown?: () => void }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick} onPointerDown={onPointerDown} className={cx("k-btn k-iconbtn pressable", variant, size !== "lg" && size, variant === "assistive" && !disabled && "glass")}>
      <Icon name={icon} size={size === "sm" ? 20 : 24} />
    </button>
  );
}

export function TextButton({ children, size = "md", disabled, onClick }: { children: ReactNode; size?: "md" | "sm"; disabled?: boolean; onClick?: () => void }) {
  return (
    <button type="button" className={cx("k-textbtn pressable", size === "sm" && "sm")} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}

/* ---------------------------------------------------------------- 내비게이션 */
export function Navigation({ variant = "home", title, onBack, right, onRight, rightLabel, badge }: { variant?: "home" | "sub"; title?: string; onBack?: () => void; right?: IconName; onRight?: () => void; rightLabel?: string; badge?: number }) {
  return (
    <nav className="k-nav blur">
      {onBack ? (
        <button type="button" className="slot" aria-label="이전" onClick={onBack}>
          <Icon name="toward" />
        </button>
      ) : (
        <span className="slot" />
      )}
      {variant === "home" ? <Logo className="k-logo" /> : <span className="title">{title}</span>}
      {right ? (
        <button type="button" className="slot" aria-label={rightLabel ?? ""} onClick={onRight} data-nav-right style={{ position: "relative" }}>
          <Icon name={right} />
          <AnimatePresence>
            {badge ? (
              <motion.span className="badge" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 500, damping: 18 }} key={badge}>
                {badge}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </button>
      ) : (
        <span className="slot" />
      )}
    </nav>
  );
}

/* ---------------------------------------------------------------- 안내 AI */
export function AiOrb({ size = 36, speaking, flash, className }: { size?: 24 | 36; speaking?: boolean; flash?: number; className?: string }) {
  const [f, setF] = useState(false);
  useEffect(() => {
    if (!flash) return;
    setF(true);
    const t = setTimeout(() => setF(false), 700);
    return () => clearTimeout(t);
  }, [flash]);
  return <span className={cx("k-ai", size === 24 && "s24", speaking && "speaking", f && "flash", className)} aria-hidden="true" />;
}

/** 글자가 하나씩 찍히는 텍스트 */
export function useTyped(text: string, speed = 26) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (!text) return;
    const reduce = typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setN(text.length);
      return;
    }
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setN(i);
      if (i >= text.length) clearInterval(id);
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return { shown: text.slice(0, n), done: n >= text.length };
}

export function ContextField({ children, typing }: { children: string; typing?: boolean }) {
  const { shown, done } = useTyped(typing ? children : "");
  return (
    <p className="k-context" aria-live="polite">
      {typing ? shown : children}
      {typing && !done ? <span className="caret" /> : null}
    </p>
  );
}

export function Guide({ text, flash }: { text: string; flash?: number }) {
  const { shown, done } = useTyped(text);
  return (
    <div className="k-guide">
      <AiOrb speaking={!done} flash={flash} />
      <p className="k-context" aria-live="polite" style={{ minHeight: 80 }}>
        {shown}
        {!done ? <span className="caret" /> : null}
      </p>
    </div>
  );
}

/* ---------------------------------------------------------------- 라디오 · 진행 바 · 태그 · 탭 */
export const Radio = ({ on }: { on?: boolean }) => <span className={cx("k-radio blur", on && "on")} aria-hidden="true" />;

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="k-progress" role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <div className="track">
        <i style={{ width: `${value}%` }} />
      </div>
      <span className="val">{Math.round(value)}%</span>
    </div>
  );
}

export function Tag({ children, color = "gray", size = "md", onDark }: { children: ReactNode; color?: "gray" | "glass"; size?: "md" | "sm"; onDark?: boolean }) {
  return <span className={cx("k-tag", size === "sm" && "sm", color === "glass" && "glass-tag blur", onDark && "on-dark")}>{children}</span>;
}

export function Tabs<T extends string>({ items, value, onChange, variant = "primary" }: { items: { id: T; label: string }[]; value: T; onChange: (v: T) => void; variant?: "primary" | "assistive" }) {
  return (
    <div className={cx("k-tabs", variant)} role="tablist">
      {items.map((it) => (
        <button key={it.id} type="button" role="tab" aria-selected={value === it.id} className={cx("k-tab pressable", variant, value === it.id && "on")} onClick={() => { buzz(6); onChange(it.id); }}>
          {it.label}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- 선택지 */
type SelProps = { variant: "list" | "grid" | "bento" | "multi" | "image"; active?: boolean; no?: string; label: string; image?: string; imageStyle?: CSSProperties; onClick?: () => void; style?: CSSProperties };

export function Selection({ variant, active, no, label, image, imageStyle, onClick, style }: SelProps) {
  const common = { type: "button" as const, "aria-pressed": !!active, onClick: () => { buzz(8); onClick?.(); }, style };
  if (variant === "multi")
    return (
      <button {...common} className={cx("k-sel multi glass pressable", active && "is-active")}>
        <span className="tx">{label}</span>
      </button>
    );
  if (variant === "image")
    return (
      <button {...common} className={cx("k-sel image pressable", active && "is-active")}>
        <span className="img" style={{ ...(image ? { backgroundImage: `url(${image})` } : null), ...imageStyle }}>
          <Radio on={active} />
        </span>
        <span className="cap glass">
          <span className="tx">{label}</span>
        </span>
      </button>
    );
  if (variant === "bento")
    return (
      <button {...common} className={cx("k-sel bento glass pressable", active && "is-active")}>
        <Radio on={active} />
        <span className="text">
          <span className="tx">{label}</span>
          {no ? <span className="no">{no}</span> : null}
        </span>
        <span className="thumb" style={image ? { backgroundImage: `url(${image})` } : undefined} />
      </button>
    );
  return (
    <button {...common} className={cx("k-sel glass pressable", variant, active && "is-active")}>
      <span className="text">
        {no ? <span className="no">{no}</span> : null}
        <span className="tx">{label}</span>
      </span>
      <Radio on={active} />
    </button>
  );
}

/* ---------------------------------------------------------------- 텍스트 필드 */
export function TextField({ value, onChange, max = 12, placeholder, label, autoFocus }: { value: string; onChange: (v: string) => void; max?: number; placeholder?: string; label: string; autoFocus?: boolean }) {
  const over = value.length > max;
  return (
    <label className={cx("k-field glass", value && "filled", over && "error")}>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={label} aria-invalid={over} autoFocus={autoFocus} enterKeyHint="next" />
      <span className="cnt">
        {value.length}/{max}
      </span>
    </label>
  );
}

/* ---------------------------------------------------------------- 바 (슬라이더) */
export function Bar({ value, onChange, steps, label, light, nofill, track, knob }: { value: number; onChange: (v: number) => void; steps?: number; label: string; light?: boolean; nofill?: boolean; track?: string; knob?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState(false);
  const last = useRef(-1);
  const snap = useCallback((v: number) => { v = Math.max(0, Math.min(1, v)); return steps ? Math.round(v * steps) / steps : v; }, [steps]);
  const from = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const v = snap((e.clientX - r.left - 12) / (r.width - 24));
    const tick = Math.round(v * (steps ?? 20));
    if (tick !== last.current) { last.current = tick; buzz(3); }
    onChange(v);
  };
  return (
    <div
      ref={ref}
      className={cx("k-bar", drag && "drag", light && "light", nofill && "nofill")}
      style={{ "--v": value, ...(track ? { "--track": track } : null), ...(knob ? { "--knob-a": `color-mix(in srgb, ${knob}, #fff 45%)`, "--knob-b": knob } : null) } as CSSProperties}
      role="slider" tabIndex={0} aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value * 100)}
      onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} setDrag(true); from(e); }}
      onPointerMove={(e) => drag && from(e)}
      onPointerUp={() => setDrag(false)}
      onPointerCancel={() => setDrag(false)}
      onKeyDown={(e) => { const d = steps ? 1 / steps : 0.05; if (e.key === "ArrowRight") onChange(snap(value + d)); if (e.key === "ArrowLeft") onChange(snap(value - d)); }}
    >
      <span className="bg" />
      <span className="fill" />
      <span className="knob" />
    </div>
  );
}
export const BarEnds = ({ left, right }: { left: string; right: string }) => (
  <div className="k-bar-ends"><span>{left}</span><span>{right}</span></div>
);

/* ---------------------------------------------------------------- range-stick */
export function RangeSticks({ count = 11, active, idle }: { count?: number; active: number; idle?: boolean }) {
  const prev = useRef(active);
  const popped = active > prev.current ? active : -1;
  useEffect(() => { prev.current = active; }, [active]);
  return (
    <div className={cx("k-sticks", idle && "idle")} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <i key={i} className={cx(i <= active && "on", i === popped && "pop")} style={{ height: `${20 + (i * 80) / (count - 1)}%`, "--i": i } as CSSProperties} />
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- 시험관 척도 */
const TUBE_LEVELS = [12, 36, 50, 76, 96];
export function ScaleTubes({ value, onChange, idle }: { value: number | null; onChange: (v: number) => void; idle?: boolean }) {
  return (
    <div className={cx("k-tubes", idle && "idle")} role="radiogroup">
      {TUBE_LEVELS.map((lv, i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i + 1} aria-label={`${i + 1}점`} className={cx("k-tube pressable", value === i + 1 && "on")} onClick={() => { buzz(8); onChange(i + 1); }}>
          <span className="glassware" style={{ "--lv": `${lv}%`, "--i": i } as CSSProperties}><i /></span>
          {i + 1}
        </button>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- 성분 옵션 · 비커 */
export function IngredientOption({ name, color, pct, pouring, hint, onPourStart, onPourEnd, onMinus }: { name: string; color: string; pct: number; pouring?: boolean; hint?: boolean; onPourStart: () => void; onPourEnd: () => void; onMinus: () => void }) {
  return (
    <div className={cx("k-ingredient", pouring && "pouring", hint && "hint")}>
      <button type="button" className="opt glass pressable" aria-label={`${name} 붓기`}
        onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} onPourStart(); }}
        onPointerUp={onPourEnd} onPointerCancel={onPourEnd}
        onKeyDown={(e) => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); onPourStart(); } }}
        onKeyUp={onPourEnd}
        onContextMenu={(e) => e.preventDefault()}>
        <span className="ttl"><span className="bottle" style={{ "--c": color } as CSSProperties}><i /></span>{name}</span>
        <span className="pct">{pct}%</span>
      </button>
      <IconButton icon="minus" size="sm" label={`${name} 덜기`} disabled={pct === 0} onClick={onMinus} />
    </div>
  );
}

export function Beaker({ layers }: { layers: { name: string; color: string; value: number }[] }) {
  return (
    <div className="k-beaker blur" aria-hidden="true">
      {layers.map((l) => (
        <div key={l.name} className="layer" style={{ height: `${l.value}%`, "--c": l.color } as CSSProperties}>
          {l.value >= 6 ? `${l.name} ${l.value}` : ""}
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------- 사원증 */
export function IdCard({ name, tags }: { name: string; tags: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  /* 기울이면 유리처럼 빛이 지나간다 */
  const onMove = (e: React.PointerEvent) => {
    const el = ref.current!;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 10}deg)`;
    el.style.setProperty("--sheen", `${x * 120}%`);
  };
  const reset = () => { const el = ref.current!; el.style.transform = ""; el.style.setProperty("--sheen", "-60%"); };
  return (
    <div ref={ref} className="k-idcard glass" onPointerMove={onMove} onPointerLeave={reset} style={{ transition: "transform .3s var(--out)" }}>
      <span className="clip" />
      <div className="inner">
        <div className="mesh" />
        <div>
          <div className="name">{name}</div>
          <div className="tags" style={{ marginTop: 16 }}>
            <AnimatePresence>
              {tags.map((t) => (
                <motion.span key={t} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ type: "spring", stiffness: 420, damping: 22 }}>
                  <Tag size="sm">{t}</Tag>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- 실험 인트로 카드 */
export function ResearchIntro({ exp, name = "이름", style }: { exp: Experiment | number; name?: string; style?: CSSProperties }) {
  const e = typeof exp === "number" ? expById(exp) : exp;
  const ref = useRef<HTMLDivElement>(null);
  /* 손가락을 따라 오브젝트가 살짝 따라온다 */
  const onMove = (ev: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width - 0.5, y = (ev.clientY - r.top) / r.height - 0.5;
    ref.current!.style.setProperty("--tx", `${x * 16}px`);
    ref.current!.style.setProperty("--ty", `${y * 16}px`);
    ref.current!.style.setProperty("--rot", `${x * 8}deg`);
  };
  return (
    <section ref={ref} className="k-intro" style={style} onPointerMove={onMove}>
      <div className="sub-title"><span>Experiment</span><span>{pad2(e.no)}</span></div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="obj" src={`/img/research/${pad2(e.no)}.png`} alt="" width={196} height={196} draggable={false} />
      <div>
        <h2>{e.title}</h2>
        <p className="desc">{e.desc.replace("{name}", name)}</p>
        <div className="tags">
          <Tag color="glass" onDark>{e.count}문항</Tag>
          <Tag color="glass" onDark>약 {e.seconds}초 소요</Tag>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------------- 연구 소견서 */
export function ResearchOpinion({ subject, researcher, value, onChange, no = 4, max = 100, placeholder = "예: 말은 없는데 제일 웃긴 사람" }: { subject: string; researcher: string; value: string; onChange: (v: string) => void; no?: number; max?: number; placeholder?: string }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [signed, setSigned] = useState(false);
  const drawing = useRef(false);
  useEffect(() => {
    const c = cv.current!;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr); ctx.lineWidth = 1.8; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = "#212121";
  }, []);
  const pt = (e: React.PointerEvent) => { const r = cv.current!.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * cv.current!.clientWidth, ((e.clientY - r.top) / r.height) * cv.current!.clientHeight] as const; };
  return (
    <div className={cx("k-opinion glass", value && "is-active")}>
      <div className="hd">연구 소견서<span>No.{no}</span></div>
      <div className="who"><span>연구 대상<b>{subject}</b></span><span>연구원<b>{researcher}</b></span></div>
      <textarea value={value} maxLength={max} placeholder={placeholder} aria-label="한 줄 소견" onChange={(e) => onChange(e.target.value)} />
      <div className="under">
        <span className="n">{value.length}/{max}</span>
        <div className={cx("sign", signed && "signed")}>
          <canvas ref={cv} aria-label="서명란"
            onPointerDown={(e) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} drawing.current = true; setSigned(true); const ctx = cv.current!.getContext("2d")!; ctx.beginPath(); ctx.moveTo(...pt(e)); }}
            onPointerMove={(e) => { if (!drawing.current) return; const ctx = cv.current!.getContext("2d")!; ctx.lineTo(...pt(e)); ctx.stroke(); }}
            onPointerUp={() => (drawing.current = false)} onPointerCancel={() => (drawing.current = false)} />
          <span>여기에 서명해주세요</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- 새로 추가: 바텀 시트 · 모달 · 토스트 */
const sheetSpring = { type: "spring" as const, stiffness: 380, damping: 36 };

export function BottomSheet({ open, onClose, title, desc, children, actions }: { open: boolean; onClose: () => void; title: string; desc?: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="k-overlay" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div className="k-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div className="k-sheet" initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={sheetSpring}
            drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => { if (info.offset.y > 110 || info.velocity.y > 600) onClose(); }}>
            <div className="grab" />
            <h3>{title}</h3>
            {desc ? <p className="desc">{desc}</p> : null}
            {children ? <div className="body">{children}</div> : null}
            {actions ? <div className="actions">{actions}</div> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

export function Modal({ open, onClose, title, desc, actions }: { open: boolean; onClose: () => void; title: string; desc?: string; actions?: ReactNode }) {
  return (
    <AnimatePresence>
      {open ? (
        <div className="k-overlay" role="alertdialog" aria-modal="true" aria-label={title}>
          <motion.div className="k-scrim" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div className="k-modal" initial={{ opacity: 0, scale: 0.9, y: "-46%" }} animate={{ opacity: 1, scale: 1, y: "-50%" }} exit={{ opacity: 0, scale: 0.94, y: "-48%" }} transition={{ type: "spring", stiffness: 420, damping: 30 }}>
            <h3>{title}</h3>
            {desc ? <p>{desc}</p> : null}
            {actions ? <div className="actions">{actions}</div> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

export function Toast({ message }: { message: string | null }) {
  return (
    <AnimatePresence>
      {message ? (
        <motion.div className="k-toast" role="status" key={message} initial={{ opacity: 0, y: 12, x: "-50%", scale: 0.94 }} animate={{ opacity: 1, y: 0, x: "-50%", scale: 1 }} exit={{ opacity: 0, y: 8, x: "-50%" }} transition={{ type: "spring", stiffness: 420, damping: 28 }}>
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
export function useToast(ms = 2200) {
  const [message, setMessage] = useState<string | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => { setMessage(m); if (t.current) clearTimeout(t.current); t.current = setTimeout(() => setMessage(null), ms); }, [ms]);
  return { message, show };
}
