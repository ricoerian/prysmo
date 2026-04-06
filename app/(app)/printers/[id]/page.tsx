"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Printer, MapPin, CheckCircle, AlertTriangle, Package,
  Edit2, Link2, Image as ImageIcon, X, Check, ShoppingCart,
} from "lucide-react";
import type { PrinterWithSupplies, SupplyWithStatus } from "@/app/_lib/types";

const STATUS_BADGE: Record<string, string> = {
  active:      "badge badge-active",
  inactive:    "badge badge-inactive",
  maintenance: "badge badge-maintenance",
};

const SUPPLY_TYPE_BADGE: Record<string, string> = {
  paper:     "badge badge-paper",
  cartridge: "badge badge-cartridge",
  ink:       "badge badge-ink",
  toner:     "badge badge-toner",
  other:     "badge badge-other",
};

export default function PrinterDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [printer, setPrinter] = useState<PrinterWithSupplies | null>(null);
  const [allSupplies, setAllSupplies] = useState<SupplyWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheet, setSheet] = useState<"edit" | "supplies" | null>(null);
  const [editForm, setEditForm] = useState({ name: "", brand: "", model: "", location: "", status: "", notes: "", photo_url: "", last_ink_replacement: "", last_ink_replacement_shift: "" });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [selectedSupplyIds, setSelectedSupplyIds] = useState<Set<number>>(new Set());

  const fetchPrinter = useCallback(async () => {
    const res = await fetch(`/api/printers/${id}`);
    const json = await res.json() as { data: PrinterWithSupplies };
    setPrinter(json.data);
    setLoading(false);
  }, [id]);

  const fetchAllSupplies = useCallback(async () => {
    const res = await fetch("/api/supplies");
    const json = await res.json() as { data: SupplyWithStatus[] };
    setAllSupplies(json.data ?? []);
  }, []);

  useEffect(() => {
    fetchPrinter();
    fetchAllSupplies();
  }, [fetchPrinter, fetchAllSupplies]);

  function openEdit() {
    if (!printer) return;
    setEditForm({
      name: printer.name, brand: printer.brand, model: printer.model,
      location: printer.location, status: printer.status,
      notes: printer.notes ?? "", photo_url: printer.photo_url ?? "",
      last_ink_replacement: printer.last_ink_replacement ? new Date(printer.last_ink_replacement).toISOString().slice(0, 16) : "",
      last_ink_replacement_shift: printer.last_ink_replacement_shift ?? "",
    });
    setSheet("edit");
  }

  function openSupplies() {
    if (!printer) return;
    setSelectedSupplyIds(new Set(printer.supplies.map((s) => s.id)));
    setSheet("supplies");
  }


  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json() as { url?: string };
      if (json.url) setEditForm((f) => ({ ...f, photo_url: json.url! }));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await fetch(`/api/printers/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      setSheet(null);
      await fetchPrinter();
    } finally {
      setSaving(false);
    }
  }

  async function saveSupplyLinks() {
    setSaving(true);
    try {
      await fetch(`/api/printers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supplyIds: Array.from(selectedSupplyIds) }),
      });
      setSheet(null);
      await fetchPrinter();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this printer? This cannot be undone.")) return;
    await fetch(`/api/printers/${id}`, { method: "DELETE" });
    router.push("/printers");
  }



  function closeSheet() { setSheet(null); }

  if (loading) {
    return (
      <div className="empty-state" style={{ paddingTop: 80 }}>
        <span className="spinner" />
      </div>
    );
  }

  if (!printer) {
    return (
      <div className="empty-state" style={{ paddingTop: 80 }}>
        <Printer size={40} />
        <h3>Printer not found</h3>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div style={{ paddingTop: 16 }}>
        <button className="detail-back" onClick={() => router.push("/printers")}>
          <ArrowLeft size={16} /> Printers
        </button>
      </div>

      {/* Hero card */}
      <div className="card animate-in" style={{ marginBottom: 16, padding: 0, overflow: "hidden" }}>
        {printer.photo_url ? (
          <img src={printer.photo_url} alt={printer.name} className="photo-thumb" />
        ) : (
          <div style={{
            height: 120, background: "var(--primary-dim)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Printer size={40} color="var(--primary)" />
          </div>
        )}
        <div style={{ padding: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>{printer.name}</h2>
              <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>{printer.brand} · {printer.model}</p>
            </div>
            <span className={STATUS_BADGE[printer.status]}>
              {printer.status === "active" ? <CheckCircle size={10} /> : <AlertTriangle size={10} />}
              {printer.status}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: 13, color: "var(--text-muted)" }}>
            <MapPin size={13} />
            {printer.location}
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
        <button className="btn btn-secondary" onClick={openEdit} style={{ fontSize: 13 }}>
          <Edit2 size={14} /> Edit
        </button>
        <button className="btn btn-secondary" onClick={openSupplies} style={{ fontSize: 13 }}>
          <Link2 size={14} /> Stock
        </button>
        <button className="btn btn-secondary" onClick={() => router.push("/orders")} style={{ fontSize: 13 }}>
          <ShoppingCart size={14} /> Pesanan
        </button>
      </div>

      <div className="card animate-in stagger-2" style={{ marginBottom: 16 }}>
        <p className="section-title">Detail</p>
        {printer.notes && (
          <div className="info-row">
            <span className="info-label">Catatan</span>
            <span className="info-value" style={{ maxWidth: "60%", wordBreak: "break-word" }}>{printer.notes}</span>
          </div>
        )}
        <div className="info-row">
          <span className="info-label">Ditambahkan</span>
          <span className="info-value">
            {new Date(printer.created_at).toLocaleDateString("id-ID", { timeZone: "Asia/Jakarta", year: "numeric", month: "short", day: "numeric" })}
          </span>
        </div>
        {printer.last_ink_replacement && (
          <div className="info-row" style={{ marginTop: 8 }}>
            <span className="info-label">Terakhir Ganti Tinta</span>
            <span className="info-value">
              {new Date(printer.last_ink_replacement).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              {printer.last_ink_replacement_shift ? ` (${printer.last_ink_replacement_shift})` : ""}
            </span>
          </div>
        )}
      </div>

      <div className="animate-in stagger-3">
        <p className="section-title">Stock Material ({printer.supplies.length})</p>
        {printer.supplies.length === 0 ? (
          <div className="card" style={{ textAlign: "center", padding: "24px 16px", color: "var(--text-muted)", fontSize: 13 }}>
            Belum ada stock material — tap Stock untuk menambahkan
          </div>
        ) : (
          <div className="list-stack">
            {printer.supplies.map((s) => (
              <div key={s.id} className="card" style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {s.photo_url ? (
                  <img src={s.photo_url} alt={s.name} className="photo-thumb-sm" />
                ) : (
                  <div className="photo-placeholder">
                    <Package size={18} />
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14, color: "var(--text-primary)" }}>{s.name}</p>
                  <span className={SUPPLY_TYPE_BADGE[s.type] ?? "badge badge-other"}>{s.type}</span>
                </div>
                <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>
                  {s.quantity} {s.unit}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginTop: 24, marginBottom: 8 }}>
        <button className="btn btn-danger btn-full" onClick={handleDelete}>
          Hapus Printer
        </button>
      </div>

      <div className={`sheet-overlay${sheet ? " open" : ""}`} onClick={closeSheet} aria-hidden="true" />

      <div className={`bottom-sheet${sheet === "edit" ? " open" : ""}`} role="dialog" aria-label="Edit Printer" aria-modal="true">
        <div className="sheet-handle" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 className="sheet-title" style={{ marginBottom: 0 }}>Edit Printer</h2>
          <button className="btn-ghost" onClick={closeSheet} aria-label="Close"><X size={20} /></button>
        </div>
        <form onSubmit={saveEdit}>
          <div className="form-group">
            <label className="form-label">Gambar Printer</label>
            <div className="photo-upload-area" onClick={() => fileRef.current?.click()} role="button" tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}>
              {editForm.photo_url ? (
                <img src={editForm.photo_url} alt="Preview" className="photo-thumb" style={{ height: 100 }} />
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
            <label className="form-label" htmlFor="edit-name">Nama Printer *</label>
            <input id="edit-name" className="form-input" value={editForm.name}
              onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-brand">Brand</label>
              <input id="edit-brand" className="form-input" value={editForm.brand}
                onChange={(e) => setEditForm((f) => ({ ...f, brand: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-model">Model</label>
              <input id="edit-model" className="form-input" value={editForm.model}
                onChange={(e) => setEditForm((f) => ({ ...f, model: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-location">Lokasi</label>
            <input id="edit-location" className="form-input" value={editForm.location}
              onChange={(e) => setEditForm((f) => ({ ...f, location: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-status">Status Printer</label>
            <select id="edit-status" className="form-select" value={editForm.status}
              onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}>
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
              <option value="maintenance">Perbaikan</option>
            </select>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-last-ink">Terakhir Ganti Tinta</label>
              <input id="edit-last-ink" type="datetime-local" className="form-input" value={editForm.last_ink_replacement}
                onChange={(e) => setEditForm((f) => ({ ...f, last_ink_replacement: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="edit-last-ink-shift">Shift</label>
              <select id="edit-last-ink-shift" className="form-select" value={editForm.last_ink_replacement_shift}
                onChange={(e) => setEditForm((f) => ({ ...f, last_ink_replacement_shift: e.target.value }))}>
                <option value="">- Pilih Shift -</option>
                <option value="D/S">Day Shift (D/S)</option>
                <option value="N/S">Night Shift (N/S)</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="edit-notes">Catatan</label>
            <textarea id="edit-notes" className="form-textarea" value={editForm.notes}
              onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={closeSheet}>Batal</button>
            <button type="submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving}>
              {saving ? <span className="spinner" /> : "Simpan Perubahan"}
            </button>
          </div>
        </form>
      </div>

      {/* Link Supplies Sheet */}
      <div className={`bottom-sheet${sheet === "supplies" ? " open" : ""}`} role="dialog" aria-label="Manage Supplies" aria-modal="true">
        <div className="sheet-handle" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 className="sheet-title" style={{ marginBottom: 0 }}>Tambah Stock Material</h2>
          <button className="btn-ghost" onClick={closeSheet} aria-label="Close"><X size={20} /></button>
        </div>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
          Pilih stock material yang terpasang pada printer ini.
        </p>
        <div className="list-stack" style={{ marginBottom: 16 }}>
          {allSupplies.map((s) => {
            const checked = selectedSupplyIds.has(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  const next = new Set(selectedSupplyIds);
                  if (checked) next.delete(s.id); else next.add(s.id);
                  setSelectedSupplyIds(next);
                }}
                className="card card-press"
                style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left" }}
              >
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  border: `2px solid ${checked ? "var(--primary)" : "var(--border)"}`,
                  background: checked ? "var(--primary)" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, transition: "all 0.15s ease",
                }}>
                  {checked && <Check size={12} color="white" />}
                </div>
                {s.photo_url ? (
                  <img src={s.photo_url} alt={s.name} className="photo-thumb-sm" />
                ) : (
                  <div className="photo-placeholder"><Package size={16} /></div>
                )}
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, fontSize: 14 }}>{s.name}</p>
                  <span className={SUPPLY_TYPE_BADGE[s.type] ?? "badge badge-other"}>{s.type}</span>
                </div>
              </button>
            );
          })}
        </div>
        <button className="btn btn-primary btn-full" onClick={saveSupplyLinks} disabled={saving}>
          {saving ? <span className="spinner" /> : `Save (${selectedSupplyIds.size} selected)`}
        </button>
      </div>

    </>
  );
}
