import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";
import { format } from "date-fns";
import type {
  AccountDistributionPoint,
  BankBalancePoint,
  DashboardSummary,
  RecentTransaction,
  RevenueExpensePoint,
} from "@/types/dashboard";
import type { DateRange } from "react-day-picker";

export type DashboardFilters = {
  companyId?: number | null;
  dateRange?: DateRange;
};

function buildParams(endpoint: string, filters: DashboardFilters) {
  const url = new URL(endpoint, "http://localhost"); // Dummy base for URL API
  if (filters.companyId) {
    url.searchParams.set("company_id", String(filters.companyId));
  }
  if (filters.dateRange?.from) {
    url.searchParams.set("start_date", format(filters.dateRange.from, "yyyy-MM-dd"));
  }
  if (filters.dateRange?.to) {
    url.searchParams.set("end_date", format(filters.dateRange.to, "yyyy-MM-dd"));
  }
  return `${url.pathname}${url.search}`;
}

async function fetcher<T>(endpoint: string, filters: DashboardFilters) {
  return apiClient.get<T>(`/dashboard${buildParams(endpoint, filters)}`);
}

export function useDashboardSummary(filters: DashboardFilters = {}) {
  return useQuery({
    queryKey: ["dashboard", "summary", filters.companyId ?? "all", filters.dateRange?.from, filters.dateRange?.to],
    queryFn: () => fetcher<DashboardSummary>("/summary", filters),
  });
}

export function useRevenueExpenseChart(
  period: string = "monthly",
  filters: DashboardFilters = {}
) {
  return useQuery({
    queryKey: ["dashboard", "revenue-expense", period, filters.companyId ?? "all", filters.dateRange?.from, filters.dateRange?.to],
    queryFn: () =>
      fetcher<RevenueExpensePoint[]>(
        `/revenue-expense?period=${period}`,
        filters
      ),
  });
}

export function useBankBalancesChart(filters: DashboardFilters = {}) {
  return useQuery({
    queryKey: ["dashboard", "bank-balances", filters.companyId ?? "all", filters.dateRange?.from, filters.dateRange?.to],
    queryFn: () => fetcher<BankBalancePoint[]>("/bank-balances", filters),
  });
}

export function useAccountDistribution(filters: DashboardFilters = {}) {
  return useQuery({
    queryKey: ["dashboard", "account-distribution", filters.companyId ?? "all", filters.dateRange?.from, filters.dateRange?.to],
    queryFn: () =>
      fetcher<AccountDistributionPoint[]>("/account-distribution", filters),
  });
}

export function useRecentTransactions(filters: DashboardFilters = {}) {
  return useQuery({
    queryKey: ["dashboard", "recent-transactions", filters.companyId ?? "all", filters.dateRange?.from, filters.dateRange?.to],
    queryFn: () => fetcher<RecentTransaction[]>("/recent-transactions", filters),
  });
}
