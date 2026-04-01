import { query, initDb } from "@/app/_lib/db";
import { getSession } from "@/app/_lib/auth";
import type { Supply, Printer } from "@/app/_lib/types";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/supplies/[id]">
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await initDb();
  const { id } = await ctx.params;

  const supplyRes = await query<Supply>("SELECT * FROM supplies WHERE id = $1", [id]);
  if (supplyRes.rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });
  const supply = supplyRes.rows[0];

  const printersRes = await query<Printer & { quantity_used: number }>(
    `SELECT p.*, ps.quantity_used FROM printers p
     JOIN printer_supplies ps ON ps.printer_id = p.id
     WHERE ps.supply_id = $1`,
    [id]
  );

  return Response.json({
    data: {
      ...supply,
      is_low: supply.quantity <= supply.min_quantity,
      printers: printersRes.rows,
    },
  });
}

export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/supplies/[id]">
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await initDb();
  const { id } = await ctx.params;

  const existingRes = await query<Supply>("SELECT * FROM supplies WHERE id = $1", [id]);
  if (existingRes.rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });
  const existing = existingRes.rows[0];

  try {
    const { name, type, sku, quantity, min_quantity, default_order_quantity, unit, notes, photo_url } = await request.json();
    const { rows } = await query<Supply>(
      `UPDATE supplies
       SET name=$1, type=$2, sku=$3, quantity=$4, min_quantity=$5, default_order_quantity=$6, unit=$7, notes=$8, photo_url=$9
       WHERE id=$10
       RETURNING *`,
      [name, type, sku ?? null, quantity, min_quantity, default_order_quantity ?? 10, unit, notes ?? null, photo_url ?? null, id]
    );
    const supply = rows[0];

    // Auto-create a pending order if stock dropped below or at minimum
    if (quantity <= min_quantity && existing.quantity > existing.min_quantity) {
      const openOrder = await query(
        "SELECT id FROM stock_orders WHERE supply_id = $1 AND status = 'pending' LIMIT 1",
        [id]
      );
      if (openOrder.rows.length === 0) {
        await query(
          `INSERT INTO stock_orders (supply_id, quantity, status, notes, ordered_by)
           VALUES ($1, $2, 'pending', 'Auto-generated: stock below minimum threshold', $3)`,
          [id, 0, session.userId]
        );
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

  await initDb();
  const { id } = await ctx.params;
  const existing = await query("SELECT id FROM supplies WHERE id = $1", [id]);
  if (existing.rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });

  await query("DELETE FROM supplies WHERE id = $1", [id]);
  return Response.json({ data: { success: true } });
}
