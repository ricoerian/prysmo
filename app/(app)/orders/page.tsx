"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  ShoppingCart, Clock, CheckCircle, XCircle, X, ChevronRight,
  Package, FileText, Droplets, Box, AlertTriangle,
  ClipboardList, Printer, Trash2, Check, Plus,
} from "lucide-react";
import type { OrderWithDetails, PrintRunWithDetails, SupplyWithStatus } from "@/app/_lib/types";

// ── Types ──────────────────────────────────────────────────────────────────
type Tab = "orders" | "printruns";
type StatusFilter = "all" | "pending" | "fulfilled" | "cancelled";

const STATUS_BADGE: Record<string, string> = {
  pending:   "badge badge-pending",
  fulfilled: "badge badge-fulfilled",
  cancelled: "badge badge-cancelled",
};
const STATUS_ICON: Record<string, React.ReactNode> = {
  pending:   <Clock size={11} />,
  fulfilled: <CheckCircle size={11} />,
  cancelled: <XCircle size={11} />,
};
const TYPE_ICONS: Record<string, React.ReactNode> = {
  paper:     <FileText size={18} />,
  cartridge: <Box size={18} />,
  ink:       <Droplets size={18} />,
  toner:     <Box size={18} />,
  other:     <Package size={18} />,
};

