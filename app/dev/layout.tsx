import { notFound } from "next/navigation";

/* 작업용 바로가기: 배포본에서는 열리지 않고, 개발 서버에서만 보인다 */
export default function Layout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV === "production") notFound();
  return children;
}
