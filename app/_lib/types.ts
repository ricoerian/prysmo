export interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  created_at: string;
}

export interface Printer {
  id: number;
  name: string;
  model: string;
  brand: string;
  location: string;
  status: "active" | "inactive" | "maintenance";
  notes: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface Supply {
  id: number;
  name: string;
  type: "paper" | "cartridge" | "ink" | "toner" | "other";
  sku: string | null;
  quantity: number;
  min_quantity: number;
  unit: string;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface PrinterSupply {
  printer_id: number;
  supply_id: number;
}

export interface StockOrder {
  id: number;
  supply_id: number;
  quantity: number;
  status: "pending" | "fulfilled" | "cancelled";
  notes: string | null;
  ordered_at: string;
  fulfilled_at: string | null;
  ordered_by: number;
}

export interface PrintRun {
  id: number;
  printer_id: number;
  name: string;
  notes: string | null;
  created_by: number;
  created_at: string;
}

export interface PrintRunItem {
  id: number;
  run_id: number;
  supply_id: number;
  quantity_needed: number;
  is_packed: boolean;
  supply_name?: string;
  supply_type?: string;
  supply_unit?: string;
  supply_photo_url?: string | null;
}

// Extended types with joins
export interface SupplyWithStatus extends Supply {
  is_low: boolean;
  linked_printers?: number;
}

export interface OrderWithDetails extends StockOrder {
  supply_name: string;
  supply_type: string;
  supply_photo_url: string | null;
  orderer_name: string;
}

export interface PrinterWithSupplies extends Printer {
  supplies: Supply[];
}

export interface SupplyWithPrinters extends Supply {
  is_low: boolean;
  printers: Printer[];
}

export interface PrintRunWithDetails extends PrintRun {
  printer_name: string;
  printer_location: string;
  items: PrintRunItem[];
  packed_count: number;
  total_count: number;
}

export interface SessionPayload {
  userId: number;
  email: string;
  name: string;
  role: "admin" | "user";
}

export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}

export interface DashboardStats {
  totalPrinters: number;
  activePrinters: number;
  totalSupplies: number;
  lowStockCount: number;
  pendingOrders: number;
  lowStockSupplies: SupplyWithStatus[];
  recentOrders: OrderWithDetails[];
}
