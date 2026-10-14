import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";

/* 링크 미리보기 이미지 (피그마 sharing image 페이지의 og/invite · og/default, 1200×630)
   /og?kind=invite&name=지원  → "지원님의 캐해 연구에 초대되셨습니다"
   /og?kind=default            → "친구들이 본 나를 한 병에 모아 보세요"
   글꼴을 받지 못하면 미리 만들어 둔 정지 이미지로 대신한다. */

const FONT = "IBM Plex Sans KR";
async function loadFont(weight: number, text: string): Promise<ArrayBuffer> {
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${FONT.replaceAll(" ", "+")}:wght@${weight}&text=${encodeURIComponent(text)}`)).text();
  const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
  if (!url) throw new Error("font url not found");
  const res = await fetch(url);
  if (!res.ok) throw new Error("font fetch failed");
  return res.arrayBuffer();
}
/* public 폴더의 그림을 같은 사이트 주소로 받아 온다 (배포 환경에서는 파일로 읽을 수 없다) */
async function dataUrl(origin: string, file: string, type: string) {
  const res = await fetch(new URL(file, origin));
  if (!res.ok) throw new Error("asset fetch failed");
  return `data:${type};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const kind = q.get("kind") === "invite" ? "invite" : "default";
  const name = (q.get("name") ?? "").trim().slice(0, 12);
  const invite = kind === "invite" && name.length > 0;
  const tagline = "타인의 눈으로 보는 나";
  const caption = invite ? "약 5분 · 로그인 없이 참여" : "약 1분 · 로그인 없이 시작";
  const lines: { t: string; b?: boolean }[][] = invite
    ? [[{ t: name, b: true }, { t: "님의 캐해 연구에" }], [{ t: "초대되셨습니다" }]]
    : [[{ t: "친구들이 본 " }, { t: "나", b: true }, { t: "를" }], [{ t: "한 병에 모아 보세요" }]];
  const text = tagline + caption + lines.flat().map((x) => x.t).join("") + "0123456789";

  try {
    const [regular, bold, flask, logo] = await Promise.all([loadFont(400, text), loadFont(700, text), dataUrl(req.nextUrl.origin, "/og/flask.png", "image/png"), dataUrl(req.nextUrl.origin, "/img/logo.svg", "image/svg+xml")]);
    const glow = (left: number, top: number, color: string) => (
      <div style={{ position: "absolute", left, top, width: 340, height: 340, borderRadius: 340, backgroundImage: `radial-gradient(circle, ${color} 0%, ${color} 30%, rgba(238,238,238,0) 70%)` }} />
    );
    return new ImageResponse(
      (
        <div style={{ width: 1200, height: 630, display: "flex", backgroundColor: "#eeeeee", fontFamily: FONT, color: "#212121" }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "72px 0 72px 72px" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: 24, color: "#616161" }}>{tagline}</div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={logo} width={164} height={48} alt="" style={{ marginTop: 8 }} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", fontSize: 56, lineHeight: 1.29 }}>
              {lines.map((ln, i) => (
                <div key={i} style={{ display: "flex" }}>
                  {ln.map((x, k) => <span key={k} style={{ fontWeight: x.b ? 700 : 400, whiteSpace: "pre" }}>{x.t}</span>)}
                </div>
              ))}
            </div>
            <div style={{ fontSize: 24, color: "#757575" }}>{caption}</div>
          </div>
          <div style={{ width: 630, height: 630, display: "flex", position: "relative" }}>
            {glow(30, 180, "#c3dbff")}
            {glow(150, 210, "#d8d3ff")}
            {glow(290, 170, "#f1cce8")}
            <svg width="630" height="630" viewBox="0 0 630 630" style={{ position: "absolute", left: 0, top: 0 }}>
              <ellipse cx="315" cy="302" rx="250" ry="112" transform="rotate(-46 315 302)" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.85)" strokeWidth="2" />
            </svg>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={flask} width={510} height={510} alt="" style={{ position: "absolute", left: 60, top: 50 }} />
          </div>
        </div>
      ),
      { width: 1200, height: 630, fonts: [{ name: FONT, data: regular, weight: 400, style: "normal" }, { name: FONT, data: bold, weight: 700, style: "normal" }], headers: { "Cache-Control": "public, max-age=3600" } },
    );
  } catch {
    return Response.redirect(new URL(`/og/${kind}.png`, req.url), 302);
  }
}
