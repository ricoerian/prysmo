import { query } from "@/app/_lib/db";
import { getSession } from "@/app/_lib/auth";
import type { PrintRunWithDetails, PrintRunItem } from "@/app/_lib/types";

type RawRun = Omit<PrintRunWithDetails, "items" | "packed_count" | "total_count">;

async function getRunWithItems(id: string | number): Promise<PrintRunWithDetails | null> {
  const runRes = await query<RawRun>(
    `SELECT pr.*, p.name AS printer_name, p.location AS printer_location
     FROM print_runs pr
     JOIN printers p ON p.id = pr.printer_id
     WHERE pr.id = $1`,
    [id]
  );
  if (runRes.rows.length === 0) return null;

  const itemsRes = await query<PrintRunItem>(
    `SELECT pri.*, s.name AS supply_name, s.type AS supply_type,
            s.unit AS supply_unit, s.photo_url AS supply_photo_url
     FROM print_run_items pri
     JOIN supplies s ON s.id = pri.supply_id
     WHERE pri.run_id = $1
     ORDER BY pri.id ASC`,
    [id]
  );

  const items = itemsRes.rows;
  return {
    ...runRes.rows[0],
    items,
    packed_count: items.filter((i) => i.is_packed).length,
    total_count: items.length,
  };
}

export async function GET(
  _req: Request,
  ctx: RouteContext<"/api/print-runs/[id]">
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const run = await getRunWithItems(id);

  if (!run) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ data: run }, { headers: { "Cache-Control": "private, no-cache" } });
}

/** Toggle item packed status */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/print-runs/[id]">
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const run = await query("SELECT id FROM print_runs WHERE id = $1", [id]);
  if (run.rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });

  try {
    const body = (await request.json()) as { item_id?: number; is_packed?: boolean };
    const { item_id, is_packed } = body;

    if (item_id !== undefined && is_packed !== undefined) {
      await query(
        "UPDATE print_run_items SET is_packed = $1 WHERE id = $2 AND run_id = $3",
        [is_packed, item_id, id]
      );
    }

    const updated = await getRunWithItems(id);
    return Response.json({ data: updated });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  ctx: RouteContext<"/api/print-runs/[id]">
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const run = await query("SELECT id FROM print_runs WHERE id = $1", [id]);
  if (run.rows.length === 0) return Response.json({ error: "Not found" }, { status: 404 });

  await query("DELETE FROM print_runs WHERE id = $1", [id]);
  return Response.json({ data: { success: true } });
}
