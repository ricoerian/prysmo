"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Package, FileText, Droplets, Box, AlertTriangle,
  Printer, Edit2, ShoppingCart, X, Plus
} from "lucide-react";
import type { SupplyWithPrinters } from "@/app/_lib/types";

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
  const [sheet, setSheet] = useState<"edit" | "order" | null>(null);
  const [editForm, setEditForm] = useState({
    name: "", type: "", sku: "", quantity: 0, min_quantity: 0,
    default_order_quantity: 10, unit: "", notes: "", photo_url: "",
  });
  const [orderQty, setOrderQty] = useState(0);
  const [orderNotes, setOrderNotes] = useState("");
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
    if (!confirm("Hapus stok ini? Semua pesanan terkait juga akan dihapus.")) return;
    await fetch(`/api/supplies/${id}`, { method: "DELETE" });
    router.push("/supplies");
  }

  if (loading) return <div className="empty-state" style={{ paddingTop: 80 }}><span className="spinner" /></div>;
  if (!supply) return <div className="empty-state" style={{ paddingTop: 80 }}><Package size={40} /><h3>Tidak ditemukan</h3></div>;

  const pct = supply.min_quantity > 0
    ? Math.min(100, Math.round((supply.quantity / supply.min_quantity) * 100))
    : 100;
  const level = pct >= 100 ? "ok" : pct >= 50 ? "warn" : "danger";

  return (
    <>
      <div style={{ paddingTop: 16 }}>
        <button className="detail-back" onClick={() => router.push("/supplies")}>
          <ArrowLeft size={16} /> Stok
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
              <span className={TYPE_BADGE[supply.type] ?? "badge badge-other"}>
                {supply.type === 'paper' ? 'Kertas' : supply.type === 'cartridge' ? 'Kartrid' : supply.type === 'ink' ? 'Tinta' : supply.type === 'toner' ? 'Toner' : 'Lainnya'}
              </span>
              {supply.is_low && (
                <span className="badge badge-low"><AlertTriangle size={9} /> RENDAH</span>
              )}
            </div>
          </div>

          {/* Stock gauge */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 600 }}>TINGKAT STOK</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: level === "ok" ? "var(--success)" : level === "warn" ? "var(--warning)" : "var(--danger)" }}>
                {supply.quantity} / {supply.min_quantity} {supply.unit} min.
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
          <Edit2 size={15} /> Ubah
        </button>
        <button className="btn btn-primary" onClick={openOrder}>
          <ShoppingCart size={15} /> Tambah Stok
        </button>
      </div>

      {/* Details */}
      <div className="card animate-in stagger-2" style={{ marginBottom: 16 }}>
        <p className="section-title">Detail</p>
        <div className="info-row">
          <span className="info-label">Stok Saat Ini</span>
          <span className="info-value" style={{ color: supply.is_low ? "var(--danger)" : "var(--text-primary)", fontWeight: 700 }}>
            {supply.quantity} {supply.unit}
          </span>
        </div>
        <div className="info-row">
          <span className="info-label">Stok Minimum</span>
          <span className="info-value">{supply.min_quantity} {supply.unit}</span>
        </div>
        {supply.notes && (
          <div className="info-row">
            <span className="info-label">Catatan</span>
            <span className="info-value" style={{ maxWidth: "60%", wordBreak: "break-word" }}>{supply.notes}</span>
          </div>
        )}
        <div className="info-row">
          <span className="info-label">Ditambahkan</span>
          <span className="info-value">
            {new Date(supply.created_at).toLocaleDateString("id-ID", { year: "numeric", month: "short", day: "numeric" })}
          </span>
        </div>
      </div>

      {/* Linked Printers */}
      <div className="animate-in stagger-3" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <p className="section-title" style={{ marginBottom: 0 }}>
            Digunakan oleh ({supply.printers.length} printer)
          </p>
        </div>
        {supply.printers.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "20px 16px", color: "var(--text-muted)", fontSize: 13 }}>
            Tidak terhubung ke printer manapun
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
                  <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase" }}>Digunakan</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 8, marginBottom: 8 }}>
        <button className="btn btn-danger btn-full" onClick={handleDelete}>Hapus Stok</button>
      </div>

      {/* Overlay */}
      <div className={`sheet-overlay${sheet ? " open" : ""}`} onClick={() => setSheet(null)} aria-hidden="true" />

      {/* Edit Sheet */}
      <div className={`bottom-sheet${sheet === "edit" ? " open" : ""}`} role="dialog" aria-label="Ubah Stok" aria-modal="true">
        <div className="sheet-handle" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 className="sheet-title" style={{ marginBottom: 0 }}>Ubah Stok</h2>
          <button className="btn-ghost" onClick={() => setSheet(null)} aria-label="Tutup"><X size={20} /></button>
        </div>
        <form onSubmit={saveEdit}>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-name">Nama *</label>
            <input id="edit-name" className="form-input" value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-type">Jenis</label>
              <select id="edit-type" className="form-select" value={editForm.type}
                onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="paper">Kertas</option>
                <option value="cartridge">Kartrid</option>
                <option value="ink">Tinta</option>
                <option value="toner">Toner</option>
                <option value="other">Lainnya</option>
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
              <label className="form-label" htmlFor="edit-qty">Jml *</label>
              <input id="edit-qty" type="number" className="form-input" min={0}
                value={editForm.quantity}
                onChange={(e) => setEditForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 0 }))} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-min">Stok Min.</label>
              <input id="edit-min" type="number" className="form-input" min={0}
                value={editForm.min_quantity}
                onChange={(e) => setEditForm((f) => ({ ...f, min_quantity: parseInt(e.target.value) || 0 }))} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-order">Standar Pesanan</label>
              <input id="edit-order" type="number" className="form-input" min={1}
                value={editForm.default_order_quantity}
                onChange={(e) => setEditForm((f) => ({ ...f, default_order_quantity: parseInt(e.target.value) || 1 }))} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-unit">Satuan</label>
              <input id="edit-unit" className="form-input" value={editForm.unit}
                onChange={(e) => setEditForm((f) => ({ ...f, unit: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-notes">Catatan</label>
            <textarea id="edit-notes" className="form-textarea" value={editForm.notes}
              onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSheet(null)}>Batal</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving}>
              {saving ? <span className="spinner" /> : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>

      {/* Restock Order Sheet */}
      <div className={`bottom-sheet${sheet === "order" ? " open" : ""}`} role="dialog" aria-label="Buat Pesanan" aria-modal="true">
        <div className="sheet-handle" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 className="sheet-title" style={{ marginBottom: 0 }}>Buat Pesanan Pengisian</h2>
          <button className="btn-ghost" onClick={() => setSheet(null)} aria-label="Tutup"><X size={20} /></button>
        </div>
        <form onSubmit={placeOrder}>
          <div style={{ background: "var(--primary-dim)", borderRadius: "var(--radius-md)", padding: "12px 14px", marginBottom: 16 }}>
            <p style={{ fontSize: 13, color: "var(--primary-dark)", fontWeight: 500 }}>
              {supply.name} — stok saat ini: <strong>{supply.quantity} {supply.unit}</strong>
            </p>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="order-qty">Jumlah Pesanan *</label>
            <input id="order-qty" type="number" className="form-input" min={1}
              value={orderQty} onChange={(e) => setOrderQty(parseInt(e.target.value) || 1)} required />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="order-notes">Catatan</label>
            <textarea id="order-notes" className="form-textarea" placeholder="Catatan opsional…"
              value={orderNotes} onChange={(e) => setOrderNotes(e.target.value)} />
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSheet(null)}>Batal</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving || orderQty < 1}>
              {saving ? <span className="spinner" /> : <><Plus size={16} /> Buat Pesanan</>}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
