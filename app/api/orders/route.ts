import { getDb } from "@/app/_lib/db";
import { getSession } from "@/app/_lib/auth";
import type { OrderWithDetails } from "@/app/_lib/types";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const orders = db
    .prepare(
      `SELECT so.*, s.name as supply_name, s.type as supply_type,
              s.photo_url as supply_photo_url, u.name as orderer_name
       FROM stock_orders so
       JOIN supplies s ON s.id = so.supply_id
       JOIN users u ON u.id = so.ordered_by
       ORDER BY so.ordered_at DESC`
    )
    .all() as OrderWithDetails[];

  return Response.json({ data: orders });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { supply_id, quantity, notes } = await request.json();
    if (!supply_id || !quantity) {
      return Response.json({ error: "supply_id and quantity are required" }, { status: 400 });
    }

    const db = getDb();
    const supply = db.prepare("SELECT id FROM supplies WHERE id = ?").get(supply_id);
    if (!supply) return Response.json({ error: "Supply not found" }, { status: 404 });

    const result = db
      .prepare(
        `INSERT INTO stock_orders (supply_id, quantity, status, notes, ordered_by)
         VALUES (?, ?, 'pending', ?, ?)`
      )
      .run(supply_id, quantity, notes ?? null, session.userId);

    const order = db
      .prepare(
        `SELECT so.*, s.name as supply_name, s.type as supply_type,
                s.photo_url as supply_photo_url, u.name as orderer_name
         FROM stock_orders so
         JOIN supplies s ON s.id = so.supply_id
         JOIN users u ON u.id = so.ordered_by
         WHERE so.id = ?`
      )
      .get(result.lastInsertRowid) as OrderWithDetails;

    return Response.json({ data: order }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
