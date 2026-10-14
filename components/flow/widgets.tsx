"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { buzz, cx } from "@/components/ui";
import { hsvToHex, nameOf, type HSV } from "@/lib/color";

/* ---------------------------------------------------------------- 컬러 추출 */
const START: HSV = { h: 258, s: 0.42, v: 0.92 };

export function ColorPicker({ value, onChange }: { value: HSV | null; onChange: (c: HSV) => void }) {
  const c = value ?? START;
  const hex = hsvToHex(c);
  const sv = useRef<HTMLDivElement>(null);
  const hue = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<"sv" | "hue" | null>(null);

  const fromSV = (e: React.PointerEvent) => {
    const r = sv.current!.getBoundingClientRect();
    const s = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const v = 1 - Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    onChange({ h: c.h, s, v });
  };
  const fromHue = (e: React.PointerEvent) => {
    const r = hue.current!.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (e.clientX - r.left - 12) / (r.width - 24)));
    onChange({ ...c, h: Math.round(p * 359) });
  };
  const cap = (e: React.PointerEvent) => { try { e.currentTarget.setPointerCapture(e.pointerId); } catch {} };

  return (
    <>
      <div className="picker glass" style={{ "--hue": c.h, "--c": hex, boxShadow: value ? `inset 1.5px 1.5px 1px -.5px #fff, inset -1.5px -1.5px 1px -.5px rgba(255,255,255,.75), 0 18px 36px -22px ${hex}` : undefined } as CSSProperties}>
        <div ref={sv} className={cx("sv", drag === "sv" && "drag", !value && "idle")} style={{ "--s": c.s, "--v": c.v } as CSSProperties}
          role="slider" tabIndex={0} aria-label="색의 밝기와 선명도" aria-valuetext={nameOf(hex)}
          onPointerDown={(e) => { cap(e); setDrag("sv"); fromSV(e); buzz(6); }}
          onPointerMove={(e) => drag === "sv" && fromSV(e)}
          onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}
          onKeyDown={(e) => {
            const d = 0.04;
            if (e.key === "ArrowRight") onChange({ ...c, s: Math.min(1, c.s + d) });
            if (e.key === "ArrowLeft") onChange({ ...c, s: Math.max(0, c.s - d) });
            if (e.key === "ArrowUp") onChange({ ...c, v: Math.min(1, c.v + d) });
            if (e.key === "ArrowDown") onChange({ ...c, v: Math.max(0, c.v - d) });
          }}>
          <span className="cursor" />
        </div>
        <div ref={hue} className={cx("hue", drag === "hue" && "drag")} style={{ "--hp": c.h / 359 } as CSSProperties}
          role="slider" tabIndex={0} aria-label="색상" aria-valuemin={0} aria-valuemax={359} aria-valuenow={c.h}
          onPointerDown={(e) => { cap(e); setDrag("hue"); fromHue(e); buzz(6); }}
          onPointerMove={(e) => drag === "hue" && fromHue(e)}
          onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}
          onKeyDown={(e) => { if (e.key === "ArrowRight") onChange({ ...c, h: (c.h + 6) % 360 }); if (e.key === "ArrowLeft") onChange({ ...c, h: (c.h + 354) % 360 }); }}>
          <span className="rail" />
          <span className="knob" />
        </div>
      </div>
      <div className="color-readout" aria-live="polite" style={{ "--c": hex } as CSSProperties}>
        <span className={cx("nm", !value && "empty")}>{value ? nameOf(hex) : "색을 골라 주세요"}</span>
        <span className="hex"><i />{value ? hex : "#------"}</span>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- 계절 입자 */
