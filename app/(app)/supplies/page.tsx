"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Package, FileText, Droplets, Box, AlertTriangle, ChevronRight,
  Image as ImageIcon, Plus, X, Filter,
} from "lucide-react";
import type { SupplyWithStatus } from "@/app/_lib/types";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  paper:     <FileText size={18} />,
  cartridge: <Box size={18} />,
  ink:       <Droplets size={18} />,
  toner:     <Box size={18} />,
  other:     <Package size={18} />,
};

const TYPE_BADGE: Record<string, string> = {
  paper:     "badge badge-paper",
  cartridge: "badge badge-cartridge",
  ink:       "badge badge-ink",
  toner:     "badge badge-toner",
  other:     "badge badge-other",
};

interface FormState {
  name: string; type: string; sku: string;
  quantity: number; min_quantity: number; default_order_quantity: number;
  unit: string; notes: string; photo_url: string;
}

const EMPTY_FORM: FormState = {
  name: "", type: "other", sku: "", quantity: 0,
  min_quantity: 5, default_order_quantity: 10, unit: "pcs", notes: "", photo_url: "",
};

export default function SuppliesPage() {
  const router = useRouter();
  const [supplies, setSupplies] = useState<SupplyWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "low">("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [quickOrderSheet, setQuickOrderSheet] = useState<SupplyWithStatus | null>(null);
  const [quickOrderQty, setQuickOrderQty] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchSupplies = useCallback(async () => {
    const res = await fetch("/api/supplies");
    const json = await res.json() as { data: SupplyWithStatus[] };
    setSupplies(json.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchSupplies(); }, [fetchSupplies]);

  useEffect(() => {
    const handler = () => { setForm(EMPTY_FORM); setSheetOpen(true); };
    window.addEventListener("prysmo:openForm", handler);
    return () => window.removeEventListener("prysmo:openForm", handler);
  }, []);

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json() as { url?: string };
      if (json.url) setForm((f) => ({ ...f, photo_url: json.url! }));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/supplies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setSheetOpen(false);
        await fetchSupplies();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!quickOrderSheet) return;
    setSaving(true);
    try {
      await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          supply_id: quickOrderSheet.id, 
          quantity: quickOrderQty,
          notes: "Quick restock from list" 
        }),
      });
      setQuickOrderSheet(null);
      router.push("/orders");
    } finally {
      setSaving(false);
    }
  }

  function openQuickOrder(e: React.MouseEvent, supply: SupplyWithStatus) {
    e.stopPropagation();
    setQuickOrderSheet(supply);
    setQuickOrderQty(supply.default_order_quantity || 10);
  }

  const lowCount = supplies.filter((s) => s.is_low).length;
  const visible = filter === "low" ? supplies.filter((s) => s.is_low) : supplies;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Supplies</h1>
          <p className="page-subtitle">
            {loading ? "Loading…" : `${supplies.length} items · ${lowCount} low`}
          </p>
        </div>
        <Filter size={18} color="var(--text-muted)" />
      </div>

      {lowCount > 0 && (
        <div className="alert-banner alert-danger animate-in">
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>{lowCount} item{lowCount > 1 ? "s" : ""}</strong> below minimum stock level
          </span>
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button
          className={`btn ${filter === "all" ? "btn-primary" : "btn-secondary"}`}
          style={{ flex: 1, padding: "8px 12px", fontSize: 14 }}
          onClick={() => setFilter("all")}
        >
          All ({supplies.length})
        </button>
        <button
          className={`btn ${filter === "low" ? "btn-primary" : "btn-secondary"}`}
          style={{ flex: 1, padding: "8px 12px", fontSize: 14 }}
          onClick={() => setFilter("low")}
        >
          Low Stock ({lowCount})
        </button>
      </div>

      {loading && <div className="empty-state"><span className="spinner" /></div>}

      {!loading && visible.length === 0 && (
        <div className="empty-state animate-in">
          <Package size={48} />
          <h3>{filter === "low" ? "No low-stock items" : "No supplies yet"}</h3>
          <p>{filter === "low" ? "All stock levels are fine" : "Tap + to add your first supply"}</p>
        </div>
      )}

      <div className="list-stack">
        {visible.map((s, i) => {
          const pct = Math.min(100, s.min_quantity > 0 ? Math.round((s.quantity / s.min_quantity) * 100) : 100);
          const level = pct >= 100 ? "ok" : pct >= 50 ? "warn" : "danger";
          return (
            <button
              key={s.id}
              id={`supply-card-${s.id}`}
              className={`card card-press animate-in stagger-${Math.min(i + 1, 4)}`}
              style={{ width: "100%", textAlign: "left", cursor: "pointer", padding: 0, overflow: "hidden" }}
              onClick={() => router.push(`/supplies/${s.id}`)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16 }}>
                {s.photo_url ? (
                  <img src={s.photo_url} alt={s.name} className="photo-thumb-sm" />
                ) : (
                  <div className="photo-placeholder">
                    {TYPE_ICONS[s.type] ?? <Package size={18} />}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <p style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)", marginRight: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.name}
                    </p>
                    <ChevronRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  </div>
                  {s.sku && (
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>SKU: {s.sku}</p>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                    <span className={TYPE_BADGE[s.type] ?? "badge badge-other"}>{s.type}</span>
                    {s.is_low && <span className="badge badge-low"><AlertTriangle size={9} /> LOW STOCK</span>}
                  </div>
                  <div className="stock-bar-wrap">
                    <div className={`stock-bar-fill ${level}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: "var(--primary)" }}>
                        {s.refill_requirement}
                      </span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, textTransform: "uppercase" }}> {s.unit}</span>
                    </div>
                    <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: -2, fontWeight: 500 }}>TO BRING</p>
                    
                    <div style={{ 
                      marginTop: 4, 
                      fontSize: 10, 
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: (s.quantity - s.refill_requirement) < 0 ? "var(--danger-dim)" : "var(--success-dim)",
                      color: (s.quantity - s.refill_requirement) < 0 ? "var(--danger)" : "var(--success)"
                    }}>
                      {(s.quantity - s.refill_requirement) < 0 
                        ? `${Math.abs(s.quantity - s.refill_requirement)} Short` 
                        : `${s.quantity - s.refill_requirement} Extra`}
                    </div>
                  </div>
                </div>
                <button 
                  className="btn-ghost" 
                  style={{ marginLeft: 8, padding: 8, color: "var(--primary)" }}
                  onClick={(e) => openQuickOrder(e, s)}
                >
                  <Plus size={20} />
                </button>
              </div>
            </button>
          );
        })}
      </div>

      {/* Add Supply Sheet */}
      <div className={`sheet-overlay${sheetOpen ? " open" : ""}`} onClick={() => setSheetOpen(false)} aria-hidden="true" />
      <div className={`bottom-sheet${sheetOpen ? " open" : ""}`} role="dialog" aria-label="Add Supply" aria-modal="true">
        <div className="sheet-handle" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 className="sheet-title" style={{ marginBottom: 0 }}>Add Supply</h2>
          <button className="btn-ghost" onClick={() => setSheetOpen(false)} aria-label="Close"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Photo (optional)</label>
            <div className="photo-upload-area" onClick={() => fileRef.current?.click()} role="button" tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}>
              {form.photo_url ? (
                <img src={form.photo_url} alt="Preview" className="photo-thumb" style={{ height: 100 }} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "var(--text-muted)" }}>
                  {uploadingPhoto ? <span className="spinner" /> : <ImageIcon size={24} />}
                  <span style={{ fontSize: 13 }}>{uploadingPhoto ? "Uploading…" : "Tap to upload photo"}</span>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="supply-name">Supply Name *</label>
            <input id="supply-name" className="form-input" placeholder="e.g. A4 Paper 80gsm"
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="supply-type">Type</label>
              <select id="supply-type" className="form-select" value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="paper">Paper</option>
                <option value="cartridge">Cartridge</option>
                <option value="ink">Ink</option>
                <option value="toner">Toner</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="supply-sku">SKU</label>
              <input id="supply-sku" className="form-input" placeholder="Optional"
                value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="supply-qty">Qty *</label>
              <input id="supply-qty" type="number" className="form-input" min={0}
                value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 0 }))} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="supply-min">Min Qty *</label>
              <input id="supply-min" type="number" className="form-input" min={0}
                value={form.min_quantity} onChange={(e) => setForm((f) => ({ ...f, min_quantity: parseInt(e.target.value) || 0 }))} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="supply-order-qty">Default Order</label>
              <input id="supply-order-qty" type="number" className="form-input" min={1}
                value={form.default_order_quantity} onChange={(e) => setForm((f) => ({ ...f, default_order_quantity: parseInt(e.target.value) || 1 }))} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="supply-unit">Unit</label>
              <input id="supply-unit" className="form-input" placeholder="pcs"
                value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="supply-notes">Notes</label>
            <textarea id="supply-notes" className="form-textarea" placeholder="Optional notes…"
              value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSheetOpen(false)}>Cancel</button>
            <button type="submit" id="supply-form-submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving || !form.name}>
              {saving ? <span className="spinner" /> : <><Plus size={16} /> Add Supply</>}
            </button>
          </div>
        </form>
      </div>
      {/* Quick Order Sheet */}
      <div className={`sheet-overlay${quickOrderSheet ? " open" : ""}`} onClick={() => setQuickOrderSheet(null)} aria-hidden="true" />
      <div className={`bottom-sheet${quickOrderSheet ? " open" : ""}`} role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 className="sheet-title" style={{ marginBottom: 0 }}>Quick Restock</h2>
          <button className="btn-ghost" onClick={() => setQuickOrderSheet(null)} aria-label="Close"><X size={20} /></button>
        </div>
        {quickOrderSheet && (
          <form onSubmit={handleQuickOrder}>
            <div style={{ marginBottom: 16, background: "var(--primary-dim)", padding: 12, borderRadius: 8 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: "var(--primary-dark)" }}>{quickOrderSheet.name}</p>
            </div>
            <div className="form-group">
              <label className="form-label">Order Quantity</label>
              <input type="number" className="form-input" min={1} value={quickOrderQty}
                onChange={(e) => setQuickOrderQty(parseInt(e.target.value) || 1)} required autoFocus />
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setQuickOrderSheet(null)}>Cancel</button>
              <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving}>
                {saving ? <span className="spinner" /> : "Place Order"}
              </button>
            </div>
          </form>
        )}
      </div>
    </>
  );
}
