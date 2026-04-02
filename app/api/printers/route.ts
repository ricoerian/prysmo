import { query } from "@/app/_lib/db";
import { getSession } from "@/app/_lib/auth";
import type { Printer } from "@/app/_lib/types";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Single query: printers with their supplies aggregated via json_agg.
  // This replaces the previous two-query + JS .filter() approach.
  const { rows } = await query<
    Printer & { supplies: { supply_id: number; supply_name: string; supply_unit: string; supply_type: string; quantity_used: number }[] }
  >(
    `SELECT p.*,
            COALESCE(
              json_agg(
                json_build_object(
                  'supply_id',    ps.supply_id,
                  'supply_name',  s.name,
                  'supply_unit',  s.unit,
                  'supply_type',  s.type,
                  'quantity_used', ps.quantity_used
                )
              ) FILTER (WHERE ps.supply_id IS NOT NULL),
              '[]'
            ) AS supplies
     FROM printers p
     LEFT JOIN printer_supplies ps ON ps.printer_id = p.id
     LEFT JOIN supplies s ON s.id = ps.supply_id
     GROUP BY p.id
     ORDER BY p.created_at ASC`
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
    const { name, model, brand, location, status, notes, photo_url } = await request.json();
    if (!name || !model || !brand || !location) {
      return Response.json({ error: "name, model, brand, location are required" }, { status: 400 });
    }

    const { rows } = await query<Printer>(
      `INSERT INTO printers (name, model, brand, location, status, notes, photo_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [name, model, brand, location, status ?? "active", notes ?? null, photo_url ?? null]
    );

    return Response.json({ data: rows[0] }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
