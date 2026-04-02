import * as XLSX from "xlsx";

function mapData(data: Record<string, unknown>[], headers: Record<string, string>) {
  return data.map((item) => {
    const mapped: Record<string, unknown> = {};
    Object.entries(headers).forEach(([key, label]) => {
      let value = item[key];
      
      // Formatting specific fields
      if (key.includes("at") && value && (typeof value === "string" || typeof value === "number" || value instanceof Date)) {
        value = new Date(value).toLocaleDateString("id-ID", {
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      
      mapped[label] = value ?? "-";
    });
    return mapped;
  });
}

const SUPPLY_HEADERS = {
  name: "Nama Item",
  type: "Jenis",
  sku: "SKU",
  quantity: "Stok Saat Ini",
  min_quantity: "Stok Minimum",
  unit: "Satuan",
  notes: "Catatan",
  created_at: "Tanggal Dibuat",
};

const PRINTER_HEADERS = {
  name: "Nama Printer",
  brand: "Merk",
  model: "Model",
  location: "Lokasi",
  status: "Status",
  notes: "Catatan",
  created_at: "Tanggal Dibuat",
};

const ORDER_HEADERS = {
  supply_name: "Nama Item",
  quantity: "Jumlah",
  status: "Status",
  ordered_at: "Tanggal Pesan",
  orderer_name: "Pemesan",
  notes: "Catatan",
};

const PRINT_RUN_HEADERS = {
  name: "Nama Cetak",
  printer_name: "Printer",
  printer_location: "Lokasi Printer",
  total_count: "Total Item",
  packed_count: "Item Dikemas",
  notes: "Catatan",
  created_at: "Tanggal Dibuat",
};

export const MAPPINGS = {
  supplies: SUPPLY_HEADERS,
  printers: PRINTER_HEADERS,
  orders: ORDER_HEADERS,
  printRuns: PRINT_RUN_HEADERS,
};

/**
 * Exports a single dataset to Excel
 */
export function exportToExcel(data: Record<string, unknown>[], type: keyof typeof MAPPINGS, filename: string) {
  const mappedData = mapData(data, MAPPINGS[type]);
  const ws = XLSX.utils.json_to_sheet(mappedData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

/**
 * Exports multiple datasets into sheets of a single Excel workbook
 */
export function exportCombinedToExcel(
  datasets: { type: keyof typeof MAPPINGS; data: Record<string, unknown>[]; label: string }[],
  filename: string
) {
  const wb = XLSX.utils.book_new();
  datasets.forEach(({ type, data, label }) => {
    const mappedData = mapData(data, MAPPINGS[type]);
    const ws = XLSX.utils.json_to_sheet(mappedData);
    XLSX.utils.book_append_sheet(wb, ws, label);
  });
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
