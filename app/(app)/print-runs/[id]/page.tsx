"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Printer, MapPin, Check, Package, FileText, Droplets, Box,
  CheckCircle,
} from "lucide-react";
import type { PrintRunWithDetails, PrintRunItem } from "@/app/_lib/types";

const TYPE_ICONS: Record<string, React.ReactNode> = {
  paper:     <FileText size={20} />,
  cartridge: <Box size={20} />,
  ink:       <Droplets size={20} />,
  toner:     <Box size={20} />,
  other:     <Package size={20} />,
};

export default function PrintRunDetailPage() {
  const router = useRouter();
  const { id } = useParams() as { id: string };
  const [run, setRun] = useState<PrintRunWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<number | null>(null);

  const fetchRun = useCallback(async () => {
    const res = await fetch(`/api/print-runs/${id}`);
    const json = await res.json() as { data: PrintRunWithDetails };
    setRun(json.data ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchRun(); }, [fetchRun]);

  async function toggleItem(item: PrintRunItem) {
    if (toggling === item.id) return;
    setToggling(item.id);

    // Optimistic update
    setRun((prev) => {
      if (!prev) return prev;
      const items = prev.items.map((i) =>
        i.id === item.id ? { ...i, is_packed: !i.is_packed } : i
      );
      return {
        ...prev,
        items,
        packed_count: items.filter((i) => i.is_packed).length,
      };
    });

    try {
      await fetch(`/api/print-runs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: item.id, is_packed: !item.is_packed }),
      });
    } finally {
      setToggling(null);
    }
  }

  if (loading) {
    return <div className="empty-state" style={{ paddingTop: 80 }}><span className="spinner" /></div>;
  }

  if (!run) {
    return (
      <div className="empty-state" style={{ paddingTop: 80 }}>
        <Package size={40} />
        <h3>Print run not found</h3>
        <button className="btn btn-primary" onClick={() => router.push("/print-runs")}>
          Back to Print Runs
        </button>
      </div>
    );
  }

  const pct = run.total_count > 0
    ? Math.round((run.packed_count / run.total_count) * 100)
    : 0;
  const allPacked = pct === 100 && run.total_count > 0;

  return (
    <>
      <div style={{ paddingTop: 16 }}>
        <button className="detail-back" onClick={() => router.push("/print-runs")}>
          <ArrowLeft size={16} /> Print Runs
        </button>
      </div>

      {/* Header card */}
      <div className="card animate-in" style={{ marginBottom: 16, background: allPacked ? "var(--success-dim)" : "var(--bg-card)", borderColor: allPacked ? "rgba(22,163,74,0.25)" : "var(--border)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: "var(--text-primary)" }}>{run.name}</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
              <Printer size={13} color="var(--text-muted)" />
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 500 }}>{run.printer_name}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
              <MapPin size={13} color="var(--text-muted)" />
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{run.printer_location}</span>
            </div>
          </div>
          {allPacked && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, color: "var(--success)" }}>
              <CheckCircle size={28} />
              <span style={{ fontSize: 11, fontWeight: 700 }}>ALL PACKED</span>
            </div>
          )}
        </div>

        {/* Progress */}
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              Progress
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: allPacked ? "var(--success)" : "var(--primary)" }}>
              {run.packed_count} / {run.total_count} items
            </span>
          </div>
          <div className="stock-bar-wrap" style={{ height: 8 }}>
            <div
              className={`stock-bar-fill ${allPacked ? "ok" : "danger"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Instruction */}
      <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12, textAlign: "center" }}>
        Tap each item to mark it as packed
      </p>

      {/* Checklist */}
      {run.items.length === 0 ? (
        <div className="empty-state animate-in">
          <Package size={40} />
          <h3>No items in this run</h3>
          <p>Delete and recreate with supplies selected</p>
        </div>
      ) : (
        <div className="list-stack">
          {run.items.map((item) => (
            <button
              key={item.id}
              id={`checklist-item-${item.id}`}
              className={`checklist-item${item.is_packed ? " packed" : ""}`}
              onClick={() => toggleItem(item)}
              aria-pressed={item.is_packed}
              aria-label={`${item.supply_name} — ${item.is_packed ? "packed" : "not packed"}`}
            >
              <div className="checklist-check">
                {(item.is_packed || toggling === item.id) && (
                  <Check size={12} strokeWidth={3} />
                )}
              </div>

              {item.supply_photo_url ? (
                <img src={item.supply_photo_url} alt={item.supply_name ?? ""} className="photo-thumb-sm" />
              ) : (
                <div className="photo-placeholder">
                  {TYPE_ICONS[item.supply_type ?? "other"] ?? <Package size={18} />}
                </div>
              )}

              <div style={{ flex: 1, textAlign: "left" }}>
                <p style={{
                  fontWeight: 600, fontSize: 15, color: "var(--text-primary)",
                  textDecoration: item.is_packed ? "line-through" : "none",
                  opacity: item.is_packed ? 0.6 : 1,
                }}>
                  {item.supply_name}
                </p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                  Bring: <strong>{item.quantity_needed}</strong> {item.supply_unit}
                </p>
              </div>

              {item.is_packed && (
                <span className="badge badge-fulfilled">
                  <Check size={9} /> Packed
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {allPacked && (
        <div className="alert-banner alert-success animate-in" style={{ marginTop: 20 }}>
          <CheckCircle size={16} style={{ flexShrink: 0 }} />
          <span><strong>All items packed!</strong> You are ready to go.</span>
        </div>
      )}
    </>
  );
}
