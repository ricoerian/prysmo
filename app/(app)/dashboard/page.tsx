"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Printer, Package, TrendingDown, ShoppingCart, AlertTriangle,
  CheckCircle, LogOut, Clock,
} from "lucide-react";
import type { DashboardStats } from "@/app/_lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/dashboard");
    const json = await res.json() as { data: DashboardStats };
    setStats(json.data ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchStats();
    // fetchStats is stable (defined with useCallback + no deps) so this is safe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  // FAB on dashboard navigates to printers
  useEffect(() => {
    const handler = () => router.push("/printers");
    window.addEventListener("prysmo:openForm", handler);
    return () => window.removeEventListener("prysmo:openForm", handler);
  }, [router]);

  const STATS = stats
    ? [
        {
          label: "Total Printers",
          sub: `${stats.activePrinters} active`,
          value: stats.totalPrinters,
          color: "var(--primary)",
          bg: "var(--primary-dim)",
          icon: <Printer size={20} />,
        },
        {
          label: "Supply Types",
          sub: `${stats.lowStockCount} low stock`,
          value: stats.totalSupplies,
          color: "#2563eb",
          bg: "rgba(59,130,246,0.10)",
          icon: <Package size={20} />,
        },
        {
          label: "Low Stock",
          sub: "need reorder",
          value: stats.lowStockCount,
          color: stats.lowStockCount > 0 ? "var(--danger)" : "var(--success)",
          bg: stats.lowStockCount > 0 ? "var(--danger-dim)" : "var(--success-dim)",
          icon: <TrendingDown size={20} />,
        },
        {
          label: "Pending Orders",
          sub: "awaiting fulfillment",
          value: stats.pendingOrders,
          color: "var(--warning)",
          bg: "var(--warning-dim)",
          icon: <ShoppingCart size={20} />,
        },
      ]
    : [];

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview &amp; alerts</p>
        </div>
        <button
          className="btn-ghost"
          onClick={handleLogout}
          aria-label="Logout"
          style={{ padding: 8, color: "var(--text-muted)" }}
        >
          <LogOut size={20} />
        </button>
      </div>

      {/* Low stock alert */}
      {stats && stats.lowStockCount > 0 && (
        <div className="alert-banner alert-danger animate-in">
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>{stats.lowStockCount} supply item{stats.lowStockCount > 1 ? "s" : ""} running low.</strong>{" "}
            <Link href="/supplies" style={{ color: "var(--primary-dark)", textDecoration: "underline" }}>
              View supplies
            </Link>
          </span>
        </div>
      )}

      {loading ? (
        <div className="empty-state"><span className="spinner" /></div>
      ) : (
        <>
          {/* Stats grid */}
          <div className="stats-grid">
            {STATS.map((s, i) => (
              <div
                key={s.label}
                className={`stat-card animate-in stagger-${i + 1}`}
              >
                <div className="stat-icon" style={{ background: s.bg, color: s.color }}>
                  {s.icon}
                </div>
                <span className="stat-value" style={{ color: s.color }}>{s.value}</span>
                <span className="stat-label">{s.label}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.sub}</span>
              </div>
            ))}
          </div>

          {/* Low stock items */}
          {stats && stats.lowStockSupplies.length > 0 && (
            <div className="animate-in stagger-3" style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p className="section-title">
                  <AlertTriangle size={12} style={{ display: "inline", marginRight: 4 }} />
                  Low Stock Items
                </p>
                <Link href="/supplies?filter=low" style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>
                  See all
                </Link>
              </div>
              <div className="list-stack">
                {stats.lowStockSupplies.map((s) => (
                  <Link
                    key={s.id}
                    href={`/supplies/${s.id}`}
                    className="card card-press"
                    style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}
                  >
                    {s.photo_url ? (
                      <img src={s.photo_url} alt={s.name} className="photo-thumb-sm" />
                    ) : (
                      <div className="photo-placeholder">
                        <Package size={16} />
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{s.name}</p>
                      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {s.quantity} / {s.min_quantity} {s.unit} min
                      </p>
                    </div>
                    <span className="badge badge-low">LOW</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Recent orders */}
          {stats && (
            <div className="animate-in stagger-4">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p className="section-title">Recent Orders</p>
                <Link href="/orders" style={{ fontSize: 12, color: "var(--primary)", fontWeight: 600 }}>
                  See all
                </Link>
              </div>
              {stats.recentOrders.length === 0 ? (
                <div className="card" style={{ textAlign: "center", padding: "24px 16px", color: "var(--text-muted)", fontSize: 13 }}>
                  No orders yet
                </div>
              ) : (
                <div className="list-stack">
                  {stats.recentOrders.map((o) => (
                    <Link
                      key={o.id}
                      href="/orders"
                      className="card card-press"
                      style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}
                    >
                      {o.supply_photo_url ? (
                        <img src={o.supply_photo_url} alt={o.supply_name} className="photo-thumb-sm" />
                      ) : (
                        <div className="photo-placeholder">
                          <ShoppingCart size={16} />
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{o.supply_name}</p>
                        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          <Clock size={11} style={{ display: "inline", marginRight: 2 }} />
                          {new Date(o.ordered_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · Qty {o.quantity}
                        </p>
                      </div>
                      <span className={`badge badge-${o.status}`}>
                        {o.status === "fulfilled" ? <CheckCircle size={9} /> : o.status === "pending" ? <Clock size={9} /> : null}
                        {o.status.toUpperCase()}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Well-stocked message */}
          {stats && stats.lowStockCount === 0 && (
            <div className="alert-banner alert-success animate-in" style={{ marginTop: 16 }}>
              <CheckCircle size={16} style={{ flexShrink: 0 }} />
              <span>All supplies are well-stocked</span>
            </div>
          )}
        </>
      )}
    </>
  );
}
