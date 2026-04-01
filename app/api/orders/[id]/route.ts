import { getDb } from "@/app/_lib/db";
import { getSession } from "@/app/_lib/auth";
import type { OrderWithDetails } from "@/app/_lib/types";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/orders/[id]">
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();
  const order = db
    .prepare(
      `SELECT so.*, s.name as supply_name, s.type as supply_type,
              s.photo_url as supply_photo_url, u.name as orderer_name
       FROM stock_orders so
       JOIN supplies s ON s.id = so.supply_id
       JOIN users u ON u.id = so.ordered_by
       WHERE so.id = ?`
    )
    .get(id) as OrderWithDetails | undefined;

  if (!order) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ data: order });
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/orders/[id]">
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();
  const existing = db.prepare("SELECT id FROM stock_orders WHERE id = ?").get(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  try {
    const { status, notes } = await request.json();
    const fulfilled_at =
      status === "fulfilled" ? new Date().toISOString() : null;

    db.prepare(
      `UPDATE stock_orders SET status=?, notes=?, fulfilled_at=? WHERE id=?`
    ).run(status, notes ?? null, fulfilled_at, id);

    const order = db
      .prepare(
        `SELECT so.*, s.name as supply_name, s.type as supply_type,
                s.photo_url as supply_photo_url, u.name as orderer_name
         FROM stock_orders so
         JOIN supplies s ON s.id = so.supply_id
         JOIN users u ON u.id = so.ordered_by
         WHERE so.id = ?`
      )
      .get(id) as OrderWithDetails;

    return Response.json({ data: order });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/orders/[id]">
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();
  const existing = db.prepare("SELECT id FROM stock_orders WHERE id = ?").get(id);
  if (!existing) return Response.json({ error: "Not found" }, { status: 404 });

  db.prepare("DELETE FROM stock_orders WHERE id = ?").run(id);
  return Response.json({ data: { success: true } });
}
