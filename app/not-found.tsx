import { EScreen } from "@/components/flow/EScreen";

export const metadata = { title: "KAEHAE · 찾을 수 없는 페이지" };

/* 없는 주소로 들어오면 E-01 */
export default function NotFound() {
  return <EScreen kind="notfound" />;
}
