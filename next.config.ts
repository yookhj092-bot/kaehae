import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  /* 같은 와이파이의 휴대폰에서 개발 서버에 접속할 수 있게 허용 */
  allowedDevOrigins: ["192.168.0.3", "192.168.*.*", "*.local"],
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