// ── Component ──────────────────────────────────────────────────────────────
export default function OrdersPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("orders");

  // ─── Orders state ───────────────────────────────────────────────────────
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [actioning, setActioning] = useState<number | null>(null);

  // ─── Print runs state ───────────────────────────────────────────────────
  const [runs, setRuns] = useState<PrintRunWithDetails[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const [deletingRunId, setDeletingRunId] = useState<number | null>(null);

  // ─── Create Print Run Sheet ─────────────────────────────────────────────
  interface PrinterOption { id: number; name: string; location: string }
  const [sheet, setSheet] = useState(false);
  const [printers, setPrinters] = useState<PrinterOption[]>([]);
  const [allSupplies, setAllSupplies] = useState<SupplyWithStatus[]>([]);
  const [selectedPrinterId, setSelectedPrinterId] = useState<number | "">("");
  const [runName, setRunName] = useState("");
  const [runItems, setRunItems] = useState<{ supply_id: number; quantity_needed: number; supply_name: string }[]>([]);
  const [creatingRun, setCreatingRun] = useState(false);

  // ─── Fetch helpers ──────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/orders");
    const json = await res.json() as { data: OrderWithDetails[] };
    setOrders(json.data ?? []);
    setOrdersLoading(false);
  }, []);

  const fetchRuns = useCallback(async () => {
    const res = await fetch("/api/print-runs");
    const json = await res.json() as { data: PrintRunWithDetails[] };
    setRuns(json.data ?? []);
    setRunsLoading(false);
  }, []);

  const fetchSupportData = useCallback(async () => {
    const [printersRes, suppliesRes] = await Promise.all([
      fetch("/api/printers"),
      fetch("/api/supplies"),
    ]);
    const pJson = await printersRes.json() as { data: PrinterOption[] };
    const sJson = await suppliesRes.json() as { data: SupplyWithStatus[] };
    setPrinters(pJson.data ?? []);
    setAllSupplies(sJson.data ?? []);
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchRuns();
    fetchSupportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // FAB: open create sheet for the active tab
  useEffect(() => {
    const handler = () => {
      if (tab === "printruns") openCreateRunSheet();
      else router.push("/supplies"); // orders → go to supplies to restock
    };
    window.addEventListener("prysmo:openForm", handler);
    return () => window.removeEventListener("prysmo:openForm", handler);
  }, [tab, router]);

  // ─── Order actions ──────────────────────────────────────────────────────
  async function updateOrderStatus(id: number, status: "fulfilled" | "cancelled") {
    setActioning(id);
    try {
      await fetch(`/api/orders/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await fetchOrders();
    } finally {
      setActioning(null);
    }
  }

  // ─── Print Run actions ──────────────────────────────────────────────────
  function openCreateRunSheet() {
    setSelectedPrinterId("");
    setRunName(`Print Run — ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`);
    setRunItems([]);
    setSheet(true);
  }

  async function deleteRun(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this print run?")) return;
    setDeletingRunId(id);
    try {
      await fetch(`/api/print-runs/${id}`, { method: "DELETE" });
      await fetchRuns();
    } finally {
      setDeletingRunId(null);
    }
  }

  function toggleSupplyInRun(s: SupplyWithStatus) {
    setRunItems((prev) => {
      const exists = prev.find((i) => i.supply_id === s.id);
      if (exists) return prev.filter((i) => i.supply_id !== s.id);
      return [...prev, { supply_id: s.id, quantity_needed: 1, supply_name: s.name }];
    });
  }

  async function handleCreateRun(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPrinterId || !runName) return;
    setCreatingRun(true);
    try {
      const res = await fetch("/api/print-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          printer_id: selectedPrinterId,
          name: runName,
          items: runItems.filter((i) => i.quantity_needed > 0),
        }),
      });
      const json = await res.json() as { data: { id: number } };
      setSheet(false);
      await fetchRuns();
      if (json.data?.id) router.push(`/print-runs/${json.data.id}`);
    } finally {
      setCreatingRun(false);
    }
  }

  // ─── Derived ────────────────────────────────────────────────────────────
  const filteredOrders = statusFilter === "all" ? orders : orders.filter((o) => o.status === statusFilter);
  const pendingCount = orders.filter((o) => o.status === "pending").length;

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Orders</h1>
          <p className="page-subtitle">
            {tab === "orders"
              ? `${pendingCount} pending · ${orders.length} total`
              : `${runs.length} print run${runs.length !== 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* Main tab switcher */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        <button
          id="tab-orders"
          className={`btn ${tab === "orders" ? "btn-primary" : "btn-secondary"}`}
          style={{ flex: 1, gap: 6 }}
          onClick={() => setTab("orders")}
        >
          <ShoppingCart size={15} /> Stock Orders
          {pendingCount > 0 && (
            <span style={{
              background: tab === "orders" ? "rgba(255,255,255,0.25)" : "var(--primary-dim)",
              color: tab === "orders" ? "white" : "var(--primary)",
              borderRadius: 99, padding: "1px 6px", fontSize: 11, fontWeight: 700,
            }}>
              {pendingCount}
            </span>
          )}
        </button>
        <button
          id="tab-printruns"
          className={`btn ${tab === "printruns" ? "btn-primary" : "btn-secondary"}`}
          style={{ flex: 1, gap: 6 }}
          onClick={() => setTab("printruns")}
        >
          <ClipboardList size={15} /> Print Runs
          {runs.length > 0 && (
            <span style={{
              background: tab === "printruns" ? "rgba(255,255,255,0.25)" : "var(--primary-dim)",
              color: tab === "printruns" ? "white" : "var(--primary)",
              borderRadius: 99, padding: "1px 6px", fontSize: 11, fontWeight: 700,
            }}>
              {runs.length}
            </span>
          )}
        </button>
      </div>

      {/* ── ORDERS TAB ───────────────────────────────────────────────────── */}
      {tab === "orders" && (
        <>
          {pendingCount > 0 && (
            <div className="alert-banner alert-warning animate-in">
              <AlertTriangle size={15} style={{ flexShrink: 0 }} />
              <span><strong>{pendingCount}</strong> order{pendingCount > 1 ? "s" : ""} awaiting fulfillment</span>
            </div>
          )}

          {/* Status filter pills */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, overflowX: "auto", paddingBottom: 2 }}>
            {(["all", "pending", "fulfilled", "cancelled"] as StatusFilter[]).map((s) => (
              <button
                key={s}
                className={`btn ${statusFilter === s ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "7px 14px", fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}
                onClick={() => setStatusFilter(s)}
              >
                {s === "all" ? `All (${orders.length})` : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {ordersLoading && <div className="empty-state"><span className="spinner" /></div>}
          {!ordersLoading && filteredOrders.length === 0 && (
            <div className="empty-state animate-in">
              <ShoppingCart size={48} />
              <h3>No {statusFilter !== "all" ? statusFilter : ""} orders</h3>
              <p>Orders appear here when supplies run low, or create one from Supplies</p>
            </div>
          )}

          <div className="list-stack">
            {filteredOrders.map((order, i) => {
              const isOpen = expandedOrderId === order.id;
              return (
                <div
                  key={order.id}
                  className={`card animate-in stagger-${Math.min(i + 1, 4)}`}
                  style={{ padding: 0, overflow: "hidden" }}
                >
                  <button
                    id={`order-card-${order.id}`}
                    style={{ display: "flex", alignItems: "center", gap: 12, padding: 16, width: "100%", textAlign: "left" }}
                    onClick={() => setExpandedOrderId(isOpen ? null : order.id)}
                  >
                    {order.supply_photo_url ? (
                      <img src={order.supply_photo_url} alt={order.supply_name} className="photo-thumb-sm" />
                    ) : (
                      <div className="photo-placeholder">
                        {TYPE_ICONS[order.supply_type] ?? <Package size={18} />}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {order.supply_name}
                      </p>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                        Qty: {order.quantity} · {new Date(order.ordered_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </p>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                      <span className={STATUS_BADGE[order.status]}>
                        {STATUS_ICON[order.status]} {order.status.toUpperCase()}
                      </span>
                      <ChevronRight size={16} color="var(--text-muted)"
                        style={{ transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.2s" }} />
                    </div>
                  </button>
                  {isOpen && (
                    <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>
                      <div style={{ paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                        {order.notes && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Note: {order.notes}</p>}
                        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Ordered by {order.orderer_name}</p>
                        {order.fulfilled_at && (
                          <p style={{ fontSize: 12, color: "var(--success)" }}>
                            Fulfilled: {new Date(order.fulfilled_at).toLocaleDateString("en-US")}
                          </p>
                        )}
                        {order.status === "pending" && (
                          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                            <button
                              className="btn btn-danger"
                              style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}
                              disabled={actioning === order.id}
                              onClick={() => updateOrderStatus(order.id, "cancelled")}
                            >
                              {actioning === order.id ? <span className="spinner" /> : <><X size={14} /> Cancel</>}
                            </button>
                            <button
                              className="btn btn-primary"
                              style={{ flex: 2, padding: "8px 12px", fontSize: 13 }}
                              disabled={actioning === order.id}
                              onClick={() => updateOrderStatus(order.id, "fulfilled")}
                            >
                              {actioning === order.id ? <span className="spinner" /> : <><CheckCircle size={14} /> Mark Fulfilled</>}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── PRINT RUNS TAB ───────────────────────────────────────────────── */}
      {tab === "printruns" && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
              Supply checklists for your print jobs
            </p>
            <button
              className="btn btn-primary"
              style={{ padding: "8px 14px", fontSize: 13 }}
              onClick={openCreateRunSheet}
            >
              <Plus size={14} /> New
            </button>
          </div>

          {runsLoading && <div className="empty-state"><span className="spinner" /></div>}
          {!runsLoading && runs.length === 0 && (
            <div className="empty-state animate-in">
              <ClipboardList size={48} />
              <h3>No print runs yet</h3>
              <p>Create a checklist of supplies to bring for your next print job</p>
              <button className="btn btn-primary" onClick={openCreateRunSheet}>
                <Plus size={15} /> New Print Run
              </button>
            </div>
          )}

          <div className="list-stack">
            {runs.map((run, i) => {
              const pct = run.total_count > 0
                ? Math.round((run.packed_count / run.total_count) * 100) : 0;
              return (
                <button
                  key={run.id}
                  id={`run-card-${run.id}`}
                  className={`card card-press animate-in stagger-${Math.min(i + 1, 4)}`}
                  style={{ width: "100%", textAlign: "left", padding: 0, overflow: "hidden" }}
                  onClick={() => router.push(`/print-runs/${run.id}`)}
                >
                  <div style={{ padding: 16 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div className="photo-placeholder" style={{ marginTop: 2 }}>
                        <ClipboardList size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                            {run.name}
                          </p>
                          <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                            <button
                              style={{ padding: 6, background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}
                              onClick={(e) => deleteRun(run.id, e)}
                              disabled={deletingRunId === run.id}
                              aria-label="Delete run"
                            >
                              {deletingRunId === run.id
                                ? <span className="spinner" style={{ width: 14, height: 14 }} />
                                : <Trash2 size={14} />}
                            </button>
                            <ChevronRight size={16} color="var(--text-muted)" />
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <Printer size={12} color="var(--text-muted)" />
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            {run.printer_name} · {run.printer_location}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                          {new Date(run.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          {" · "}{run.total_count} item{run.total_count !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    {run.total_count > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>PACKED</span>
                          <span style={{ fontSize: 11, fontWeight: 700, color: pct === 100 ? "var(--success)" : "var(--primary)" }}>
                            {run.packed_count}/{run.total_count}
                          </span>
                        </div>
                        <div className="stock-bar-wrap">
                          <div className={`stock-bar-fill ${pct === 100 ? "ok" : "danger"}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ── Create Print Run Sheet ──────────────────────────────────────── */}
      <div className={`sheet-overlay${sheet ? " open" : ""}`} onClick={() => setSheet(false)} aria-hidden="true" />
      <div className={`bottom-sheet${sheet ? " open" : ""}`} role="dialog" aria-label="New Print Run" aria-modal="true">
        <div className="sheet-handle" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 className="sheet-title" style={{ marginBottom: 0 }}>New Print Run</h2>
          <button className="btn-ghost" onClick={() => setSheet(false)} aria-label="Close"><X size={20} /></button>
        </div>
        <form onSubmit={handleCreateRun}>
          {/* Run name */}
          <div className="form-group">
            <label className="form-label" htmlFor="run-name">Run Name *</label>
            <input id="run-name" className="form-input" value={runName}
              onChange={(e) => setRunName(e.target.value)} required />
          </div>

          {/* Printer selector */}
          <div className="form-group">
            <label className="form-label" htmlFor="run-printer">Printer *</label>
            {printers.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No printers yet — add one first</p>
            ) : (
              <select id="run-printer" className="form-select"
                value={selectedPrinterId}
                onChange={(e) => setSelectedPrinterId(Number(e.target.value))}
                required>
                <option value="">Select a printer…</option>
                {printers.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.location})</option>
                ))}
              </select>
            )}
          </div>

          {/* Supply items */}
          <p className="section-title" style={{ marginBottom: 10 }}>Supplies to Bring</p>
          {allSupplies.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>No supplies yet.</p>
          ) : (
            <div className="list-stack" style={{ marginBottom: 16, maxHeight: "35vh", overflowY: "auto" }}>
              {allSupplies.map((s) => {
                const item = runItems.find((i) => i.supply_id === s.id);
                return (
                  <div key={s.id} className="card" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px" }}>
                    <button type="button"
                      style={{
                        width: 22, height: 22, borderRadius: "50%",
                        border: `2px solid ${item ? "var(--primary)" : "var(--border)"}`,
                        background: item ? "var(--primary)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, cursor: "pointer", transition: "all 0.15s ease",
                      }}
                      onClick={() => toggleSupplyInRun(s)}
                    >
                      {item && <Check size={11} color="white" strokeWidth={3} />}
                    </button>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{s.name}</p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.type} · {s.unit}</p>
                    </div>
                    {item && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <button type="button" className="btn-ghost" style={{ padding: "2px 8px", fontSize: 18, fontWeight: 700 }}
                          onClick={() => setRunItems((prev) => prev.map((i) => i.supply_id === s.id ? { ...i, quantity_needed: Math.max(1, i.quantity_needed - 1) } : i))}>
                          −
                        </button>
                        <span style={{ minWidth: 24, textAlign: "center", fontWeight: 700, fontSize: 14 }}>{item.quantity_needed}</span>
                        <button type="button" className="btn-ghost" style={{ padding: "2px 8px", fontSize: 18, fontWeight: 700 }}
                          onClick={() => setRunItems((prev) => prev.map((i) => i.supply_id === s.id ? { ...i, quantity_needed: i.quantity_needed + 1 } : i))}>
                          +
                        </button>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{s.unit}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSheet(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }}
              disabled={creatingRun || !runName || !selectedPrinterId}>
              {creatingRun ? <span className="spinner" /> : <><ClipboardList size={15} /> Create &amp; Open</>}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