const KINDS: Record<string, { c: string; r: string; w: number }> = {
  spring: { c: "#F1CCE8", r: "60% 0 60% 0", w: 11 },
  autumn: { c: "#FFA7A4", r: "0 70% 0 70%", w: 12 },
  winter: { c: "#FFFFFF", r: "50%", w: 7 },
};
export function Particles({ kind, burst }: { kind: string | null; burst: number }) {
  const [items, setItems] = useState<{ id: string; cls?: string; style: CSSProperties }[]>([]);
  useEffect(() => {
    if (!kind || !burst) { setItems([]); return; }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (kind === "summer") {
      /* 여름은 떨어지는 입자 대신 햇빛이 여기저기서 반짝인다 */
      setItems(Array.from({ length: 14 }, (_, i) => ({ id: `${burst}-g${i}`, cls: "glint", style: { "--x": `${6 + Math.random() * 88}%`, "--y": `${6 + Math.random() * 80}%`, "--s": `${12 + Math.random() * 18}px`, "--dl": `${Math.random() * 1.8}s` } as CSSProperties })));
      const t = setTimeout(() => setItems([]), 3200);
      return () => clearTimeout(t);
    }
    if (!KINDS[kind]) return;
    const k = KINDS[kind];
    setItems(Array.from({ length: 24 }, (_, i) => {
      const s = k.w * (0.6 + Math.random() * 0.9);
      return { id: `${burst}-${i}`, style: { left: `${Math.random() * 100}%`, width: s, height: s, background: k.c, borderRadius: k.r, boxShadow: "0 0 6px rgba(255,255,255,.9)", "--dx": `${(Math.random() - 0.5) * 160}px`, "--rot": `${Math.random() * 720}deg`, animationDuration: `${2.4 + Math.random() * 2.2}s`, animationDelay: `${Math.random() * 0.8}s` } as CSSProperties };
    }));
    const t = setTimeout(() => setItems([]), 5600);
    return () => clearTimeout(t);
  }, [kind, burst]);
  return <div className="particles" aria-hidden="true">{items.map((p) => <i key={p.id} className={p.cls} style={p.style} />)}</div>;
}

/* ---------------------------------------------------------------- 로딩 모션 */
const LOADER = "/motion/disc-loader.webp";
/** 용량이 큰 모션 파일을 화면에 필요해지기 전에 미리 받아 둔다 */
export function preloadMotion() {
  if (typeof window === "undefined") return;
  new Image().src = LOADER;
}
/** 유리 원반 로딩 모션. 파일을 다 받기 전에는 정지 이미지를 먼저 보여 준다. */
export function LoaderArt() {
  const [src, setSrc] = useState("/motion/disc-loader-poster.png");
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const im = new Image();
    im.onload = () => setSrc(LOADER);
    im.src = LOADER;
    return () => { im.onload = null; };
  }, []);
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" />;
}

/** 플라스크 영역을 화면 높이에 맞춰 줄인다. 글과 버튼이 한 화면에 다 들어오도록, 넘치는 만큼만 정확히 줄인다.
    (CSS의 높이별 단계는 첫 그림용 근삿값이고, 여기서 실제로 재서 덮어쓴다.) */
export function useHeroFit(dep?: unknown) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current, body = el?.closest(".scr-body") as HTMLElement | null;
    if (!el || !body) return;
    const fit = () => {
      el.style.zoom = "1";
      const raw = body.scrollHeight - body.clientHeight, over = raw > 0 ? raw + 6 : 0, h = el.offsetHeight || 352; // 6px: 확대 비율 반올림 여유
      el.style.zoom = String(Math.max(0.3, Math.min(1, (h - over) / h)));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(body);
    document.fonts?.ready.then(fit).catch(() => {});
    return () => ro.disconnect();
  }, [dep]);
  return ref;
}

/** 플라스크 모션(용량 큼)의 주소. 다 받기 전에는 정지 이미지 주소를 돌려준다. */
export function useFlaskSrc() {
  const [src, setSrc] = useState("/motion/flask-poster.png");
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const im = new Image();
    im.onload = () => setSrc("/motion/flask.webp");
    im.src = "/motion/flask.webp";
    return () => { im.onload = null; };
  }, []);
  return src;
}
