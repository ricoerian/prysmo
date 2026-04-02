import { query } from "@/app/_lib/db";
import { getSession } from "@/app/_lib/auth";
import type { OrderWithDetails } from "@/app/_lib/types";

const ORDER_SELECT = `
  SELECT so.*, s.name AS supply_name, s.type AS supply_type, s.unit AS supply_unit,
         s.photo_url AS supply_photo_url, u.name AS orderer_name
  FROM stock_orders so
  JOIN supplies s ON s.id = so.supply_id
  JOIN users u ON u.id = so.ordered_by
`;

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { rows } = await query<OrderWithDetails>(
    `${ORDER_SELECT} ORDER BY so.ordered_at DESC`
  );
  return Response.json(
    { data: rows },
    { headers: { "Cache-Control": "private, no-cache" } }
  );
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { supply_id, quantity, notes } = await request.json();
    if (!supply_id) {
      return Response.json({ error: "supply_id is required" }, { status: 400 });
    }

    const supply = await query("SELECT id FROM supplies WHERE id = $1", [supply_id]);
    if (supply.rows.length === 0) return Response.json({ error: "Supply not found" }, { status: 404 });

    const insertRes = await query<{ id: number }>(
      `INSERT INTO stock_orders (supply_id, quantity, status, notes, ordered_by)
       VALUES ($1, $2, 'pending', $3, $4)
       RETURNING id`,
      [supply_id, quantity, notes ?? null, session.userId]
    );

    const { rows } = await query<OrderWithDetails>(
      `${ORDER_SELECT} WHERE so.id = $1`,
      [insertRes.rows[0].id]
    );

    return Response.json({ data: rows[0] }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
