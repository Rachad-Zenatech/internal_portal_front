import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/services/apiClient";

function withCompany(endpoint: string, companyId?: number | null) {
  if (!companyId) return endpoint;
  const separator = endpoint.includes("?") ? "&" : "?";
  return `${endpoint}${separator}company_id=${companyId}`;
}

async function fetcher(endpoint: string, companyId?: number | null) {
  return apiClient.get(`/dashboard${withCompany(endpoint, companyId)}`);
}

export function useDashboardSummary(companyId?: number | null) {
  return useQuery({
    queryKey: ["dashboard", "summary", companyId ?? "all"],
    queryFn: () => fetcher("/summary", companyId),
  });
}

export function useRevenueExpenseChart(
  period: string = "monthly",
  companyId?: number | null
) {
  return useQuery({
    queryKey: ["dashboard", "revenue-expense", period, companyId ?? "all"],
    queryFn: () => fetcher(`/revenue-expense?period=${period}`, companyId),
  });
}

export function useBankBalancesChart(companyId?: number | null) {
  return useQuery({
    queryKey: ["dashboard", "bank-balances", companyId ?? "all"],
    queryFn: () => fetcher("/bank-balances", companyId),
  });
}

export function useAccountDistribution(companyId?: number | null) {
  return useQuery({
    queryKey: ["dashboard", "account-distribution", companyId ?? "all"],
    queryFn: () => fetcher("/account-distribution", companyId),
  });
}

export function useRecentTransactions(companyId?: number | null) {
  return useQuery({
    queryKey: ["dashboard", "recent-transactions", companyId ?? "all"],
    queryFn: () => fetcher("/recent-transactions", companyId),
  });
}
