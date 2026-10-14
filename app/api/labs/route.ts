import { failed, tooMany } from "@/lib/server/guard";
import { createLab } from "@/lib/server/store";

/** 연구소 만들기 (같은 접속 주소에서 한 시간에 10개까지) */
export async function POST(req: Request) {
  try {
    const busy = await tooMany(req, "lab", 10);
    if (busy) return busy;
    const made = await createLab(await req.json().catch(() => ({})));
    return "error" in made ? Response.json(made, { status: made.error === "profanity" ? 422 : 400 }) : Response.json(made);
  } catch (e) { return failed(req, e); }
}
