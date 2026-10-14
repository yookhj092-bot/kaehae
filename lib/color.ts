/** 색 유틸: HSV ↔ HEX, 색 이름, 섞기 */
export type HSV = { h: number; s: number; v: number };

const clamp = (n: number, a = 0, b = 1) => Math.max(a, Math.min(b, n));
const toHex = (r: number, g: number, b: number) =>
  "#" + [r, g, b].map((x) => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, "0")).join("").toUpperCase();

export function hsvToRgb({ h, s, v }: HSV): [number, number, number] {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return v - v * s * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [f(5) * 255, f(3) * 255, f(1) * 255];
}
export const hsvToHex = (c: HSV) => toHex(...hsvToRgb(c));
export const hexToRgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return [h, s, l];
}
export function hslToHex(h: number, s: number, l: number) {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return toHex(f(0) * 255, f(8) * 255, f(4) * 255);
}

const lin = (c: number) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const unlin = (c: number) => 255 * (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
/** 여러 색을 빛의 양 기준으로 평균낸다 */
export function mix(hexes: string[]) {
  if (!hexes.length) return "#D8D3FF";
  const acc = [0, 0, 0];
  hexes.forEach((h) => hexToRgb(h).forEach((v, i) => (acc[i] += lin(v))));
  return toHex(unlin(acc[0] / hexes.length), unlin(acc[1] / hexes.length), unlin(acc[2] / hexes.length));
}

const NAMES: [string, string][] = [
  ["새벽 라일락", "#C3B1FF"], ["오로라 바이올렛", "#7B5CFF"], ["아이스 블루", "#CFDDFF"], ["코발트 블루", "#3D6BFF"],
  ["비 갠 하늘", "#8FB4FF"], ["벚꽃 우유", "#FFD9EC"], ["체리 소다", "#FF5FA8"], ["라즈베리 잼", "#D6337A"],
  ["민트 글래스", "#D4F4EC"], ["청량 민트", "#6FD6BE"], ["선셋 피치", "#FFB38A"], ["오후 4시 코랄", "#FF7F6B"],
  ["버터 크림", "#FFE08A"], ["레몬 셔벗", "#F3F08A"], ["미드나잇 잉크", "#2E2A5C"], ["심해 네이비", "#1F2F6B"],
  ["안개 그레이", "#DDE0EA"], ["라벤더 안개", "#D9D2F5"], ["복숭아 우유", "#FFD0C2"], ["플럼", "#8A3F8F"],
  ["모브 핑크", "#E6A5D6"], ["세이지 그린", "#A9C9A4"], ["숲속 이끼", "#4E7A5A"], ["모래 베이지", "#E8D7BE"],
  ["귤 껍질", "#FF9B3D"], ["토마토 레드", "#E5383B"], ["와인", "#7A1F2B"], ["잔디", "#5DBB63"], ["청록 바다", "#1F9E9E"],
  ["먹색", "#2B2B2B"], ["눈밭", "#F7F7F7"], ["초콜릿", "#5B3A29"], ["올리브", "#8A8F3A"], ["하늘", "#6EC1FF"],
];
export function nameOf(hex: string) {
  const [r, g, b] = hexToRgb(hex);
  let best = NAMES[0][0], bd = Infinity;
  for (const [n, h] of NAMES) {
    const [R, G, B] = hexToRgb(h);
    const rm = (r + R) / 2;
    const d = (2 + rm / 256) * (r - R) ** 2 + 4 * (g - G) ** 2 + (2 + (255 - rm) / 256) * (b - B) ** 2;
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}
