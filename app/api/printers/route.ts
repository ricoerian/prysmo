import { getDb } from "@/app/_lib/db";
import { getSession } from "@/app/_lib/auth";
import type { Printer } from "@/app/_lib/types";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const printers = db.prepare("SELECT * FROM printers ORDER BY created_at DESC").all() as Printer[];
  return Response.json({ data: printers });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, model, brand, location, status, notes, photo_url } = await request.json();
    if (!name || !model || !brand || !location) {
      return Response.json({ error: "name, model, brand, location are required" }, { status: 400 });
    }

    const db = getDb();
    const result = db
      .prepare(
        "INSERT INTO printers (name, model, brand, location, status, notes, photo_url) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(name, model, brand, location, status ?? "active", notes ?? null, photo_url ?? null);

    const printer = db
      .prepare("SELECT * FROM printers WHERE id = ?")
      .get(result.lastInsertRowid) as Printer;

    return Response.json({ data: printer }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
