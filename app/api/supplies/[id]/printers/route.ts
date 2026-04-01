import { query, initDb } from "@/app/_lib/db";
import { getSession } from "@/app/_lib/auth";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await initDb();
  const { id } = await ctx.params;

  // Get all printers and mark which ones are linked to this supply
  const { rows } = await query(
    `SELECT p.*, 
            ps.quantity_used,
            CASE WHEN ps.supply_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_linked
     FROM printers p
     LEFT JOIN printer_supplies ps ON ps.printer_id = p.id AND ps.supply_id = $1
     ORDER BY p.name ASC`,
    [id]
  );

  return Response.json({ data: rows });
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await initDb();
    const { id } = await ctx.params;
    const { printer_id, quantity_used, action } = await request.json();

    if (action === "unlink") {
      await query(
        "DELETE FROM printer_supplies WHERE supply_id = $1 AND printer_id = $2",
        [id, printer_id]
      );
    } else {
      // Link or Update
      await query(
        `INSERT INTO printer_supplies (supply_id, printer_id, quantity_used)
         VALUES ($1, $2, $3)
         ON CONFLICT (supply_id, printer_id) 
         DO UPDATE SET quantity_used = EXCLUDED.quantity_used`,
        [id, printer_id, quantity_used ?? 1]
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
