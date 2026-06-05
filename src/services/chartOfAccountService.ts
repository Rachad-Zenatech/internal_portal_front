// src/services/chartOfAccountService.ts
import type { ChartOfAccount, ChartOfAccounts } from '../types/chartOfAccount';
import.meta.env.VITE_API_BASE_URL;

export const getChartOfAccount = async (id: number) => {
    return fetch(`${import.meta.env.VITE_API_BASE_URL}/accounting/chart-of-accounts/${id}`).then((res) => res.json() as Promise<ChartOfAccount>);
}

export const getChartOfAccounts = async () => {
    return fetch(`${import.meta.env.VITE_API_BASE_URL}/accounting/chart-of-accounts`).then((res) => res.json() as Promise<ChartOfAccounts>);
}
export const insertChartOfAccount = async (chartOfAccount: ChartOfAccount): Promise<ChartOfAccount> => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/accounting/chart-of-accounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(chartOfAccount),
    });

    const data = await response.json();

    // ✅ CRITICAL: Throw an error if response.ok is false
    if (!response.ok) {
      throw new Error(data.detail || "Failed to insert account");
    }

    return data;
}

export const deleteChartOfAccount = async (id: number): Promise<{ message: string }> => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/accounting/chart-of-accounts/${id}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to delete account");
    }

    return data;
}