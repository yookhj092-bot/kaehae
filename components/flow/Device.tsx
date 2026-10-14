"use client";

import { useEffect, useRef, type ReactNode } from "react";

/** 화면 틀. 모바일에서는 보이는 영역(visualViewport)에 정확히 붙인다.
    iOS는 키보드가 올라오면 페이지를 위로 밀어 올리는데, 그만큼 틀을 따라 내려서 화면이 흔들리거나 위에 빈 곳이 생기지 않게 한다. */
export function Device({ children }: { children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current!, el = ref.current!;
    const vv = window.visualViewport;
    const root = document.documentElement;
    root.classList.add("app-lock");
    /* 키보드가 없을 때의 높이. 카카오톡 같은 앱 안 브라우저는 window.innerHeight가 위아래 막대 뒤까지 포함해
       실제 보이는 높이보다 크게 나오므로, 보이는 영역(visualViewport) 기준으로만 잰다. */
    let full = vv ? vv.height : window.innerHeight;
    const typing = () => {
      const a = document.activeElement as HTMLElement | null;
      return !!a && (a.tagName === "INPUT" || a.tagName === "TEXTAREA" || a.isContentEditable);
    };
    const sync = () => {
      const h = vv ? vv.height : window.innerHeight;
      if (h > full) full = h;
      stage.style.setProperty("--app-h", `${h}px`);
      stage.style.setProperty("--vv-top", `${vv ? vv.offsetTop : 0}px`);
      /* 주소창·툴바가 접히고 펴지는 것만으로는 키보드로 보지 않는다: 입력칸에 커서가 있을 때만 */
      el.classList.toggle("kb", typing() && full - h > 120);
    };
    /* 입력칸은 페이지 전체가 아니라 가운데 스크롤 영역 안에서만 보이는 곳으로 옮긴다 */
    const reveal = (t: HTMLElement) => {
      const body = t.closest(".scr-body") as HTMLElement | null;
      if (!body) return;
      const r = t.getBoundingClientRect(), b = body.getBoundingClientRect();
      body.scrollTo({ top: body.scrollTop + (r.top - b.top) - Math.max(12, (b.height - r.height) / 2), behavior: "smooth" });
    };
    const onFocus = (e: FocusEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA")) { setTimeout(() => reveal(t), 120); setTimeout(() => reveal(t), 420); }
    };
    const onBlur = () => setTimeout(sync, 60);
    const net = () => el.classList.toggle("is-offline", !navigator.onLine);
    net();
    sync();
    vv?.addEventListener("resize", sync);
    vv?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("online", net);
    window.addEventListener("offline", net);
    el.addEventListener("focusin", onFocus);
    el.addEventListener("focusout", onBlur);
    return () => {
      root.classList.remove("app-lock");
      vv?.removeEventListener("resize", sync);
      vv?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("online", net);
      window.removeEventListener("offline", net);
      el.removeEventListener("focusin", onFocus);
      el.removeEventListener("focusout", onBlur);
    };
  }, []);

  return (
    <div className="device-stage" ref={stageRef}>
      <div className="device" ref={ref} data-device>
        {children}
      </div>
    </div>
  );
}
