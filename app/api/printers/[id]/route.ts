import { getDb } from "@/app/_lib/db";
import { getSession } from "@/app/_lib/auth";
import type { Printer, Supply } from "@/app/_lib/types";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/printers/[id]">
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();
  const printer = db.prepare("SELECT * FROM printers WHERE id = ?").get(id) as Printer | undefined;
  if (!printer) return Response.json({ error: "Not found" }, { status: 404 });

  const supplies = db
    .prepare(
      `SELECT s.* FROM supplies s
       JOIN printer_supplies ps ON ps.supply_id = s.id
       WHERE ps.printer_id = ?`
    )
    .all(id) as Supply[];

  return Response.json({ data: { ...printer, supplies } });
}

export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/printers/[id]">
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();
  const existing = db.prepare("SELECT id FROM printers WHERE id = ?").get(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  try {
    const { name, model, brand, location, status, notes, photo_url } = await request.json();
    db.prepare(
      `UPDATE printers SET name=?, model=?, brand=?, location=?, status=?, notes=?, photo_url=? WHERE id=?`
    ).run(name, model, brand, location, status, notes ?? null, photo_url ?? null, id);

    const printer = db.prepare("SELECT * FROM printers WHERE id = ?").get(id) as Printer;
    return Response.json({ data: printer });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/printers/[id]">
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();
  const existing = db.prepare("SELECT id FROM printers WHERE id = ?").get(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  db.prepare("DELETE FROM printers WHERE id = ?").run(id);
  return Response.json({ data: { success: true } });
}

// Link/unlink supplies
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/printers/[id]">
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const { supplyIds } = await request.json() as { supplyIds: number[] };

  const db = getDb();
  // Replace all links for this printer
  const replace = db.transaction(() => {
    db.prepare("DELETE FROM printer_supplies WHERE printer_id = ?").run(id);
    const insert = db.prepare(
      "INSERT OR IGNORE INTO printer_supplies (printer_id, supply_id) VALUES (?, ?)"
    );
    for (const sid of supplyIds) {
      insert.run(id, sid);
    }
  });
  replace();

  return Response.json({ data: { success: true } });
}
