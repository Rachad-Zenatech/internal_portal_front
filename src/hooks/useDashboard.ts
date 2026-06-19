import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";

export type DashboardSummary = {
  assets: number;
  assetsChange: number;
  liabilities: number;
  liabilitiesChange: number;
  equity: number;
  equityChange: number;
  netIncome: number;
  netIncomeChange: number;
};

export type RevenueExpensePoint = {
  month: string;
  date?: string;
  revenue: number;
  expenses: number;
};

export type BankBalancePoint = {
  account: string;
  beginning: number;
  ending: number;
};

export type AccountDistributionPoint = {
  name: string;
  value: number;
  percentage: string;
};

export type RecentTransaction = {
  id: number | string;
  date: string;
  description: string;
  amount: number;
};

function withCompany(endpoint: string, companyId?: number | null) {
  if (!companyId) return endpoint;
  const separator = endpoint.includes("?") ? "&" : "?";
  return `${endpoint}${separator}company_id=${companyId}`;
}

async function fetcher<T>(endpoint: string, companyId?: number | null) {
  return apiClient.get<T>(`/dashboard${withCompany(endpoint, companyId)}`);
}

export function useDashboardSummary(companyId?: number | null) {
  return useQuery({
    queryKey: ["dashboard", "summary", companyId ?? "all"],
    queryFn: () => fetcher<DashboardSummary>("/summary", companyId),
  });
}

export function useRevenueExpenseChart(
  period: string = "monthly",
  companyId?: number | null
) {
  return useQuery({
    queryKey: ["dashboard", "revenue-expense", period, companyId ?? "all"],
    queryFn: () =>
      fetcher<RevenueExpensePoint[]>(
        `/revenue-expense?period=${period}`,
        companyId
      ),
  });
}

export function useBankBalancesChart(companyId?: number | null) {
  return useQuery({
    queryKey: ["dashboard", "bank-balances", companyId ?? "all"],
    queryFn: () => fetcher<BankBalancePoint[]>("/bank-balances", companyId),
  });
}

export function useAccountDistribution(companyId?: number | null) {
  return useQuery({
    queryKey: ["dashboard", "account-distribution", companyId ?? "all"],
    queryFn: () =>
      fetcher<AccountDistributionPoint[]>("/account-distribution", companyId),
  });
}

export function useRecentTransactions(companyId?: number | null) {
  return useQuery({
    queryKey: ["dashboard", "recent-transactions", companyId ?? "all"],
    queryFn: () => fetcher<RecentTransaction[]>("/recent-transactions", companyId),
  });
}
