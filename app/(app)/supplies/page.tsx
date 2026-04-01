"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Package, FileText, Droplets, Box, AlertTriangle, ChevronRight,
  Image as ImageIcon, Plus, Minus, X, Filter, Search,
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
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
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

  async function handleUpdateQuantity(supply: SupplyWithStatus, delta: number) {
    setSaving(true);
    try {
      const newQuantity = Math.max(0, supply.quantity + delta);
      const res = await fetch(`/api/supplies/${supply.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...supply,
          quantity: newQuantity,
        }),
      });
      if (res.ok) {
        await fetchSupplies();
      }
    } finally {
      setSaving(false);
    }
  }


  const lowCount = supplies.filter((s) => s.is_low).length;
  const visible = supplies.filter(s => {
    const matchesStatus = filter === "low" ? s.is_low : true;
    const matchesType = selectedTypes.length === 0 || selectedTypes.includes(s.type);
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (s.sku && s.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesStatus && matchesType && matchesSearch;
  });

  const toggleType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
    );
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Stok</h1>
          <p className="page-subtitle">
            {loading ? "Memuat…" : `${supplies.length} item · ${lowCount} rendah`}
          </p>
        </div>
        <button 
          className="btn-ghost" 
          onClick={() => setFilterSheetOpen(true)}
          aria-label="Filter"
          style={{ padding: 8, color: selectedTypes.length > 0 ? "var(--primary)" : "var(--text-muted)" }}
        >
          <Filter size={18} />
          {selectedTypes.length > 0 && (
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
          placeholder="Cari nama atau SKU..."
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

      {lowCount > 0 && (
        <div className="alert-banner alert-danger animate-in">
          <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>
            <strong>{lowCount} item</strong> di bawah batas minimum stok
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
          Semua ({supplies.length})
        </button>
        <button
          className={`btn ${filter === "low" ? "btn-primary" : "btn-secondary"}`}
          style={{ flex: 1, padding: "8px 12px", fontSize: 14 }}
          onClick={() => setFilter("low")}
        >
          Stok Rendah ({lowCount})
        </button>
      </div>

      {loading && <div className="empty-state"><span className="spinner" /></div>}

      {!loading && visible.length === 0 && (
        <div className="empty-state animate-in">
          <Package size={48} />
          <h3>{filter === "low" ? "Tidak ada item stok rendah" : "Belum ada stok"}</h3>
          <p>{filter === "low" ? "Semua tingkat stok aman" : "Ketuk + untuk menambah stok pertama Anda"}</p>
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
                    <span className={TYPE_BADGE[s.type] ?? "badge badge-other"}>
                      {s.type === 'paper' ? 'Kertas' : s.type === 'cartridge' ? 'Kartrid' : s.type === 'ink' ? 'Tinta' : s.type === 'toner' ? 'Toner' : 'Lainnya'}
                    </span>
                    {s.is_low && <span className="badge badge-low"><AlertTriangle size={9} /> STOK RENDAH</span>}
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
                    <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: -2, fontWeight: 500 }}>BAWA</p>
                    
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
                        ? `${Math.abs(s.quantity - s.refill_requirement)} Kurang` 
                        : `${s.quantity - s.refill_requirement} Sisa`}
                    </div>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
                  <button 
                    className="btn-ghost" 
                    style={{ padding: 6, color: "var(--text-muted)" }}
                    onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(s, -1); }}
                    disabled={saving || s.quantity <= 0}
                  >
                    <Minus size={16} />
                  </button>
                  <span style={{ minWidth: 24, textAlign: "center", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>
                    {s.quantity}
                  </span>
                  <button 
                    className="btn-ghost" 
                    style={{ padding: 6, color: "var(--primary)" }}
                    onClick={(e) => { e.stopPropagation(); handleUpdateQuantity(s, 1); }}
                    disabled={saving}
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Add Supply Sheet */}
      <div className={`sheet-overlay${sheetOpen ? " open" : ""}`} onClick={() => setSheetOpen(false)} aria-hidden="true" />
      <div className={`bottom-sheet${sheetOpen ? " open" : ""}`} role="dialog" aria-label="Tambah Stok" aria-modal="true">
        <div className="sheet-handle" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 className="sheet-title" style={{ marginBottom: 0 }}>Tambah Stok</h2>
          <button className="btn-ghost" onClick={() => setSheetOpen(false)} aria-label="Tutup"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Foto (opsional)</label>
            <div className="photo-upload-area" onClick={() => fileRef.current?.click()} role="button" tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fileRef.current?.click()}>
              {form.photo_url ? (
                <img src={form.photo_url} alt="Pratinjau" className="photo-thumb" style={{ height: 100 }} />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, color: "var(--text-muted)" }}>
                  {uploadingPhoto ? <span className="spinner" /> : <ImageIcon size={24} />}
                  <span style={{ fontSize: 13 }}>{uploadingPhoto ? "Mengunggah…" : "Ketuk untuk unggah foto"}</span>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoChange} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="supply-name">Nama Stok *</label>
            <input id="supply-name" className="form-input" placeholder="misal: Kertas A4 80gsm"
              value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="supply-type">Jenis</label>
              <select id="supply-type" className="form-select" value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="paper">Kertas</option>
                <option value="cartridge">Kartrid</option>
                <option value="ink">Tinta</option>
                <option value="toner">Toner</option>
                <option value="other">Lainnya</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="supply-sku">SKU</label>
              <input id="supply-sku" className="form-input" placeholder="Opsional"
                value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div className="form-group">
              <label className="form-label" htmlFor="supply-qty">Jml *</label>
              <input id="supply-qty" type="number" className="form-input" min={0}
                value={form.quantity} onChange={(e) => setForm((f) => ({ ...f, quantity: parseInt(e.target.value) || 0 }))} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="supply-min">Stok Min. *</label>
              <input id="supply-min" type="number" className="form-input" min={0}
                value={form.min_quantity} onChange={(e) => setForm((f) => ({ ...f, min_quantity: parseInt(e.target.value) || 0 }))} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="supply-order-qty">Standar Pesanan</label>
              <input id="supply-order-qty" type="number" className="form-input" min={1}
                value={form.default_order_quantity} onChange={(e) => setForm((f) => ({ ...f, default_order_quantity: parseInt(e.target.value) || 1 }))} required />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="supply-unit">Satuan</label>
              <input id="supply-unit" className="form-input" placeholder="pcs"
                value={form.unit} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="supply-notes">Catatan</label>
            <textarea id="supply-notes" className="form-textarea" placeholder="Catatan opsional…"
              value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => setSheetOpen(false)}>Batal</button>
            <button type="submit" id="supply-form-submit" className="btn btn-primary" style={{ flex: 2 }} disabled={saving || !form.name}>
              {saving ? <span className="spinner" /> : <><Plus size={16} /> Tambah Stok</>}
            </button>
          </div>
        </form>
      </div>

      {/* Filter Bottom Sheet */}
      <div className={`sheet-overlay${filterSheetOpen ? " open" : ""}`} onClick={() => setFilterSheetOpen(false)} aria-hidden="true" />
      <div className={`bottom-sheet${filterSheetOpen ? " open" : ""}`} role="dialog" aria-label="Pilihan Filter" aria-modal="true">
        <div className="sheet-handle" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 className="sheet-title" style={{ marginBottom: 0 }}>Filter Stok</h2>
          <button className="btn-ghost" onClick={() => setFilterSheetOpen(false)} aria-label="Tutup"><X size={20} /></button>
        </div>

        <div className="form-group" style={{ marginBottom: 24 }}>
          <label className="form-label">Tingkat Stok</label>
          <div style={{ display: "flex", gap: 8 }}>
            <button 
              className={`btn ${filter === "all" ? "btn-primary" : "btn-secondary"}`}
              style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}
              onClick={() => setFilter("all")}
            >
              Semua
            </button>
            <button 
              className={`btn ${filter === "low" ? "btn-primary" : "btn-secondary"}`}
              style={{ flex: 1, padding: "8px 12px", fontSize: 13 }}
              onClick={() => setFilter("low")}
            >
              <AlertTriangle size={14} style={{ marginRight: 4 }} /> Stok Rendah
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Kategori Stok</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {Object.keys(TYPE_ICONS).map((type) => {
              const isActive = selectedTypes.includes(type);
              const labelMap: Record<string, string> = {
                paper: 'Kertas', cartridge: 'Kartrid', ink: 'Tinta', toner: 'Toner', other: 'Lainnya'
              };
              return (
                <button
                  key={type}
                  className={`btn ${isActive ? "btn-primary" : "btn-secondary"}`}
                  style={{ padding: "8px 16px", fontSize: 13, borderRadius: 12 }}
                  onClick={() => toggleType(type)}
                >
                  {isActive && <div style={{ width: 6, height: 6, background: "white", borderRadius: "50%", marginRight: 6 }} />}
                  {labelMap[type] || type}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 12, borderTop: "1px solid var(--border)", paddingTop: 20 }}>
          <button 
            className="btn-ghost" 
            style={{ flex: 1, fontSize: 14, fontWeight: 600, color: "var(--text-muted)" }}
            onClick={() => { setSelectedTypes([]); setFilter("all"); }}
          >
            Bersihkan Filter
          </button>
          <button 
            className="btn btn-primary" 
            style={{ flex: 1 }}
            onClick={() => setFilterSheetOpen(false)}
          >
            Lihat {visible.length} Hasil
          </button>
        </div>
      </div>
    </>
  );
}
