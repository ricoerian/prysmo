import { getDb } from "@/app/_lib/db";
import { getSession } from "@/app/_lib/auth";
import type { PrintRunWithDetails } from "@/app/_lib/types";

type RawItem = {
  id: number;
  run_id: number;
  supply_id: number;
  quantity_needed: number;
  is_packed: number; // SQLite stores as 0/1
  supply_name: string;
  supply_type: string;
  supply_unit: string;
  supply_photo_url: string | null;
};

function getRunWithItems(
  db: ReturnType<typeof getDb>,
  id: string | number
): PrintRunWithDetails | null {
  const run = db
    .prepare(
      `SELECT pr.*, p.name as printer_name, p.location as printer_location
       FROM print_runs pr
       JOIN printers p ON p.id = pr.printer_id
       WHERE pr.id = ?`
    )
    .get(id) as Omit<PrintRunWithDetails, "items" | "packed_count" | "total_count"> | undefined;

  if (!run) return null;

  const rawItems = db
    .prepare(
      `SELECT pri.*, s.name as supply_name, s.type as supply_type,
              s.unit as supply_unit, s.photo_url as supply_photo_url
       FROM print_run_items pri
       JOIN supplies s ON s.id = pri.supply_id
       WHERE pri.run_id = ?
       ORDER BY pri.id ASC`
    )
    .all(id) as RawItem[];

  const items = rawItems.map((i) => ({
    ...i,
    is_packed: i.is_packed === 1,
  }));

  return {
    ...run,
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
  const db = getDb();
  const run = getRunWithItems(db, id);

  if (!run) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ data: run });
}

/** Toggle item packed status */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/print-runs/[id]">
) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const db = getDb();
  const run = db.prepare("SELECT id FROM print_runs WHERE id = ?").get(id);
  if (!run) return Response.json({ error: "Not found" }, { status: 404 });

  try {
    const body = (await request.json()) as { item_id?: number; is_packed?: boolean };
    const { item_id, is_packed } = body;

    if (item_id !== undefined && is_packed !== undefined) {
      db.prepare(
        "UPDATE print_run_items SET is_packed = ? WHERE id = ? AND run_id = ?"
      ).run(is_packed ? 1 : 0, item_id, id);
    }

    const updated = getRunWithItems(db, id);
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
  const db = getDb();
  const run = db.prepare("SELECT id FROM print_runs WHERE id = ?").get(id);
  if (!run) return Response.json({ error: "Not found" }, { status: 404 });

  db.prepare("DELETE FROM print_runs WHERE id = ?").run(id);
  return Response.json({ data: { success: true } });
}
