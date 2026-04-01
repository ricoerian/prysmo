import { query, initDb } from "@/app/_lib/db";
import { getSession } from "@/app/_lib/auth";
import type { DashboardStats, SupplyWithStatus, OrderWithDetails } from "@/app/_lib/types";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    await initDb();

    const [
      totalPrintersRes,
      activePrintersRes,
      totalSuppliesRes,
      lowStockCountRes,
      pendingOrdersRes,
      lowStockSuppliesRes,
      recentOrdersRes,
    ] = await Promise.all([
      query<{ c: string }>("SELECT COUNT(*) AS c FROM printers"),
      query<{ c: string }>("SELECT COUNT(*) AS c FROM printers WHERE status = 'active'"),
      query<{ c: string }>("SELECT COUNT(*) AS c FROM supplies"),
      query<{ c: string }>("SELECT COUNT(*) AS c FROM supplies WHERE quantity <= min_quantity"),
      query<{ c: string }>("SELECT COUNT(*) AS c FROM stock_orders WHERE status = 'pending'"),
      query<SupplyWithStatus>(
        "SELECT *, TRUE AS is_low FROM supplies WHERE quantity <= min_quantity ORDER BY quantity ASC LIMIT 10"
      ),
      query<OrderWithDetails>(
        `SELECT so.*, s.name AS supply_name, s.type AS supply_type, u.name AS orderer_name
         FROM stock_orders so
         JOIN supplies s ON s.id = so.supply_id
         JOIN users u ON u.id = so.ordered_by
         ORDER BY so.ordered_at DESC LIMIT 5`
      ),
    ]);

    const stats: DashboardStats = {
      totalPrinters: parseInt(totalPrintersRes.rows[0].c, 10),
      activePrinters: parseInt(activePrintersRes.rows[0].c, 10),
      totalSupplies: parseInt(totalSuppliesRes.rows[0].c, 10),
      lowStockCount: parseInt(lowStockCountRes.rows[0].c, 10),
      pendingOrders: parseInt(pendingOrdersRes.rows[0].c, 10),
      lowStockSupplies: lowStockSuppliesRes.rows,
      recentOrders: recentOrdersRes.rows,
    };

    return Response.json({ data: stats });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
