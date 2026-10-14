"use client";

/* E 화면: 흐름에서 벗어난 상태. E-01 없는 링크 · E-02 응답 마감 · E-03 이미 제출 · E-04 열쇠 없음 · E-05 네트워크 오류
   주소: /e?k=notfound|closed|submitted|nokey|offline */

import { useEffect, useState, type ReactNode } from "react";
import { AiOrb, Button, Logo, TextButton, TextField, Toast, cx, useToast } from "@/components/ui";
import { Device } from "./Device";

export type EKind = "notfound" | "closed" | "submitted" | "nokey" | "offline";
const KINDS: EKind[] = ["notfound", "closed", "submitted", "nokey", "offline"];

export function EScreen({ kind: fixed }: { kind?: EKind }) {
  const [kind, setKind] = useState<EKind>(fixed ?? "notfound");
  const [key, setKey] = useState("");
  const [checking, setChecking] = useState(false);
  const [SUBJECT, setSubject] = useState("연구 대상");
  const [lab, setLab] = useState<string | null>(null);
  const toast = useToast();
  useEffect(() => {
    if (fixed) return;
    const q = new URLSearchParams(location.search);
    if (q.get("name")) setSubject(q.get("name")!.slice(0, 12));
    setLab(q.get("lab"));
    const k = q.get("k") as EKind | null;
    if (k && KINDS.includes(k)) setKind(k);
  }, [fixed]);

  const to = (href: string) => () => location.assign(href);
  /* 붙여 넣은 열쇠 링크에서 연구소와 열쇠를 꺼내 연다 */
  const openKey = () => {
    const m = key.match(/[?&]lab=([a-z0-9]+)/), k = key.match(/[?&]key=([a-z0-9]+)/);
    if (m && k) location.assign(`/b?lab=${m[1]}&key=${k[1]}`);
    else toast.show("열쇠 링크가 아닙니다. 다시 확인해 주세요");
  };
  const retry = () => {
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      if (navigator.onLine) { if (history.length > 1) history.back(); else location.assign("/"); }
      else toast.show("아직 연결되지 않았습니다");
    }, 900);
  };

  const C: Record<EKind, { mark: string; title: ReactNode; desc: string; main: ReactNode; sub?: ReactNode; extra?: ReactNode }> = {
    notfound: {
      mark: "?", title: <>연구소를 찾지 못했습니다</>,
      desc: "링크가 잘못되었거나, 연구소가 삭제되었거나 보관 기간(30일)이 지났을 수 있습니다.",
      main: <Button block onClick={to("/a")} className="sheen">내 연구소 만들기</Button>,
      sub: <TextButton size="sm" onClick={to("/")}>처음 화면으로</TextButton>,
    },
    closed: {
      mark: "—", title: <><b>{SUBJECT}</b>님의 연구가 마감되었습니다</>,
      desc: "지금은 새 표본을 받지 않습니다. 다시 열리면 같은 링크로 참여하실 수 있어요.",
      main: <Button block onClick={to("/a")} className="sheen">나도 내 연구소 만들기</Button>,
    },
    submitted: {
      mark: "✓", title: <>이미 표본을 제출하셨습니다</>,
      desc: `${SUBJECT}님의 연구소에는 한 번만 참여할 수 있습니다. 내신 답은 리포트에 잘 반영되었습니다.`,
      main: <Button block onClick={to(lab ? `/r?lab=${lab}&at=intro9` : "/r?at=intro9")} className="sheen">보너스 라운드 하러 가기</Button>,
      sub: <TextButton size="sm" onClick={to("/a")}>나도 내 연구소 만들기</TextButton>,
    },
    nokey: {
      mark: "⚿", title: <>열쇠가 필요한 연구소입니다</>,
      desc: "리포트는 연구소 주인만 볼 수 있습니다. 연구소를 만들 때 받은 열쇠 링크를 붙여 넣어 주세요.",
      extra: (
        <form className="e-key" onSubmit={(e) => { e.preventDefault(); openKey(); }}>
          <TextField value={key} onChange={setKey} max={120} placeholder="열쇠 링크 붙여넣기" label="열쇠 링크" />
        </form>
      ),
      main: <Button block disabled={!key.trim()} onClick={openKey} className="sheen">연구소 열기</Button>,
      sub: <TextButton size="sm" onClick={() => toast.show("카카오 연결은 실제 서비스에서 이어집니다")}>카카오로 열쇠 찾기</TextButton>,
    },
    offline: {
      mark: "!", title: <>연결이 잠시 끊겼습니다</>,
      desc: "지금까지의 답은 이 기기에 저장되어 있습니다. 연결되면 멈춘 곳에서 이어서 하실 수 있어요.",
      main: <Button block disabled={checking} onClick={retry} className="sheen">{checking ? "확인하는 중…" : "다시 시도"}</Button>,
    },
  };
  const c = C[kind];

  return (
    <Device>
      <div className="scr e-scr" style={{ paddingTop: "var(--safe-t)" }}>
        <div className="scr-body">
          <div className="e-top"><Logo height={20} className="k-logo" /></div>
          <div className={cx("e-art", kind)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/motion/flask-poster.png" alt="" draggable={false} />
            <span className="mark glass" aria-hidden="true">{c.mark}</span>
          </div>
          <div className="e-text" key={kind}>
            <AiOrb size={24} />
            <h1>{c.title}</h1>
            <p>{c.desc}</p>
          </div>
          {c.extra}
        </div>
        <div className="scr-bottom">
          {c.main}
          {c.sub ? <div className="later">{c.sub}</div> : null}
        </div>
      </div>
      <Toast message={toast.message} />
    </Device>
  );
}
