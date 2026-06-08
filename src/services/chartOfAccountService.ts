// src/services/chartOfAccountService.ts
import type { ChartOfAccount, ChartOfAccounts } from "../types/chartOfAccount";
import.meta.env.VITE_API_BASE_URL;

export const chartOfAccountService = {
  async getChartOfAccount(id: number) {
    return fetch(
      `${import.meta.env.VITE_API_BASE_URL}/accounting/chart-of-accounts/${id}`,
    ).then((res) => res.json() as Promise<ChartOfAccount>);
  },

  async getChartOfAccounts() {
    return fetch(
      `${import.meta.env.VITE_API_BASE_URL}/accounting/chart-of-accounts`,
    ).then((res) => res.json() as Promise<ChartOfAccounts>);
  },
  async insertChartOfAccount(
    chartOfAccount: ChartOfAccount,
  ): Promise<ChartOfAccount> {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/accounting/chart-of-accounts`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(chartOfAccount),
      },
    );

    const data = await response.json();

    // ✅ CRITICAL: Throw an error if response.ok is false
    if (!response.ok) {
      throw new Error(data.detail || "Failed to insert account");
    }

    return data;
  },

  async deleteChartOfAccount(id: number): Promise<{ message: string }> {
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/accounting/chart-of-accounts/${id}`,
      {
        method: "DELETE",
      },
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Failed to delete account");
    }

    return data;
  },

  async updateChartOfAccount(
    data: ChartOfAccount,
  ): Promise<{ message: string }> {
    // We extract the ID for the URL, and send the rest in the body
    const response = await fetch(
      `${import.meta.env.VITE_API_BASE_URL}/accounting/chart-of-accounts/${data.id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.detail || "Failed to update account");
    }

    return result;
  },

  async repalceCOAFromExcel(file: File): Promise<{ message: string }> {
    const formData = new FormData();
    // The key 'file' must exactly match the parameter name in your FastAPI route
    // async def replace_full_coa_from_excel (file: UploadFile = File(...)):
    formData.append("file", file);

    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/accounting/replace-chart-of-accounts`, {
      method: 'POST',
      body: formData, 
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || data.message || "Failed to sync COA from file");
    }

    return data;
  },
};
