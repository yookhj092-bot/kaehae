import type { Metadata } from "next";
import "./admin.css";

export const metadata: Metadata = { title: "KAEHAE · 운영 통계", robots: { index: false, follow: false } };

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
