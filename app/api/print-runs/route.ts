import { query, pool, initDb } from "@/app/_lib/db";
import { getSession } from "@/app/_lib/auth";
import type { PrintRunWithDetails, PrintRunItem } from "@/app/_lib/types";

type RawRun = Omit<PrintRunWithDetails, "items" | "packed_count" | "total_count">;

async function getRunWithItems(id: number | string): Promise<PrintRunWithDetails | null> {
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

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  await initDb();
  const runsRes = await query<RawRun>(
    `SELECT pr.*, p.name AS printer_name, p.location AS printer_location
     FROM print_runs pr
     JOIN printers p ON p.id = pr.printer_id
     ORDER BY pr.created_at DESC`
  );

  const result = await Promise.all(runsRes.rows.map((run) => getRunWithItems(run.id)));
  return Response.json({ data: result });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await initDb();
    const {
      printer_id,
      name,
      notes,
      items,
    }: {
      printer_id: number;
      name: string;
      notes?: string;
      items: Array<{ supply_id: number; quantity_needed: number }>;
    } = await request.json();

    if (!printer_id || !name) {
      return Response.json({ error: "printer_id and name are required" }, { status: 400 });
    }

    const printer = await query("SELECT id FROM printers WHERE id = $1", [printer_id]);
    if (printer.rows.length === 0) {
      return Response.json({ error: "Printer not found" }, { status: 404 });
    }

    const client = await pool.connect();
    let runId: number;
    try {
      await client.query("BEGIN");

      const runRes = await client.query<{ id: number }>(
        `INSERT INTO print_runs (printer_id, name, notes, created_by) VALUES ($1, $2, $3, $4) RETURNING id`,
        [printer_id, name, notes ?? null, session.userId]
      );
      runId = runRes.rows[0].id;

      for (const item of items ?? []) {
        await client.query(
          `INSERT INTO print_run_items (run_id, supply_id, quantity_needed) VALUES ($1, $2, $3)`,
          [runId, item.supply_id, item.quantity_needed]
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    const run = await getRunWithItems(runId!);
    return Response.json({ data: run }, { status: 201 });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
