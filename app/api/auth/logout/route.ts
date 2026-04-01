import { clearSessionCookie } from "@/app/_lib/auth";

export async function POST() {
  await clearSessionCookie();
  return Response.json({ data: { success: true } });
}
