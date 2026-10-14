"use client";

/* R-10 제출 완료 · R-12 싱크로율 */

import { useEffect, useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import { Button, Guide, TextButton, buzz } from "@/components/ui";

/** R-10 제출 완료: 접수증 + 보너스 라운드 권유 */
export function Done({ subject, nick, colors, mixed, answered, skipped, count, bonus, onBonus, onMake, onShare }: { count: number; bonus: number; subject: string; nick: string; colors: string[]; mixed: string; answered: number; skipped: number; onBonus: () => void; onMake: () => void; onShare: () => void }) {
  return (
    <div className="scr" style={{ paddingTop: "var(--safe-t)" }}>
      <div className="scr-body">
        <Guide text={`${nick}님의 표본이 안전하게 접수되었습니다.`} />
        <motion.div className="receipt glass" initial={{ opacity: 0, y: 24, rotate: -2 }} animate={{ opacity: 1, y: 0, rotate: 0 }} transition={{ type: "spring", stiffness: 160, damping: 16, delay: 0.15 }}>
          <div className="receipt-top">
            <span>표본 접수증</span>
            <span>No. {String(count).padStart(3, "0")}</span>
          </div>
          <div className="receipt-mix" style={{ "--mix": mixed } as CSSProperties}>
            <i className="blob" />
            <p><b>{subject}</b>님의 플라스크에<br />{count}번째 색이 섞였습니다</p>
          </div>
          <div className="receipt-sw">
            {colors.slice(0, 6).map((c, i) => <motion.i key={i} style={{ background: c }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.5 + i * 0.07 }} />)}
          </div>
          <dl className="receipt-rows">
            <div><dt>연구원</dt><dd>{nick}</dd></div>
            <div><dt>답한 문항</dt><dd>{answered}개</dd></div>
            {skipped ? <div><dt>넘긴 문항</dt><dd>{skipped}개</dd></div> : null}
          </dl>
        </motion.div>
        {bonus > 0 ? (
          <button type="button" className="bonus-card pressable" onClick={() => { buzz(8); onBonus(); }}>
            <span className="tag">BONUS · EXP. 09</span>
            <b>취향 적중 테스트</b>
            <span>{subject}님이 남긴 답을 맞혀 보세요 · {bonus}문항 · 30초</span>
          </button>
        ) : null}
      </div>
      <div className="scr-bottom">
        {bonus > 0 ? <Button block onClick={onBonus} className="sheen">보너스 라운드 도전하기</Button> : <Button block onClick={onMake} className="sheen">나도 내 연구소 만들기</Button>}
        <div className="link-row">
          {bonus > 0 ? <><TextButton size="sm" onClick={onMake}>나도 내 연구소 만들기</TextButton><i /></> : null}
          <TextButton size="sm" onClick={onShare}>다른 친구에게 링크 보내기</TextButton>
        </div>
      </div>
    </div>
  );
}

const VERDICT = ["아직은 서로 알아가는 사이", "조금 더 관찰이 필요합니다", "절반 가까이 맞히셨습니다", "꽤 가까운 사이입니다", "거의 다 맞히셨습니다", "본인보다 더 잘 아는 연구원"];

/** R-12 싱크로율: 맞힌 개수가 차오르고, 문항별 결과를 보여 준다 */
export function Sync({ subject, items, onMake, onShare }: { subject: string; items: { title: string; mine: string; self: string; ok: boolean }[]; onMake: () => void; onShare: (s: { pct: number; hit: number; total: number; verdict: string }) => void }) {
  const hit = items.filter((x) => x.ok).length;
  const target = Math.round((hit / items.length) * 100);
  const [n, setN] = useState(0);
  useEffect(() => {
    const t0 = performance.now(), dur = 1400;
    const id = setInterval(() => {
      const k = Math.min(1, (performance.now() - t0) / dur);
      setN(Math.round((1 - Math.pow(1 - k, 3)) * target));
      if (k >= 1) { clearInterval(id); buzz([10, 40, 16]); }
    }, 40);
    return () => clearInterval(id);
  }, [target]);
  return (
    <div className="scr" style={{ paddingTop: "var(--safe-t)" }}>
      <div className="scr-body">
        <div className="sync-head">
          <span className="tag">EXP. 09 · 취향 적중 테스트</span>
          <h1><b>{subject}</b>님과의 싱크로율</h1>
        </div>
        <div className="sync-ring" style={{ "--p": n } as CSSProperties}>
          <div className="in">
            <p>{n}<small>%</small></p>
            <span>{items.length}문항 중 {hit}개 적중</span>
          </div>
        </div>
        <p className="sync-verdict">{VERDICT[hit] ?? VERDICT[VERDICT.length - 1]}</p>
        <div className="sync-list stagger">
          {items.map((it, i) => (
            <div key={i} className={it.ok ? "glass ok" : "glass"}>
              <i>{it.ok ? "○" : "×"}</i>
              <div>
                <p>{it.title}</p>
                <span>내 답 <b>{it.mine}</b>{it.ok ? null : <> · {subject}님의 답 <b>{it.self}</b></>}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="scr-bottom">
        <Button block onClick={onMake} className="sheen">나도 내 연구소 만들기</Button>
        <div className="later"><TextButton size="sm" onClick={() => onShare({ pct: target, hit, total: items.length, verdict: VERDICT[hit] ?? VERDICT[VERDICT.length - 1] })}>싱크로율 자랑하기</TextButton></div>
      </div>
    </div>
  );
}
