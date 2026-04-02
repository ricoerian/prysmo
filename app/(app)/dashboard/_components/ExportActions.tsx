"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, Package, Printer, ShoppingCart, List, X } from "lucide-react";
import { exportToExcel, exportCombinedToExcel, MAPPINGS } from "@/app/_lib/excel";

export default function ExportActions() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState<string | null>(null);

  /**
   * Fetches data for a specific type and triggers Excel download
   */
  async function handleExport(type: "all" | keyof typeof MAPPINGS) {
    setLoading(type);
    try {
      if (type === "all") {
        // Fetch all datasets in parallel
        const [s, p, o, pr] = await Promise.all([
          fetch("/api/supplies").then((r) => r.json()),
          fetch("/api/printers").then((r) => r.json()),
          fetch("/api/orders").then((r) => r.json()),
          fetch("/api/print-runs").then((r) => r.json()),
        ]);

        exportCombinedToExcel(
          [
            { type: "supplies", data: s.data, label: "Stok" },
            { type: "printers", data: p.data, label: "Printer" },
            { type: "orders", data: o.data, label: "Pesanan" },
            { type: "printRuns", data: pr.data, label: "Riwayat Cetak" },
          ],
          "Prysmo_Full_Export_" + new Date().toISOString().split("T")[0]
        );
      } else {
        // Fetch specific dataset
        const endpoint = type === "printRuns" ? "print-runs" : type;
        const res = await fetch(`/api/${endpoint}`);
        const json = await res.json();
        
        const labels: Record<string, string> = {
          supplies: "Stok",
          printers: "Printer",
          orders: "Pesanan",
          printRuns: "Riwayat_Cetak",
        };
        
        exportToExcel(
          json.data,
          type as keyof typeof MAPPINGS,
          `Prysmo_${labels[type]}_${new Date().toISOString().split("T")[0]}`
        );
      }
      setIsOpen(false);
    } catch (err) {
      console.error("Export error:", err);
      alert("Gagal mengekspor data ke Excel.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ marginBottom: 24 }}>
      <p className="section-title">Alat &amp; Laporan</p>
      <button 
        className="btn btn-secondary btn-full" 
        onClick={() => setIsOpen(true)}
        aria-label="Buka opsi ekspor"
      >
        <FileSpreadsheet size={18} /> Ekspor ke Excel
      </button>

      {/* Sheet Overlay */}
      <div 
        className={`sheet-overlay${isOpen ? " open" : ""}`} 
        onClick={() => setIsOpen(false)} 
        aria-hidden="true" 
      />

      {/* Bottom Sheet */}
      <div 
        className={`bottom-sheet${isOpen ? " open" : ""}`} 
        role="dialog" 
        aria-label="Opsi Ekspor Excel"
        aria-modal="true"
      >
        <div className="sheet-handle" />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 className="sheet-title" style={{ marginBottom: 0 }}>Opsi Ekspor Excel</h2>
          <button 
            className="btn-ghost" 
            onClick={() => setIsOpen(false)} 
            aria-label="Tutup"
          >
            <X size={20} />
          </button>
        </div>

        <div className="list-stack">
          {/* Combined Export */}
          <button 
            className="card card-press" 
            style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12, border: "1.5px solid var(--primary-dim)" }} 
            onClick={() => handleExport("all")} 
            disabled={!!loading}
          >
            <div className="photo-placeholder" style={{ background: "var(--primary)", color: "white" }}>
              {loading === "all" ? <span className="spinner" style={{ borderTopColor: "white" }} /> : <Download size={20} />}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, color: "var(--primary)" }}>Semua Data (Gabungan)</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Satukan semua tabel dalam satu file Excel</p>
            </div>
          </button>

          <div style={{ height: 8 }} />

          {/* Individual Exports */}
          <button 
            className="card card-press" 
            style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}
            onClick={() => handleExport("supplies")} 
            disabled={!!loading}
          >
            <div className="photo-placeholder">
              {loading === "supplies" ? <span className="spinner" /> : <Package size={20} />}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600 }}>Stok (Supplies)</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Data inventaris stok barang</p>
            </div>
          </button>

          <button 
            className="card card-press" 
            style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}
            onClick={() => handleExport("printers")} 
            disabled={!!loading}
          >
            <div className="photo-placeholder">
              {loading === "printers" ? <span className="spinner" /> : <Printer size={20} />}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600 }}>Printer</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Daftar unit printer dan lokasinya</p>
            </div>
          </button>

          <button 
            className="card card-press" 
            style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}
            onClick={() => handleExport("orders")} 
            disabled={!!loading}
          >
            <div className="photo-placeholder">
              {loading === "orders" ? <span className="spinner" /> : <ShoppingCart size={20} />}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600 }}>Pesanan (Orders)</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Riwayat pesanan pengisian stok</p>
            </div>
          </button>

          <button 
            className="card card-press" 
            style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 12 }}
            onClick={() => handleExport("printRuns")} 
            disabled={!!loading}
          >
            <div className="photo-placeholder">
              {loading === "printRuns" ? <span className="spinner" /> : <List size={20} />}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 600 }}>Riwayat Cetak (Print Runs)</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Laporan persiapan alat &amp; bahan</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
