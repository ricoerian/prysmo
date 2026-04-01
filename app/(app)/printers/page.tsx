"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Printer, MapPin, CheckCircle, AlertTriangle, ChevronRight, Image as ImageIcon, Plus, X, Package, Settings2, Trash2 } from "lucide-react";
import type { Printer as PrinterType, SupplyWithStatus } from "@/app/_lib/types";

interface PrinterWithSupplies extends PrinterType {
  supplies: {
    supply_id: number;
    supply_name: string;
    supply_unit: string;
    supply_type: string;
    quantity_used: number;
  }[];
}

const STATUS_BADGE: Record<string, string> = {
  active:      "badge badge-active",
  inactive:    "badge badge-inactive",
  maintenance: "badge badge-maintenance",
};

const STATUS_LABEL: Record<string, string> = {
  active:      "Active",
  inactive:    "Inactive",
  maintenance: "Maintenance",
};

interface FormState {
  name: string;
  brand: string;
  model: string;
  location: string;
  status: string;
  notes: string;
  photo_url: string;
}

const EMPTY_FORM: FormState = {
  name: "", brand: "", model: "", location: "",
  status: "active", notes: "", photo_url: "",
};

export default function PrintersPage() {
  const [printers, setPrinters] = useState<PrinterWithSupplies[]>([]);
  const [allSupplies, setAllSupplies] = useState<SupplyWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [managingSuppliesFor, setManagingSuppliesFor] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchPrinters = useCallback(async () => {
    const res = await fetch("/api/printers");
    const json = await res.json() as { data: PrinterWithSupplies[] };
    setPrinters(json.data ?? []);
    setLoading(false);
  }, []);

  const fetchSupplies = useCallback(async () => {
    const res = await fetch("/api/supplies");
    const json = await res.json() as { data: SupplyWithStatus[] };
    setAllSupplies(json.data ?? []);
  }, []);

  useEffect(() => {
    fetchPrinters();
    fetchSupplies();
  }, [fetchPrinters, fetchSupplies]);

  // Listen for FAB
  useEffect(() => {
    const handler = () => { setForm(EMPTY_FORM); setSheetOpen(true); };
    window.addEventListener("prysmo:openForm", handler);
    return () => window.removeEventListener("prysmo:openForm", handler);
  }, []);

  function closeSheet() {
    setSheetOpen(false);
  }

  async function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json() as { url?: string; error?: string };
      if (json.url) setForm((f) => ({ ...f, photo_url: json.url! }));
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/printers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        closeSheet();
        await fetchPrinters();
      }
    } finally {
      setSaving(false);
    }
  }

  async function updateUsage(printerId: number, supplyId: number, quantity: number, action: "link" | "unlink" | "update" = "update") {
    try {
      await fetch(`/api/printers/${printerId}/supplies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supply_id: supplyId, quantity_used: quantity, action }),
      });
      await fetchPrinters();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Printers</h1>
          <p className="page-subtitle">
            {loading ? "Loading…" : `${printers.length} registered`}
          </p>
        </div>
      </div>

      {loading && (
        <div className="empty-state">
          <span className="spinner" />
        </div>
      )}

      {!loading && printers.length === 0 && (
        <div className="empty-state animate-in">
          <Printer size={48} />
          <h3>No printers yet</h3>
          <p>Tap the + button to add your first printer</p>
        </div>
      )}

      <div className="list-stack">
        {printers.map((p, i) => (
          <div
            key={p.id}
            className={`card animate-in stagger-${Math.min(i + 1, 4)}`}
            style={{ width: "100%", padding: 0, overflow: "hidden" }}
          >
            <div style={{ display: "flex" }}>
              {p.photo_url && (
                <img src={p.photo_url} alt={p.name} className="photo-thumb" style={{ width: 100, height: "auto" }} />
              )}
              <div style={{ flex: 1, padding: 16 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {!p.photo_url && (
                      <div className="photo-placeholder">
                        <Printer size={20} />
                      </div>
                    )}
                    <div>
                      <p style={{ fontWeight: 600, fontSize: 15, color: "var(--text-primary)" }}>{p.name}</p>
                      <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.brand} {p.model}</p>
                    </div>
                  </div>
                  <ChevronRight size={18} color="var(--text-muted)" />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className={STATUS_BADGE[p.status]}>
                    {p.status === "active" ? <CheckCircle size={10} /> : p.status === "maintenance" ? <AlertTriangle size={10} /> : null}
                    {STATUS_LABEL[p.status]}
                  </span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)" }}>
                    <MapPin size={11} />
                    {p.location}
                  </span>
                </div>
              </div>
            </div>

            {/* Supplies List */}
            <div style={{ borderTop: "1px solid var(--border)", padding: "12px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Settings2 size={13} color="var(--primary)" />
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.5px", color: "var(--text-muted)" }}>CONSUMPTION SETTINGS</span>
                </div>
                <button 
                  className="btn-ghost" 
                  style={{ fontSize: 11, padding: "2px 8px", background: "var(--primary-dim)", color: "var(--primary)" }}
                  onClick={() => setManagingSuppliesFor(managingSuppliesFor === p.id ? null : p.id)}
                >
                  {managingSuppliesFor === p.id ? "Cancel" : "Link Supply"}
                </button>
              </div>

              {/* Linking view */}
              {managingSuppliesFor === p.id && (
                <div className="animate-in" style={{ marginBottom: 12, padding: 8, background: "var(--surface)", borderRadius: 8 }}>
                  <select 
                    className="form-select" 
                    style={{ fontSize: 13 }}
                    onChange={(e) => {
                      if (e.target.value) {
                         updateUsage(p.id, parseInt(e.target.value), 1, "link");
                         setManagingSuppliesFor(null);
                      }
                    }}
                    value=""
                  >
                    <option value="">Select a supply to link...</option>
                    {allSupplies
                      .filter(s => !p.supplies.some(ps => ps.supply_id === s.id))
                      .map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.type})</option>
                      ))
                    }
                  </select>
                </div>
              )}

              {p.supplies.length === 0 ? (
                <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>No linked supplies</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {p.supplies.map(ps => (
                    <div key={ps.supply_id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.02)", padding: "6px 10px", borderRadius: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <Package size={14} color="var(--text-muted)" />
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{ps.supply_name}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Usage:</span>
                          <input 
                            type="number"
                            className="form-input"
                            min={1}
                            style={{ width: 50, padding: "2px 4px", fontSize: 13, height: "auto", textAlign: "center" }}
                            value={ps.quantity_used}
                            onChange={(e) => updateUsage(p.id, ps.supply_id, parseInt(e.target.value) || 1)}
                          />
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{ps.supply_unit}</span>
                        </div>
                        <button 
                          onClick={() => updateUsage(p.id, ps.supply_id, 0, "unlink")}
                          style={{ border: "none", background: "none", cursor: "pointer", color: "var(--danger)", padding: 4 }}
                          aria-label="Unlink supply"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Printer Sheet */}
      <div
        className={`sheet-overlay${sheetOpen ? " open" : ""}`}
        onClick={closeSheet}
        aria-hidden="true"
      />
      <div
        className={`bottom-sheet${sheetOpen ? " open" : ""}`}
        role="dialog"
        aria-label="Add Printer"
        aria-modal="true"
      >
        <div className="sheet-handle" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 className="sheet-title" style={{ marginBottom: 0 }}>Add Printer</h2>
          <button className="btn-ghost" onClick={closeSheet} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Photo upload */}
          <div className="form-group">
            <label className="form-label">Photo (optional)</label>
            <div
              className="photo-upload-area"
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
            >
              {form.photo_url ? (
                <img src={form.photo_url} alt="Preview" className="photo-thumb" style={{ height: 100 }} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "var(--text-muted)" }}>
                  {uploadingPhoto ? <span className="spinner" /> : <ImageIcon size={24} />}
                  <span style={{ fontSize: 13 }}>{uploadingPhoto ? "Uploading…" : "Tap to upload photo"}</span>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="printer-name">Printer Name *</label>
            <input
              id="printer-name"
              className="form-input"
              placeholder="e.g. Office Printer A"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="printer-brand">Brand</label>
              <input
                id="printer-brand"
                className="form-input"
                placeholder="HP"
                value={form.brand}
                onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="printer-model">Model</label>
              <input
                id="printer-model"
                className="form-input"
                placeholder="LaserJet Pro"
                value={form.model}
                onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="printer-location">Location</label>
            <input
              id="printer-location"
              className="form-input"
              placeholder="Room 101"
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="printer-status">Status</label>
            <select
              id="printer-status"
              className="form-select"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="printer-notes">Notes</label>
            <textarea
              id="printer-notes"
              className="form-textarea"
              placeholder="Optional notes…"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={closeSheet}>
              Cancel
            </button>
            <button
              type="submit"
              id="printer-form-submit"
              className="btn btn-primary"
              style={{ flex: 2 }}
              disabled={saving || !form.name}
            >
              {saving ? <span className="spinner" /> : <><Plus size={16} /> Add Printer</>}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
