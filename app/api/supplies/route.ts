import { getDb } from "@/app/_lib/db";
import { getSession } from "@/app/_lib/auth";
import type { Supply } from "@/app/_lib/types";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const supplies = db
    .prepare(
      `SELECT *, CASE WHEN quantity <= min_quantity THEN 1 ELSE 0 END as is_low
       FROM supplies ORDER BY name ASC`
    )
    .all() as (Supply & { is_low: number })[];

  return Response.json({
    data: supplies.map((s) => ({ ...s, is_low: s.is_low === 1 })),
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { name, type, sku, quantity, min_quantity, unit, notes, photo_url } = await request.json();
    if (!name || quantity === undefined || min_quantity === undefined) {
      return Response.json(
        { error: "name, quantity, min_quantity are required" },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO supplies (name, type, sku, quantity, min_quantity, unit, notes, photo_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(name, type ?? "other", sku ?? null, quantity, min_quantity, unit ?? "pcs", notes ?? null, photo_url ?? null);

    const supply = db
      .prepare("SELECT * FROM supplies WHERE id = ?")
      .get(result.lastInsertRowid) as Supply;

    // Auto-alert: create pending order if quantity is below min
    if (quantity <= min_quantity) {
      db.prepare(
        `INSERT INTO stock_orders (supply_id, quantity, status, notes, ordered_by)
         VALUES (?, ?, 'pending', 'Auto-generated: stock below minimum threshold', ?)`
      ).run(supply.id, min_quantity - quantity + min_quantity, session.userId);
    }

    return Response.json({ data: supply }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
