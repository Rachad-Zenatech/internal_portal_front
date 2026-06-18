import { useQuery } from "@tanstack/react-query";

const BASE_URL = "http://localhost:8000/dashboard";

async function fetcher(endpoint: string) {
  const response = await fetch(`${BASE_URL}${endpoint}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${endpoint}`);
  }
  return response.json();
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => fetcher("/summary"),
  });
}

export function useRevenueExpenseChart(period: string = "monthly") {
  return useQuery({
    queryKey: ["dashboard", "revenue-expense", period],
    queryFn: () => fetcher(`/revenue-expense?period=${period}`),
  });
}

export function useBankBalancesChart() {
  return useQuery({
    queryKey: ["dashboard", "bank-balances"],
    queryFn: () => fetcher("/bank-balances"),
  });
}

export function useAccountDistribution() {
  return useQuery({
    queryKey: ["dashboard", "account-distribution"],
    queryFn: () => fetcher("/account-distribution"),
  });
}

export function useRecentTransactions() {
  return useQuery({
    queryKey: ["dashboard", "recent-transactions"],
    queryFn: () => fetcher("/recent-transactions"),
  });
}
