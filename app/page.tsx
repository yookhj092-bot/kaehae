import Link from "next/link";

/* 임시 홈: 화면 작업이 진행되는 동안 각 단계로 가는 입구 */
export default function Home() {
  return (
    <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ display: "grid", gap: 12, textAlign: "center" }}>
        <p className="t-body-01" style={{ color: "var(--gray-800)" }}>타인의 눈으로 보는 나</p>
        <h1 className="t-heading-05">KAEHAE</h1>
        <p className="t-body-compact-01" style={{ color: "var(--gray-700)", marginBottom: 12 }}>신규 버전 · 작업 중</p>
        <Link href="/a" className="k-btn primary" style={{ textDecoration: "none", padding: "16px 28px" }}>
          연구소 만들기 플로우 (A)
        </Link>
        <Link href="/b?demo=1" className="k-btn primary" style={{ textDecoration: "none", padding: "16px 28px" }}>
          내 연구소 · 리포트 예시 (B)
        </Link>
        <Link href="/r" className="k-btn primary" style={{ textDecoration: "none", padding: "16px 28px" }}>
          연구원 응답 플로우 (R)
        </Link>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 340 }}>
          {[["첫인상 채집 01", "/r?a=01&at=intro1"], ["스타일 표본 04", "/r?a=04&at=intro4"], ["비유 실험 07", "/r?a=07&at=intro7"], ["행동 관찰 06", "/r?b=06&at=intro6"], ["관계 데이터 10", "/r?at=intro10"], ["제출 완료", "/r?at=done"], ["보너스 09", "/r?at=intro9"]].map(([l, h]) => (
            <a key={h} href={h} className="k-btn assistive glass sm" style={{ textDecoration: "none", padding: "8px 14px", fontSize: 13 }}>{l}</a>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 340 }}>
          {[["없는 링크", "notfound"], ["응답 마감", "closed"], ["이미 제출", "submitted"], ["열쇠 없음", "nokey"], ["네트워크 오류", "offline"]].map(([l, k]) => (
            <a key={k} href={`/e?k=${k}`} className="k-btn assistive glass sm" style={{ textDecoration: "none", padding: "8px 14px", fontSize: 13 }}>{l}</a>
          ))}
        </div>
        <Link href="/system" className="k-btn assistive glass" style={{ textDecoration: "none", padding: "16px 28px" }}>
          디자인 시스템 보기
        </Link>
      </div>
    </main>
  );
}
