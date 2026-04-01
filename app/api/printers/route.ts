import { query, initDb } from "@/app/_lib/db";
import { getSession } from "@/app/_lib/auth";
import type { Printer } from "@/app/_lib/types";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await initDb();
  
  // Get all printers
  const printersRes = await query<Printer>("SELECT * FROM printers ORDER BY created_at DESC");
  const printers = printersRes.rows;

  // Get all printer supply links with supply details
  const linksRes = await query(
    `SELECT ps.printer_id, ps.quantity_used, s.id as supply_id, s.name as supply_name, s.unit as supply_unit, s.type as supply_type
     FROM printer_supplies ps
     JOIN supplies s ON s.id = ps.supply_id`
  );
  const links = linksRes.rows;

  // Group supplies for each printer
  const data = printers.map(p => ({
    ...p,
    supplies: links.filter(l => l.printer_id === p.id)
  }));

  return Response.json({ data });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await initDb();
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
