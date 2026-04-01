import { query, initDb } from "@/app/_lib/db";
import { getSession } from "@/app/_lib/auth";
import type { Supply, SupplyWithStatus } from "@/app/_lib/types";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await initDb();
  const { rows } = await query<SupplyWithStatus>(
    `SELECT s.*,
            CASE WHEN s.quantity <= s.min_quantity THEN TRUE ELSE FALSE END AS is_low,
            COALESCE(SUM(ps.quantity_used), 0) as refill_requirement
     FROM supplies s
     LEFT JOIN printer_supplies ps ON ps.supply_id = s.id
     GROUP BY s.id
     ORDER BY s.created_at ASC`
  );

  return Response.json({ data: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await initDb();
    const { name, type, sku, quantity, min_quantity, default_order_quantity, unit, notes, photo_url } = await request.json();
    if (!name || quantity === undefined || min_quantity === undefined) {
      return Response.json(
        { error: "name, quantity, min_quantity are required" },
        { status: 400 }
      );
    }

    const { rows } = await query<Supply>(
      `INSERT INTO supplies (name, type, sku, quantity, min_quantity, default_order_quantity, unit, notes, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [name, type ?? "other", sku ?? null, quantity, min_quantity, default_order_quantity ?? 10, unit ?? "pcs", notes ?? null, photo_url ?? null]
    );
    const supply = rows[0];

    // Auto-alert: create pending order if quantity is below min
    if (quantity <= min_quantity) {
      await query(
        `INSERT INTO stock_orders (supply_id, quantity, status, notes, ordered_by)
         VALUES ($1, $2, 'pending', 'Auto-generated: stock below minimum threshold', $3)`,
        [supply.id, 0, session.userId]
      );
    }

    return Response.json({ data: supply }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
