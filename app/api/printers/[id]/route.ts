import { query, getPool } from "@/app/_lib/db";
import { getSession } from "@/app/_lib/auth";
import type { Printer, Supply } from "@/app/_lib/types";

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/printers/[id]">
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;

  const printerRes = await query<Printer>("SELECT * FROM printers WHERE id = $1", [id]);
  if (printerRes.rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });

  const suppliesRes = await query<Supply>(
    `SELECT s.* FROM supplies s
     JOIN printer_supplies ps ON ps.supply_id = s.id
     WHERE ps.printer_id = $1`,
    [id]
  );

  return Response.json(
    { data: { ...printerRes.rows[0], supplies: suppliesRes.rows } },
    { headers: { "Cache-Control": "private, no-cache" } }
  );
}

export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/printers/[id]">
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await query("SELECT id FROM printers WHERE id = $1", [id]);
  if (existing.rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });

  try {
    const { name, model, brand, location, status, notes, photo_url } = await request.json();
    const { rows } = await query<Printer>(
      `UPDATE printers
       SET name=$1, model=$2, brand=$3, location=$4, status=$5, notes=$6, photo_url=$7
       WHERE id=$8
       RETURNING *`,
      [name, model, brand, location, status, notes ?? null, photo_url ?? null, id]
    );
    return Response.json({ data: rows[0] });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/printers/[id]">
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const existing = await query("SELECT id FROM printers WHERE id = $1", [id]);
  if (existing.rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });

  await query("DELETE FROM printers WHERE id = $1", [id]);
  return Response.json({ data: { success: true } });
}

/** Link/unlink supplies — runs in a transaction */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/printers/[id]">
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const { supplyIds } = (await request.json()) as { supplyIds: number[] };
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM printer_supplies WHERE printer_id = $1", [id]);
    for (const sid of supplyIds) {
      await client.query(
        "INSERT INTO printer_supplies (printer_id, supply_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
        [id, sid]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  } finally {
    client.release();
  }

  return Response.json({ data: { success: true } });
}
