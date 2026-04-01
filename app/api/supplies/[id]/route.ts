import { getDb } from "@/app/_lib/db";
import { getSession } from "@/app/_lib/auth";
import type { Supply, Printer } from "@/app/_lib/types";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/supplies/[id]">
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();
  const supply = db.prepare("SELECT * FROM supplies WHERE id = ?").get(id) as Supply | undefined;
  if (!supply) return Response.json({ error: "Not found" }, { status: 404 });

  const printers = db
    .prepare(
      `SELECT p.* FROM printers p
       JOIN printer_supplies ps ON ps.printer_id = p.id
       WHERE ps.supply_id = ?`
    )
    .all(id) as Printer[];

  return Response.json({
    data: { ...supply, is_low: supply.quantity <= supply.min_quantity, printers },
  });
}

export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/supplies/[id]">
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();
  const existing = db.prepare("SELECT * FROM supplies WHERE id = ?").get(id) as Supply | undefined;
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  try {
    const { name, type, sku, quantity, min_quantity, unit, notes, photo_url } = await request.json();
    db.prepare(
      `UPDATE supplies SET name=?, type=?, sku=?, quantity=?, min_quantity=?, unit=?, notes=?, photo_url=? WHERE id=?`
    ).run(name, type, sku ?? null, quantity, min_quantity, unit, notes ?? null, photo_url ?? null, id);

    const supply = db.prepare("SELECT * FROM supplies WHERE id = ?").get(id) as Supply;

    // Auto-create a pending order if stock dropped below minimum
    if (quantity <= min_quantity && existing.quantity > existing.min_quantity) {
      const openOrder = db
        .prepare(
          "SELECT id FROM stock_orders WHERE supply_id = ? AND status = 'pending' LIMIT 1"
        )
        .get(id);

      if (!openOrder) {
        db.prepare(
          `INSERT INTO stock_orders (supply_id, quantity, status, notes, ordered_by)
           VALUES (?, ?, 'pending', 'Auto-generated: stock below minimum threshold', ?)`
        ).run(id, min_quantity * 2, session.userId);
      }
    }

    return Response.json({ data: supply });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/supplies/[id]">
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();
  const existing = db.prepare("SELECT id FROM supplies WHERE id = ?").get(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  db.prepare("DELETE FROM supplies WHERE id = ?").run(id);
  return Response.json({ data: { success: true } });
}
