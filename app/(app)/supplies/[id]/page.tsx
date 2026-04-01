"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Package, FileText, Droplets, Box, AlertTriangle,
  Printer, Edit2, ShoppingCart, X, Plus, Settings
} from "lucide-react";
import type { SupplyWithPrinters, Printer as PrinterType } from "@/app/_lib/types";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  paper:     <FileText size={20} />,
  cartridge: <Box size={20} />,
  ink:       <Droplets size={20} />,
  toner:     <Box size={20} />,
  other:     <Package size={20} />,
};

const TYPE_BADGE: Record<string, string> = {
  paper:     "badge badge-paper",
  cartridge: "badge badge-cartridge",
  ink:       "badge badge-ink",
  toner:     "badge badge-toner",
  other:     "badge badge-other",
};

export default function SupplyDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };

  const [supply, setSupply] = useState<SupplyWithPrinters | null>(null);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<"edit" | "order" | "printers" | null>(null);
  const [editForm, setEditForm] = useState({
    name: "", type: "", sku: "", quantity: 0, min_quantity: 0,
    default_order_quantity: 10, unit: "", notes: "", photo_url: "",
  });
  const [orderQty, setOrderQty] = useState(0);
  const [orderNotes, setOrderNotes] = useState("");
  const [allPrinters, setAllPrinters] = useState<(PrinterType & { is_linked: boolean; quantity_used: number })[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchSupply = useCallback(async () => {
    const res = await fetch(`/api/supplies/${id}`);
    const json = await res.json() as { data: SupplyWithPrinters };
    setSupply(json.data ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchSupply(); }, [fetchSupply]);

  function openEdit() {
    if (!supply) return;
    setEditForm({
      name: supply.name, type: supply.type, sku: supply.sku ?? "",
      quantity: supply.quantity, min_quantity: supply.min_quantity,
      default_order_quantity: supply.default_order_quantity || 10,
      unit: supply.unit, notes: supply.notes ?? "", photo_url: supply.photo_url ?? "",
    });
    setSheet("edit");
  }

  function openOrder() {
    if (!supply) return;
    setOrderQty(supply.default_order_quantity || 10);
    setOrderNotes("");
    setSheet("order");
  }

  async function openPrinters() {
    setSaving(true);
    try {
      const res = await fetch(`/api/supplies/${id}/printers`);
      const json = await res.json();
      setAllPrinters(json.data ?? []);
      setSheet("printers");
    } finally {
      setSaving(false);
    }
  }

  async function togglePrinter(printerId: number, isLinked: boolean, currentQty: number) {
    setSaving(true);
    try {
      await fetch(`/api/supplies/${id}/printers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          printer_id: printerId, 
          action: isLinked ? "unlink" : "link",
          quantity_used: currentQty || 1
        }),
      });
      // Refresh list
      const res = await fetch(`/api/supplies/${id}/printers`);
      const json = await res.json();
      setAllPrinters(json.data ?? []);
      await fetchSupply();
    } finally {
      setSaving(false);
    }
  }

  async function updateUsageQty(printerId: number, newQty: number) {
    setSaving(true);
    try {
      await fetch(`/api/supplies/${id}/printers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          printer_id: printerId, 
          action: "update",
          quantity_used: newQty
        }),
      });
      await fetchSupply();
      // Optional: update local allPrinters state for smoothness
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`/api/supplies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      setSheet(null);
      await fetchSupply();
    } finally {
      setSaving(false);
    }
  }

  async function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!supply) return;
    setSaving(true);
    try {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supply_id: supply.id, quantity: orderQty, notes: orderNotes }),
      });
      setSheet(null);
      router.push("/orders");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this supply? All linked orders will also be removed.")) return;
    await fetch(`/api/supplies/${id}`, { method: "DELETE" });
    router.push("/supplies");
  }

  if (loading) return <div className="empty-state" style={{ paddingTop: 80 }}><span className="spinner" /></div>;
  if (!supply) return <div className="empty-state" style={{ paddingTop: 80 }}><Package size={40} /><h3>Not found</h3></div>;

  const pct = supply.min_quantity > 0
    ? Math.min(100, Math.round((supply.quantity / supply.min_quantity) * 100))
    : 100;
  const level = pct >= 100 ? "ok" : pct >= 50 ? "warn" : "danger";

  return (
    <>
      <div style={{ paddingTop: 16 }}>
        <button className="detail-back" onClick={() => router.push("/supplies")}>
          <ArrowLeft size={16} /> Supplies
        </button>
      </div>

      {/* Hero Photo */}
      <div className="card animate-in" style={{ marginBottom: 16, padding: 0, overflow: "hidden" }}>
        {supply.photo_url ? (
          <img src={supply.photo_url} alt={supply.name} className="photo-thumb" />
        ) : (
          <div style={{
            height: 120, background: "var(--primary-dim)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ color: "var(--primary)" }}>
              {TYPE_ICONS[supply.type] ?? <Package size={40} />}
            </span>
          </div>
        )}
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{supply.name}</h2>
              {supply.sku && <p style={{ fontSize: 13, color: "var(--text-muted)" }}>SKU: {supply.sku}</p>}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <span className={TYPE_BADGE[supply.type] ?? "badge badge-other"}>{supply.type}</span>
              {supply.is_low && (
                <span className="badge badge-low"><AlertTriangle size={9} /> LOW</span>
              )}
            </div>
          </div>

          {/* Stock gauge */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>STOCK LEVEL</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: level === "ok" ? "var(--success)" : level === "warn" ? "var(--warning)" : "var(--danger)" }}>
                {supply.quantity} / {supply.min_quantity} {supply.unit} min
              </span>
            </div>
            <div className="stock-bar-wrap" style={{ height: 8 }}>
              <div className={`stock-bar-fill ${level}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        <button className="btn btn-secondary" onClick={openEdit}>
          <Edit2 size={15} /> Edit
        </button>
        <button className="btn btn-primary" onClick={openOrder}>
          <ShoppingCart size={15} /> Restock
        </button>
      </div>

      {/* Details */}
      <div className="card animate-in stagger-2" style={{ marginBottom: 16 }}>
        <p className="section-title">Details</p>
        <div className="info-row">
          <span className="info-label">Current Stock</span>
          <span className="info-value" style={{ color: supply.is_low ? "var(--danger)" : "var(--text-primary)", fontWeight: 700 }}>
            {supply.quantity} {supply.unit}
          </span>
        </div>
        <div className="info-row">
          <span className="info-label">Minimum Stock</span>
          <span className="info-value">{supply.min_quantity} {supply.unit}</span>
        </div>
        {supply.notes && (
          <div className="info-row">
            <span className="info-label">Notes</span>
            <span className="info-value" style={{ maxWidth: "60%", wordBreak: "break-word" }}>{supply.notes}</span>
          </div>
        )}
        <div className="info-row">
          <span className="info-label">Added</span>
          <span className="info-value">
            {new Date(supply.created_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}
          </span>
        </div>
      </div>

      {/* Linked Printers */}
      <div className="animate-in stagger-3" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <p className="section-title" style={{ marginBottom: 0 }}>
            Used by ({supply.printers.length} printer{supply.printers.length !== 1 ? "s" : ""})
          </p>
          <button className="btn-ghost" style={{ fontSize: 13, color: "var(--primary)" }} onClick={openPrinters}>
            <Settings size={14} /> Manage
          </button>
        </div>
        {supply.printers.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "20px 16px", color: "var(--text-muted)", fontSize: 13 }}>
            Not linked to any printers
          </div>
        ) : (
          <div className="list-stack">
            {supply.printers.map((p) => (
              <div key={p.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {p.photo_url ? (
                  <img src={p.photo_url} alt={p.name} className="photo-thumb-sm" />
                ) : (
                  <div className="photo-placeholder"><Printer size={18} /></div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{p.name}</p>
                  <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.location}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: "var(--primary)" }}>{p.quantity_used || 1}</p>
                  <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Used</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, marginBottom: 8 }}>
        <button className="btn btn-danger btn-full" onClick={handleDelete}>Delete Supply</button>
      </div>

      {/* Overlay */}
      <div className={`sheet-overlay${sheet ? " open" : ""}`} onClick={() => setSheet(null)} aria-hidden="true" />

      {/* Edit Sheet */}
      <div className={`bottom-sheet${sheet === "edit" ? " open" : ""}`} role="dialog" aria-label="Edit Supply" aria-modal="true">
        <div className="sheet-handle" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 className="sheet-title" style={{ marginBottom: 0 }}>Edit Supply</h2>
          <button className="btn-ghost" onClick={() => setSheet(null)} aria-label="Close"><X size={20} /></button>
        </div>
        <form onSubmit={saveEdit}>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-name">Name *</label>
            <input id="edit-name" className="form-input" value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-type">Type</label>
              <select id="edit-type" className="form-select" value={editForm.type}
                onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="paper">Paper</option>
                <option value="cartridge">Cartridge</option>
                <option value="ink">Ink</option>
                <option value="toner">Toner</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-sku">SKU</label>
              <input id="edit-sku" className="form-input" value={editForm.sku}
                onChange={(e) => setEditForm((f) => ({ ...f, sku: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-qty">Qty *</label>
              <input id="edit-qty" type="number" className="form-input" min={0}
                value={editForm.quantity}
                onChange={(e) => setEditForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 0 }))} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-min">Min Qty</label>
              <input id="edit-min" type="number" className="form-input" min={0}
                value={editForm.min_quantity}
                onChange={(e) => setEditForm((f) => ({ ...f, min_quantity: parseInt(e.target.value) || 0 }))} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-order">Default Order</label>
              <input id="edit-order" type="number" className="form-input" min={1}
                value={editForm.default_order_quantity}
                onChange={(e) => setEditForm((f) => ({ ...f, default_order_quantity: parseInt(e.target.value) || 1 }))} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-unit">Unit</label>
              <input id="edit-unit" className="form-input" value={editForm.unit}
                onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-notes">Notes</label>
            <textarea id="edit-notes" className="form-textarea" value={editForm.notes}
              onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSheet(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving}>
              {saving ? <span className="spinner" /> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>

      {/* Restock Order Sheet */}
      <div className={`bottom-sheet${sheet === "order" ? " open" : ""}`} role="dialog" aria-label="Place Order" aria-modal="true">
        <div className="sheet-handle" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 className="sheet-title" style={{ marginBottom: 0 }}>Place Restock Order</h2>
          <button className="btn-ghost" onClick={() => setSheet(null)} aria-label="Close"><X size={20} /></button>
        </div>
        <form onSubmit={placeOrder}>
          <div style={{ background: "var(--primary-dim)", borderRadius: "var(--radius-md)", padding: "12px 14px", marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "var(--primary-dark)", fontWeight: 500 }}>
              {supply.name} — current stock: <strong>{supply.quantity} {supply.unit}</strong>
            </p>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="order-qty">Quantity to Order *</label>
            <input id="order-qty" type="number" className="form-input" min={1}
              value={orderQty} onChange={(e) => setOrderQty(parseInt(e.target.value) || 1)} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="order-notes">Notes</label>
            <textarea id="order-notes" className="form-textarea" placeholder="Optional notes…"
              value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSheet(null)}>Cancel</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving || orderQty < 1}>
              {saving ? <span className="spinner" /> : <><Plus size={16} /> Place Order</>}
            </button>
          </div>
        </form>
      </div>
      {/* Printer Connections Sheet */}
      <div className={`bottom-sheet${sheet === "printers" ? " open" : ""}`} role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 className="sheet-title" style={{ marginBottom: 0 }}>Printer Connections</h2>
          <button className="btn-ghost" onClick={() => setSheet(null)} aria-label="Close"><X size={20} /></button>
        </div>
        <div className="list-stack" style={{ maxHeight: "60vh", overflowY: "auto", paddingBottom: 20 }}>
          {allPrinters.map((p) => (
            <div key={p.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12, border: p.is_linked ? "1px solid var(--primary-dim)" : "1px solid transparent", opacity: p.is_linked ? 1 : 0.7 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{p.name}</p>
                <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.brand} {p.model}</p>
              </div>
              {p.is_linked && (
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <label style={{ fontSize: 10, color: "var(--text-muted)" }}>QTY:</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    style={{ width: 50, height: 28, padding: "0 4px", textAlign: "center" }}
                    defaultValue={p.quantity_used || 1} 
                    onBlur={(e) => updateUsageQty(p.id, parseInt(e.target.value) || 1)}
                  />
                </div>
              )}
              <button 
                className={`btn btn-sm ${p.is_linked ? "btn-secondary" : "btn-primary"}`}
                style={{ padding: "4px 12px", fontSize: 12 }}
                onClick={() => togglePrinter(p.id, p.is_linked, p.quantity_used)}
                disabled={saving}
              >
                {p.is_linked ? "Unlink" : "Link"}
              </button>
            </div>
          ))}
          {allPrinters.length === 0 && (
            <div style={{ textAlign: "center", padding: 20, color: "var(--text-muted)" }}>No printers found</div>
          )}
        </div>
      </div>
    </>
  );
}
