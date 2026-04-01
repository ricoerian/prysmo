import { clearSessionCookie } from "@/app/_lib/auth";

export async function POST() {
  try {
    await clearSessionCookie();
    return Response.json({ data: { success: true } });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
