/**
 * mobileDataService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized API layer for Weeg mobile app.
 * Mirrors the Django REST endpoints used by the web frontend.
 *
 * Import path for api.ts: adjust '../../lib/api' to match your project.
 */

import { TokenStorage, BASE_URL } from '../lib/api';

// ─── Generic fetch helper ─────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const token = await TokenStorage.getAccess();
  const url = new URL(`${BASE_URL}/api${path}`);

  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, String(v));
      }
    });
  }

  const res = await fetch(url.toString(), {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || err?.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DashboardKPIs {
  totalSales: number;
  totalSalesPrev: number;
  salesEvolution: number | null;
  stockValue: number;
  totalReceivables: number;
  overdueAmount: number;
  overdueRate: number;
  collectionRate: number;
  dso: number;
  creditCustomers: number;
  totalCustomers: number;
}

export interface MonthlySummaryItem {
  year: number;
  month: number;
  month_label: string;
  total_sales: number;
  total_purchases: number;
  sales_count: number;
  purchases_count: number;
}

export interface AgingRiskItem {
  id: string;
  account: string;
  account_code: string;
  customer_name: string | null;
  branch: string | null;
  total: number;
  overdue_total: number;
  risk_score: 'low' | 'medium' | 'high' | 'critical';
}

export interface AgingDistributionItem {
  bucket: string;
  label: string;
  total: number;
  percentage: number;
  midpoint_days: number;
}

export interface AgingRow {
  id: string;
  snapshot_id: string;
  account_code: string;
  account: string;
  customer_name: string | null;
  current: number;
  d1_30: number;
  d31_60: number;
  d61_90: number;
  d91_120: number;
  d121_150: number;
  d151_180: number;
  d181_210: number;
  d211_240: number;
  d241_270: number;
  d271_300: number;
  d301_330: number;
  over_330: number;
  total: number;
  overdue_total: number;
  risk_score: 'low' | 'medium' | 'high' | 'critical';
  branch?: string | null;
}

export interface AgingListResponse {
  snapshot_id: string | null;
  report_date: string | null;
  count: number;
  grand_total: number;
  page: number;
  page_size: number;
  total_pages: number;
  records: AgingRow[];
}

export interface InventoryBranch {
  branch: string;
  total_qty: number;
  total_value: number;
}

export interface InventoryCategory {
  category: string;
  total_qty: number;
  total_value: number;
}

export interface InventoryLine {
  id: string;
  product_category: string;
  product_code: string;
  product_name: string;
  branch_name: string;
  quantity: number;
  unit_cost: number;
  line_value: number;
}

export interface InventorySnapshot {
  id: string;
  company_name: string;
  label: string;
  snapshot_date: string | null;
  fiscal_year: string;
  source_file: string;
  uploaded_at: string;
  line_count: number;
  total_lines_value: number;
}

export interface Transaction {
  id: string;
  material_code: string;
  material_name: string;
  movement_date: string;
  movement_type: string;
  qty_in: number | null;
  qty_out: number | null;
  total_in: number | null;
  total_out: number | null;
  balance_price: number | null;
  branch: string | null;
  branch_name_resolved: string | null;
  customer_name: string | null;
}

export interface TransactionListResponse {
  count: number;
  page: number;
  page_size: number;
  total_pages: number;
  totals: { total_in_value: number; total_out_value: number };
  movements: Transaction[];
}

// ─── Dashboard Service ────────────────────────────────────────────────────────

export const DashboardService = {
  async getDashboardKPIs(): Promise<DashboardKPIs> {
    const [salesRes, creditRes, stockRes] = await Promise.allSettled([
      apiFetch<any>('/kpi/sales/'),
      apiFetch<any>('/kpi/credit/'),
      apiFetch<any>('/inventory/branch-summary/'),
    ]);

    const sales  = salesRes.status  === 'fulfilled' ? salesRes.value  : null;
    const credit = creditRes.status === 'fulfilled' ? creditRes.value : null;
    const stock  = stockRes.status  === 'fulfilled' ? stockRes.value  : null;

    const stockValue = (stock?.branches ?? []).reduce(
      (sum: number, b: InventoryBranch) => sum + (b.total_value ?? 0), 0,
    );

    return {
      totalSales:       sales?.ca?.total      ?? 0,
      totalSalesPrev:   sales?.ca?.previous   ?? 0,
      salesEvolution:   sales?.sales_evolution?.value ?? null,
      stockValue,
      totalReceivables: credit?.summary?.grand_total_receivables ?? 0,
      overdueAmount:    credit?.summary?.overdue_amount           ?? 0,
      overdueRate:      credit?.kpis?.taux_impayes?.value        ?? 0,
      collectionRate:   credit?.kpis?.taux_recouvrement?.value   ?? 0,
      dso:              credit?.kpis?.dmp?.value                 ?? 0,
      creditCustomers:  credit?.summary?.credit_customers        ?? 0,
      totalCustomers:   credit?.summary?.total_customers         ?? 0,
    };
  },

  async getMonthlySummary(params?: {
    year?: number;
    date_from?: string;
    date_to?: string;
  }): Promise<{ summary: MonthlySummaryItem[] }> {
    return apiFetch('/transactions/summary/', params as any);
  },
};

// ─── Aging Service ────────────────────────────────────────────────────────────

export const AgingService = {
  async getTopRisk(limit = 10): Promise<{ count: number; top_risk: AgingRiskItem[] }> {
    return apiFetch('/aging/risk/', { limit });
  },

  async getDistribution(): Promise<{ grand_total: number; distribution: AgingDistributionItem[] }> {
    return apiFetch('/aging/distribution/');
  },

  async getList(params?: {
    page?: number;
    page_size?: number;
    search?: string;
    risk?: string;
    ordering?: string;
  }): Promise<AgingListResponse> {
    return apiFetch('/aging/', params as any);
  },
};

// ─── Inventory Service ────────────────────────────────────────────────────────

export const InventoryMobileService = {
  async getLatestSnapshot(): Promise<{ items: InventorySnapshot[] }> {
    return apiFetch('/inventory/', { page: 1, page_size: 1 });
  },

  async getBranchSummary(snapshotId?: string): Promise<{ branches: InventoryBranch[] }> {
    return apiFetch('/inventory/branch-summary/', snapshotId ? { snapshot_id: snapshotId } : undefined);
  },

  async getCategoryBreakdown(snapshotId?: string): Promise<{ categories: InventoryCategory[] }> {
    return apiFetch('/inventory/category-breakdown/', snapshotId ? { snapshot_id: snapshotId } : undefined);
  },

  async getLines(snapshotId: string, params?: {
    page?: number;
    page_size?: number;
    branch?: string;
    search?: string;
  }): Promise<{
    snapshot_id: string;
    count: number;
    page: number;
    total_pages: number;
    totals: {
      grand_total_qty: number;
      grand_total_value: number;
      distinct_products: number;
      out_of_stock_count: number;
      critical_count: number;
      low_count: number;
    };
    lines: InventoryLine[];
  }> {
    return apiFetch(`/inventory/${snapshotId}/lines/`, params as any);
  },
};

// ─── Transactions Service ─────────────────────────────────────────────────────

export const TransactionMobileService = {
  async getList(params?: {
    page?: number;
    page_size?: number;
    movement_type?: string;
    branch?: string;
    search?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<TransactionListResponse> {
    return apiFetch('/transactions/', params as any);
  },

  async getMovementTypes(): Promise<{ movement_types: string[] }> {
    return apiFetch('/transactions/movement-types/');
  },

  async getBranches(): Promise<{ branches: string[] }> {
    return apiFetch('/transactions/branches/');
  },
};

// ─── Re-export ────────────────────────────────────────────────────────────────

export const MobileDataService = {
  Dashboard:    DashboardService,
  Aging:        AgingService,
  Inventory:    InventoryMobileService,
  Transactions: TransactionMobileService,
};

export default MobileDataService;