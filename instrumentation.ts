import type { Instrumentation } from "next";

/* 처리하지 못한 서버 오류를 저장소의 errors 표에 남긴다. /api/health 의 errors24h 로 개수를 볼 수 있다. */
export const onRequestError: Instrumentation.onRequestError = async (err, request) => {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { logError } = await import("@/lib/server/store");
  await logError(request.path, err);
};
