import { getDb } from "@/app/_lib/db";
import { getSession } from "@/app/_lib/auth";
import type { PrintRunWithDetails } from "@/app/_lib/types";

type RawItem = {
  id: number;
  run_id: number;
  supply_id: number;
  quantity_needed: number;
  is_packed: number; // SQLite 0/1
  supply_name: string;
  supply_type: string;
  supply_unit: string;
  supply_photo_url: string | null;
};

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();
  const runs = db
    .prepare(
      `SELECT pr.*, p.name as printer_name, p.location as printer_location
       FROM print_runs pr
       JOIN printers p ON p.id = pr.printer_id
       ORDER BY pr.created_at DESC`
    )
    .all() as Omit<PrintRunWithDetails, "items" | "packed_count" | "total_count">[];

  const result: PrintRunWithDetails[] = runs.map((run) => {
    const rawItems = db
      .prepare(
        `SELECT pri.*, s.name as supply_name, s.type as supply_type,
                s.unit as supply_unit, s.photo_url as supply_photo_url
         FROM print_run_items pri
         JOIN supplies s ON s.id = pri.supply_id
         WHERE pri.run_id = ?
         ORDER BY pri.id ASC`
      )
      .all(run.id) as RawItem[];

    const items = rawItems.map((i) => ({ ...i, is_packed: i.is_packed === 1 }));

    return {
      ...run,
      items,
      packed_count: items.filter((i) => i.is_packed).length,
      total_count: items.length,
    };
  });

  return Response.json({ data: result });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
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
      return Response.json(
        { error: "printer_id and name are required" },
        { status: 400 }
      );
    }

    const db = getDb();

    const printer = db.prepare("SELECT id FROM printers WHERE id = ?").get(printer_id);
    if (!printer) return Response.json({ error: "Printer not found" }, { status: 404 });

    const runId = db.transaction(() => {
      const res = db
        .prepare(
          `INSERT INTO print_runs (printer_id, name, notes, created_by)
           VALUES (?, ?, ?, ?)`
        )
        .run(printer_id, name, notes ?? null, session.userId);

      const insertItem = db.prepare(
        `INSERT INTO print_run_items (run_id, supply_id, quantity_needed)
         VALUES (?, ?, ?)`
      );

      for (const item of items ?? []) {
        insertItem.run(res.lastInsertRowid, item.supply_id, item.quantity_needed);
      }

      return res.lastInsertRowid;
    })();

    const run = db
      .prepare(
        `SELECT pr.*, p.name as printer_name, p.location as printer_location
         FROM print_runs pr
         JOIN printers p ON p.id = pr.printer_id
         WHERE pr.id = ?`
      )
      .get(runId) as Omit<PrintRunWithDetails, "items" | "packed_count" | "total_count">;

    const rawItems = db
      .prepare(
        `SELECT pri.*, s.name as supply_name, s.type as supply_type,
                s.unit as supply_unit, s.photo_url as supply_photo_url
         FROM print_run_items pri
         JOIN supplies s ON s.id = pri.supply_id
         WHERE pri.run_id = ?`
      )
      .all(runId) as RawItem[];

    const mappedItems = rawItems.map((i) => ({ ...i, is_packed: i.is_packed === 1 }));

    return Response.json(
      {
        data: {
          ...run,
          items: mappedItems,
          packed_count: 0,
          total_count: mappedItems.length,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
