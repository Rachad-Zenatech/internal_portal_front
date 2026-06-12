// src/services/bankService.ts

import type { 
    Company, CompanyCreate, CompanyUpdate, 
    Bank, BankCreate, BankUpdate, BankAccount, 
    BankAccountCreate, BankAccountUpdate, 
    BankStatement, StatementUpdate,
    CheckTransaction, CheckCreate, CheckUpdate,
    DepositCreate, DepositTransaction, DepositUpdate,
    QuarterlySummary, StatementCreate, StatementPreview,
    Summary, SummaryPeriod
} from "@/types/bank";
import { handleResponse } from "./helper";
import.meta.env.VITE_API_BASE_URL;

// ─── Company service ──────────────────────────────────────────────────────────
 
export const companyService = {
  async getCompanies(): Promise<Company[]> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/company/companies`);
    return handleResponse(response);
  },
 
  async getCompany(id: number): Promise<Company> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/company/companies/${id}`);
    return handleResponse(response);
  },
 
  async createCompany(data: CompanyCreate): Promise<Company> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/company/companies`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
 
  async updateCompany(id: number, data: CompanyUpdate): Promise<Company> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/company/companies/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
 
  async deleteCompany(id: number): Promise<null> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/company/companies/${id}`, {
      method: "DELETE",
    });
    return handleResponse(response);
  },
};
 
// ─── Bank service ─────────────────────────────────────────────────────────────
 
export const bankService = {
  async getBanks(): Promise<Bank[]> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bank_statement/banks`);
    return handleResponse(response);
  },
 
  async getBank(id: number): Promise<Bank> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bank_statement/banks/${id}`);
    return handleResponse(response);
  },
 
  async createBank(data: BankCreate): Promise<Bank> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bank_statement/banks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
 
  async updateBank(id: number, data: BankUpdate): Promise<Bank> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bank_statement/banks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
 
  async deleteBank(id: number): Promise<null> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bank_statement/banks/${id}`, { method: "DELETE" });
    return handleResponse(response);
  },
};
 
// ─── Bank account service ─────────────────────────────────────────────────────
 
export const bankAccountService = {
  async getBankAccounts(companyId?: number | null): Promise<BankAccount[]> {
    const url = companyId
      ? `${import.meta.env.VITE_API_BASE_URL}/bank_statement/bank-accounts?company_id=${companyId}`
      : `${import.meta.env.VITE_API_BASE_URL}/bank_statement/bank-accounts`;
    const response = await fetch(url);
    return handleResponse(response);
  },
 
  async getBankAccount(id: number): Promise<BankAccount> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bank_statement/bank-accounts/${id}`);
    return handleResponse(response);
  },
 
  async createBankAccount(data: BankAccountCreate): Promise<BankAccount> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bank_statement/bank-accounts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
 
  async updateBankAccount(id: number, data: BankAccountUpdate): Promise<BankAccount> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bank_statement/bank-accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
 
  async deleteBankAccount(id: number): Promise<null> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bank_statement/bank-accounts/${id}`, { method: "DELETE" });
    return handleResponse(response);
  },
};
 
// ─── Statement service ────────────────────────────────────────────────────────
 
export const statementService = {
  async getStatements(accountId?: number | null): Promise<BankStatement[]> {
    const url = accountId
      ? `${import.meta.env.VITE_API_BASE_URL}/bank_statement/statements?account_id=${accountId}`
      : `${import.meta.env.VITE_API_BASE_URL}/bank_statement/statements`;
    const response = await fetch(url);
    return handleResponse(response);
  },
 
  async getStatement(id: number): Promise<BankStatement> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bank_statement/statements/${id}`);
    return handleResponse(response);
  },
 
  async createStatement(data: StatementCreate): Promise<BankStatement> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bank_statement/statements`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
 
  async updateStatement(id: number, data: StatementUpdate): Promise<BankStatement> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bank_statement/statements/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
 
  async deleteStatement(id: number): Promise<null> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bank_statement/statements/${id}`, { method: "DELETE" });
    return handleResponse(response);
  },
 
  async getStatementsByQuarter(
    year: number,
    quarter: number,
    accountId?: number | null,
  ): Promise<BankStatement[]> {
    let url = `${import.meta.env.VITE_API_BASE_URL}/bank_statement/statements/by-quarter?year=${year}&quarter=${quarter}`;
    if (accountId) url += `&account_id=${accountId}`;
    const response = await fetch(url);
    return handleResponse(response);
  },
 
  async getQuarterlySummary(
    year: number,
    companyId?: number | null,
    accountId?: number | null,
  ): Promise<QuarterlySummary[]> {
    let url = `${import.meta.env.VITE_API_BASE_URL}/bank_statement/statements/quarterly?year=${year}`;
    if (companyId) url += `&company_id=${companyId}`;
    if (accountId) url += `&account_id=${accountId}`;
    const response = await fetch(url);
    return handleResponse(response);
  },

  async getSummary(
    period: SummaryPeriod,
    year: number,
    companyId?: number | null,
    accountId?: number | null,
  ): Promise<Summary[]> {
    let url = `${import.meta.env.VITE_API_BASE_URL}/bank_statement/statements/summary?year=${year}&period=${period}`;
    if (companyId) url += `&company_id=${companyId}`;
    if (accountId) url += `&account_id=${accountId}`;
    const response = await fetch(url);
    return handleResponse(response);
  },
 
  async uploadStatement(
    accountId: number,
    bankType: string,
    file: File,
    tesseractCmd?: string | null,
  ): Promise<BankStatement> {
    const form = new FormData();
    form.append("file", file);
    let url = `${import.meta.env.VITE_API_BASE_URL}/bank_statement/statements/upload?account_id=${accountId}&bank_type=${bankType}`;
    if (tesseractCmd) url += `&tesseract_cmd=${encodeURIComponent(tesseractCmd)}`;
    const response = await fetch(url, { method: "POST", body: form });
    return handleResponse(response);
  },

  // Parse a PDF and return the extracted data for review — does NOT persist.
  async previewStatement(
    accountId: number,
    bankType: string,
    file: File,
    tesseractCmd?: string | null,
  ): Promise<StatementPreview> {
    const form = new FormData();
    form.append("file", file);
    let url = `${import.meta.env.VITE_API_BASE_URL}/bank_statement/statements/preview?account_id=${accountId}&bank_type=${bankType}`;
    if (tesseractCmd) url += `&tesseract_cmd=${encodeURIComponent(tesseractCmd)}`;
    const response = await fetch(url, { method: "POST", body: form });
    return handleResponse(response);
  },

  // Persist a previously previewed (and reviewed) statement.
  async commitStatement(preview: StatementPreview): Promise<BankStatement> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bank_statement/statements/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(preview),
    });
    return handleResponse(response);
  },
};
 
