import { query } from "@/app/_lib/db";
import { getSession } from "@/app/_lib/auth";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  // Get all supplies and mark which ones are linked to this printer
  const { rows } = await query(
    `SELECT s.*, 
            ps.quantity_used,
            CASE WHEN ps.printer_id IS NOT NULL THEN TRUE ELSE FALSE END AS is_linked
     FROM supplies s
     LEFT JOIN printer_supplies ps ON ps.supply_id = s.id AND ps.printer_id = $1
     ORDER BY s.name ASC`,
    [id]
  );

  return Response.json(
    { data: rows },
    { headers: { "Cache-Control": "private, no-cache" } }
  );
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { id } = await ctx.params; // printer_id
    const { supply_id, quantity_used, action } = await request.json();

    if (action === "unlink") {
      await query(
        "DELETE FROM printer_supplies WHERE printer_id = $1 AND supply_id = $2",
        [id, supply_id]
      );
    } else {
      // Link or Update
      await query(
        `INSERT INTO printer_supplies (printer_id, supply_id, quantity_used)
         VALUES ($1, $2, $3)
         ON CONFLICT (printer_id, supply_id) 
         DO UPDATE SET quantity_used = EXCLUDED.quantity_used`,
        [id, supply_id, quantity_used ?? 1]
      );
    }

    return Response.json({ success: true });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
