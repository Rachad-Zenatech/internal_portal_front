// src/services/chartOfAccountService.ts
import type { ChartOfAccount, ChartOfAccounts } from "../types/chartOfAccount";
import { apiClient } from "./apiClient";

export const ChartOfAccountService = {
  async getChartOfAccount(id: number): Promise<ChartOfAccount> {
    return apiClient.get<ChartOfAccount>(`/accounting/chart-of-accounts/${id}`);
  },

  async getChartOfAccounts(): Promise<ChartOfAccounts> {
    return apiClient.get<ChartOfAccounts>(`/accounting/chart-of-accounts`);
  },

  async insertChartOfAccount(
    chartOfAccount: ChartOfAccount,
  ): Promise<ChartOfAccount> {
    return apiClient.post<ChartOfAccount>(
      `/accounting/chart-of-accounts`,
      chartOfAccount
    );
  },

  async deleteChartOfAccount(id: number): Promise<{ message: string }> {
    return apiClient.delete<{ message: string }>(
      `/accounting/chart-of-accounts/${id}`
    );
  },

  async updateChartOfAccount(
    data: ChartOfAccount,
  ): Promise<{ message: string }> {
    return apiClient.put<{ message: string }>(
      `/accounting/chart-of-accounts/${data.id}`,
      data
    );
  },

  async repalceCOAFromExcel(file: File): Promise<{ message: string }> {
    const formData = new FormData();
    formData.append("file", file);

    return apiClient.post<{ message: string }>(
      `/accounting/replace-chart-of-accounts`,
      formData
    );
  },
};