// ─── Check transaction service ────────────────────────────────────────────────
 
export const checkService = {
  async getChecks(statementId: number, section?: string | null): Promise<CheckTransaction[]> {
    const url = section
      ? `${import.meta.env.VITE_API_BASE_URL}/bank_statement/statements/${statementId}/checks?section=${section}`
      : `${import.meta.env.VITE_API_BASE_URL}/bank_statement/statements/${statementId}/checks`;
    const response = await fetch(url);
    return handleResponse(response);
  },
 
  async getCheck(id: number): Promise<CheckTransaction> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bank_statement/checks/${id}`);
    return handleResponse(response);
  },
 
  async createCheck(data: CheckCreate): Promise<CheckTransaction> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bank_statement/checks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
 
  async updateCheck(id: number, data: CheckUpdate): Promise<CheckTransaction> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bank_statement/checks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
 
  async deleteCheck(id: number): Promise<null> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bank_statement/checks/${id}`, { method: "DELETE" });
    return handleResponse(response);
  },
};
 
// ─── Deposit transaction service ──────────────────────────────────────────────
 
export const depositService = {
  async getDeposits(statementId: number, section?: string | null): Promise<DepositTransaction[]> {
    const url = section
      ? `${import.meta.env.VITE_API_BASE_URL}/bank_statement/statements/${statementId}/deposits?section=${section}`
      : `${import.meta.env.VITE_API_BASE_URL}/bank_statement/statements/${statementId}/deposits`;
    const response = await fetch(url);
    return handleResponse(response);
  },
 
  async getDeposit(id: number): Promise<DepositTransaction> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bank_statement/deposits/${id}`);
    return handleResponse(response);
  },
 
  async createDeposit(data: DepositCreate): Promise<DepositTransaction> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bank_statement/deposits`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
 
  async updateDeposit(id: number, data: DepositUpdate): Promise<DepositTransaction> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bank_statement/deposits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },
 
  async deleteDeposit(id: number): Promise<null> {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/bank_statement/deposits/${id}`, { method: "DELETE" });
    return handleResponse(response);
  },
};