import { query, initDb } from "@/app/_lib/db";
import { getSession } from "@/app/_lib/auth";
import type { OrderWithDetails } from "@/app/_lib/types";

const ORDER_SELECT = `
  SELECT so.*, s.name AS supply_name, s.type AS supply_type,
         s.photo_url AS supply_photo_url, u.name AS orderer_name
  FROM stock_orders so
  JOIN supplies s ON s.id = so.supply_id
  JOIN users u ON u.id = so.ordered_by
`;

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/orders/[id]">
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await initDb();
  const { id } = await ctx.params;
  const { rows } = await query<OrderWithDetails>(
    `${ORDER_SELECT} WHERE so.id = $1`,
    [id]
  );

  if (rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ data: rows[0] });
}

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/orders/[id]">
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await initDb();
  const { id } = await ctx.params;
  const existing = await query("SELECT id FROM stock_orders WHERE id = $1", [id]);
  if (existing.rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });

  try {
    const { status, notes } = await request.json();
    const fulfilled_at = status === "fulfilled" ? new Date().toISOString() : null;

    await query(
      `UPDATE stock_orders SET status=$1, notes=$2, fulfilled_at=$3 WHERE id=$4`,
      [status, notes ?? null, fulfilled_at, id]
    );

    const { rows } = await query<OrderWithDetails>(
      `${ORDER_SELECT} WHERE so.id = $1`,
      [id]
    );
    return Response.json({ data: rows[0] });
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

  await initDb();
  const { id } = await ctx.params;
  const existing = await query("SELECT id FROM stock_orders WHERE id = $1", [id]);
  if (existing.rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });

  await query("DELETE FROM stock_orders WHERE id = $1", [id]);
  return Response.json({ data: { success: true } });
}
