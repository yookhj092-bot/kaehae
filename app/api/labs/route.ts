import { createLab } from "@/lib/server/store";

/** 연구소 만들기 */
export async function POST(req: Request) {
  const made = await createLab(await req.json().catch(() => ({})));
  return "error" in made ? Response.json(made, { status: made.error === "profanity" ? 422 : 400 }) : Response.json(made);
}
