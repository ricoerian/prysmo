"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Printer, MapPin, CheckCircle, AlertTriangle, ChevronRight, Image as ImageIcon, Plus, X, Package, Settings2, Trash2, Filter, Search } from "lucide-react";
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
  active:      "Aktif",
  inactive:    "Tidak Aktif",
  maintenance: "Perbaikan",
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
  const router = useRouter();
  const [printers, setPrinters] = useState<PrinterWithSupplies[]>([]);
  const [allSupplies, setAllSupplies] = useState<SupplyWithStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [managingSuppliesFor, setManagingSuppliesFor] = useState<number | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
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

  const visiblePrinters = printers.filter(p => {
    const matchesStatus = filter === "all" ? true : p.status === filter;
    const q = searchQuery.toLowerCase();
    const matchesSearch = p.name.toLowerCase().includes(q) || 
                          p.brand.toLowerCase().includes(q) || 
                          p.model.toLowerCase().includes(q) ||
                          p.location.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Printer</h1>
          <p className="page-subtitle">
            {loading ? "Memuat…" : `${printers.length} terdaftar`}
          </p>
        </div>
        <button 
          className="btn-ghost" 
          onClick={() => setFilterSheetOpen(true)}
          aria-label="Filter"
          style={{ padding: 8, color: filter !== "all" ? "var(--primary)" : "var(--text-muted)" }}
        >
          <Filter size={18} />
          {filter !== "all" && (
            <span style={{ 
              position: "absolute", top: 4, right: 4, width: 8, height: 8, 
              background: "var(--primary)", borderRadius: "50%", border: "2px solid white" 
            }} />
          )}
        </button>
      </div>

      {/* Search Input */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <Search 
          size={18} 
          style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} 
        />
        <input
          type="text"
          className="form-input"
          placeholder="Cari printer, merek, atau lokasi..."
          style={{ paddingLeft: 40 }}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery("")}
            style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", border: "none", background: "none", color: "var(--text-muted)", cursor: "pointer" }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {loading && (
        <div className="empty-state">
          <span className="spinner" />
        </div>
      )}

      {!loading && printers.length === 0 && (
        <div className="empty-state animate-in">
          <Printer size={48} />
          <h3>Belum ada printer</h3>
          <p>Ketuk tombol + untuk menambah printer pertama Anda</p>
        </div>
      )}

      {!loading && printers.length > 0 && visiblePrinters.length === 0 && (
        <div className="empty-state animate-in">
          <Search size={48} />
          <h3>Tidak ditemukan</h3>
          <p>Coba kata kunci atau filter lain</p>
        </div>
      )}

      <div className="list-stack">
        {visiblePrinters.map((p, i) => (
          <div
            key={p.id}
            className={`card animate-in stagger-${Math.min(i + 1, 4)}`}
            style={{ width: "100%", padding: 0, overflow: "hidden" }}
          >
            <div 
              style={{ display: "flex", cursor: "pointer" }}
              onClick={() => router.push(`/printers/${p.id}`)}
              className="card-press"
            >
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
                  <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.5px", color: "var(--text-muted)" }}>STOCK MATERIAL</span>
                </div>
                <button 
                  className="btn-ghost" 
                  style={{ fontSize: 11, padding: "2px 8px", background: "var(--primary-dim)", color: "var(--primary)" }}
                  onClick={() => setManagingSuppliesFor(managingSuppliesFor === p.id ? null : p.id)}
                >
                  {managingSuppliesFor === p.id ? "Batal" : "Hubungkan Stok"}
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
                    <option value="">Pilih stok untuk dihubungkan...</option>
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
                <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>Tidak ada stok terhubung</p>
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
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Stock:</span>
                          <input 
                            type="number"
                            className="form-input"
                            min={1}
                            style={{ width: 50, padding: "2px 4px", fontSize: 13, height: "auto", textAlign: "center" }}
                            value={ps.quantity_used}
                            onInput={(e) => updateUsage(p.id, ps.supply_id, parseInt(e.target.value) || 1)}
                          />
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{ps.supply_unit}</span>
                        </div>
                        <button 
                          onClick={() => updateUsage(p.id, ps.supply_id, 0, "unlink")}
                          style={{ border: "none", background: "none", cursor: "pointer", color: "var(--danger)", padding: 4 }}
                          aria-label="Putus hubungan stok"
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
        aria-label="Tambah Printer"
        aria-modal="true"
      >
        <div className="sheet-handle" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 className="sheet-title" style={{ marginBottom: 0 }}>Tambah Printer</h2>
          <button className="btn-ghost" onClick={closeSheet} aria-label="Tutup">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Photo upload */}
          <div className="form-group">
            <label className="form-label">Foto (opsional)</label>
            <div
              className="photo-upload-area"
              onClick={() => fileRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}
            >
              {form.photo_url ? (
                <img src={form.photo_url} alt="Pratinjau" className="photo-thumb" style={{ height: 100 }} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "var(--text-muted)" }}>
                  {uploadingPhoto ? <span className="spinner" /> : <ImageIcon size={24} />}
                  <span style={{ fontSize: 13 }}>{uploadingPhoto ? "Mengunggah…" : "Ketuk untuk unggah foto"}</span>
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
            <label className="form-label" htmlFor="printer-name">Nama Printer *</label>
            <input
              id="printer-name"
              className="form-input"
              placeholder="misal: Printer Kantor A"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="printer-brand">Merek</label>
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
            <label className="form-label" htmlFor="printer-location">Lokasi</label>
            <input
              id="printer-location"
              className="form-input"
              placeholder="Ruangan 101"
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
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
              <option value="maintenance">Perbaikan</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="printer-notes">Catatan</label>
            <textarea
              id="printer-notes"
              className="form-textarea"
              placeholder="Catatan opsional…"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={closeSheet}>
              Batal
            </button>
            <button
              type="submit"
              id="printer-form-submit"
              className="btn btn-primary"
              style={{ flex: 2 }}
              disabled={saving || !form.name}
            >
              {saving ? <span className="spinner" /> : <><Plus size={16} /> Tambah Printer</>}
            </button>
          </div>
        </form>
      </div>

      {/* Filter Bottom Sheet */}
      <div className={`sheet-overlay${filterSheetOpen ? " open" : ""}`} onClick={() => setFilterSheetOpen(false)} aria-hidden="true" />
      <div className={`bottom-sheet${filterSheetOpen ? " open" : ""}`} role="dialog" aria-label="Pilihan Filter" aria-modal="true">
        <div className="sheet-handle" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 className="sheet-title" style={{ marginBottom: 0 }}>Filter Printer</h2>
          <button className="btn-ghost" onClick={() => setFilterSheetOpen(false)} aria-label="Tutup"><X size={20} /></button>
        </div>

        <div className="form-group">
          <label className="form-label">Status Printer</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button 
              className={`btn ${filter === "all" ? "btn-primary" : "btn-secondary"}`}
              style={{ padding: "8px 12px", fontSize: 13 }}
              onClick={() => setFilter("all")}
            >
              Semua
            </button>
            {Object.entries(STATUS_LABEL).map(([val, label]) => (
              <button 
                key={val}
                className={`btn ${filter === val ? "btn-primary" : "btn-secondary"}`}
                style={{ padding: "8px 12px", fontSize: 13 }}
                onClick={() => setFilter(val)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 24, borderTop: "1px solid var(--border)", paddingTop: 20 }}>
          <button 
            className="btn-ghost" 
            style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--text-muted)" }}
            onClick={() => { setFilter("all"); setSearchQuery(""); }}
          >
            Bersihkan
          </button>
          <button 
            className="btn btn-primary" 
            style={{ flex: 1 }}
            onClick={() => setFilterSheetOpen(false)}
          >
            Selesai
          </button>
        </div>
      </div>
    </>
  );
}
