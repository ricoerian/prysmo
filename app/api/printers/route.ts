import { query, initDb } from "@/app/_lib/db";
import { getSession } from "@/app/_lib/auth";
import type { Printer } from "@/app/_lib/types";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await initDb();
  const { rows } = await query<Printer>("SELECT * FROM printers ORDER BY created_at DESC");
  return Response.json({ data: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await initDb();
    const { name, model, brand, location, status, notes, photo_url } = await request.json();
    if (!name || !model || !brand || !location) {
      return Response.json({ error: "name, model, brand, location are required" }, { status: 400 });
    }

    const { rows } = await query<Printer>(
      `INSERT INTO printers (name, model, brand, location, status, notes, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, model, brand, location, status ?? "active", notes ?? null, photo_url ?? null]
    );

    return Response.json({ data: rows[0] }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
