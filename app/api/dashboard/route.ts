import { getDb } from "@/app/_lib/db";
import { getSession } from "@/app/_lib/auth";
import type { DashboardStats, SupplyWithStatus, OrderWithDetails } from "@/app/_lib/types";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const db = getDb();

  const totalPrinters = (db.prepare("SELECT COUNT(*) as c FROM printers").get() as { c: number }).c;
  const activePrinters = (
    db.prepare("SELECT COUNT(*) as c FROM printers WHERE status = 'active'").get() as { c: number }
  ).c;
  const totalSupplies = (db.prepare("SELECT COUNT(*) as c FROM supplies").get() as { c: number }).c;
  const lowStockCount = (
    db
      .prepare("SELECT COUNT(*) as c FROM supplies WHERE quantity <= min_quantity")
      .get() as { c: number }
  ).c;
  const pendingOrders = (
    db
      .prepare("SELECT COUNT(*) as c FROM stock_orders WHERE status = 'pending'")
      .get() as { c: number }
  ).c;

  const lowStockSupplies = db
    .prepare(
      `SELECT *, 1 as is_low FROM supplies WHERE quantity <= min_quantity ORDER BY quantity ASC LIMIT 10`
    )
    .all() as SupplyWithStatus[];

  const recentOrders = db
    .prepare(
      `SELECT so.*, s.name as supply_name, s.type as supply_type, u.name as orderer_name
       FROM stock_orders so
       JOIN supplies s ON s.id = so.supply_id
       JOIN users u ON u.id = so.ordered_by
       ORDER BY so.ordered_at DESC LIMIT 5`
    )
    .all() as OrderWithDetails[];

  const stats: DashboardStats = {
    totalPrinters,
    activePrinters,
    totalSupplies,
    lowStockCount,
    pendingOrders,
    lowStockSupplies,
    recentOrders,
  };

  return Response.json({ data: stats });
}
