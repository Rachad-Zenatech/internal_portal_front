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
import { apiClient } from "./apiClient";

// ─── Company service ──────────────────────────────────────────────────────────

export const companyService = {
  getCompanies: () => apiClient.get<Company[]>("/company/companies"),
  getEntities: () => apiClient.get<string[]>("/company/entities"),
  getCompany: (id: number) => apiClient.get<Company>(`/company/companies/${id}`),
  createCompany: (data: CompanyCreate) => apiClient.post<Company>("/company/companies", data),
  updateCompany: (id: number, data: CompanyUpdate) => apiClient.patch<Company>(`/company/companies/${id}`, data),
  deleteCompany: (id: number) => apiClient.delete<null>(`/company/companies/${id}`),
};

// ─── Bank service ─────────────────────────────────────────────────────────────

export const bankService = {
  getBanks: () => apiClient.get<Bank[]>("/bank_statement/banks"),
  getBank: (id: number) => apiClient.get<Bank>(`/bank_statement/banks/${id}`),
  createBank: (data: BankCreate) => apiClient.post<Bank>("/bank_statement/banks", data),
  updateBank: (id: number, data: BankUpdate) => apiClient.patch<Bank>(`/bank_statement/banks/${id}`, data),
  deleteBank: (id: number) => apiClient.delete<null>(`/bank_statement/banks/${id}`),
};

// ─── Bank account service ─────────────────────────────────────────────────────

export const bankAccountService = {
  getBankAccounts: (companyId?: number | null) => {
    const url = companyId ? `/bank_statement/bank-accounts?company_id=${companyId}` : "/bank_statement/bank-accounts";
    return apiClient.get<BankAccount[]>(url);
  },
  getBankAccount: (id: number) => apiClient.get<BankAccount>(`/bank_statement/bank-accounts/${id}`),
  createBankAccount: (data: BankAccountCreate) => apiClient.post<BankAccount>("/bank_statement/bank-accounts", data),
  updateBankAccount: (id: number, data: BankAccountUpdate) => apiClient.patch<BankAccount>(`/bank_statement/bank-accounts/${id}`, data),
  deleteBankAccount: (id: number) => apiClient.delete<null>(`/bank_statement/bank-accounts/${id}`),
};

// ─── Statement service ────────────────────────────────────────────────────────

export const statementService = {
  getStatements: (accountId?: number | null) => {
    const url = accountId ? `/bank_statement/statements?account_id=${accountId}` : "/bank_statement/statements";
    return apiClient.get<BankStatement[]>(url);
  },
  getStatement: (id: number) => apiClient.get<BankStatement>(`/bank_statement/statements/${id}`),
  createStatement: (data: StatementCreate) => apiClient.post<BankStatement>("/bank_statement/statements", data),
  updateStatement: (id: number, data: StatementUpdate) => apiClient.patch<BankStatement>(`/bank_statement/statements/${id}`, data),
  deleteStatement: (id: number) => apiClient.delete<null>(`/bank_statement/statements/${id}`),
  
  getStatementsByQuarter: (year: number, quarter: number, accountId?: number | null) => {
    let url = `/bank_statement/statements/by-quarter?year=${year}&quarter=${quarter}`;
    if (accountId) url += `&account_id=${accountId}`;
    return apiClient.get<BankStatement[]>(url);
  },
  
  getQuarterlySummary: (year: number, companyId?: number | null, accountId?: number | null) => {
    let url = `/bank_statement/statements/quarterly?year=${year}`;
    if (companyId) url += `&company_id=${companyId}`;
    if (accountId) url += `&account_id=${accountId}`;
    return apiClient.get<QuarterlySummary[]>(url);
  },

  getSummary: (period: SummaryPeriod, year: number, companyId?: number | null, accountId?: number | null) => {
    let url = `/bank_statement/statements/summary?year=${year}&period=${period}`;
    if (companyId) url += `&company_id=${companyId}`;
    if (accountId) url += `&account_id=${accountId}`;
    return apiClient.get<Summary[]>(url);
  },

  uploadStatement: (accountId: number, bankType: string, file: File, tesseractCmd?: string | null) => {
    const form = new FormData();
    form.append("file", file);
    let url = `/bank_statement/statements/upload?account_id=${accountId}&bank_type=${bankType}`;
    if (tesseractCmd) url += `&tesseract_cmd=${encodeURIComponent(tesseractCmd)}`;
    return apiClient.post<BankStatement[]>(url, form);
  },

  previewStatement: (accountId: number, bankType: string, file: File, tesseractCmd?: string | null) => {
    const form = new FormData();
    form.append("file", file);
    let url = `/bank_statement/statements/preview?account_id=${accountId}&bank_type=${bankType}`;
    if (tesseractCmd) url += `&tesseract_cmd=${encodeURIComponent(tesseractCmd)}`;
    return apiClient.post<StatementPreview[]>(url, form);
  },

  commitStatement: (previews: StatementPreview[]) => apiClient.post<BankStatement[]>("/bank_statement/statements/commit", previews),
};

// ─── Check transaction service ────────────────────────────────────────────────

export const checkService = {
  getChecks: (statementId: number, section?: string | null) => {
    const url = section 
      ? `/bank_statement/statements/${statementId}/checks?section=${section}` 
      : `/bank_statement/statements/${statementId}/checks`;
    return apiClient.get<CheckTransaction[]>(url);
  },
  getCheck: (id: number) => apiClient.get<CheckTransaction>(`/bank_statement/checks/${id}`),
  createCheck: (data: CheckCreate) => apiClient.post<CheckTransaction>("/bank_statement/checks", data),
  updateCheck: (id: number, data: CheckUpdate) => apiClient.patch<CheckTransaction>(`/bank_statement/checks/${id}`, data),
  deleteCheck: (id: number) => apiClient.delete<null>(`/bank_statement/checks/${id}`),
};

// ─── Deposit transaction service ──────────────────────────────────────────────

export const depositService = {
  getDeposits: (statementId: number, section?: string | null) => {
    const url = section 
      ? `/bank_statement/statements/${statementId}/deposits?section=${section}` 
      : `/bank_statement/statements/${statementId}/deposits`;
    return apiClient.get<DepositTransaction[]>(url);
  },
  getDeposit: (id: number) => apiClient.get<DepositTransaction>(`/bank_statement/deposits/${id}`),
  createDeposit: (data: DepositCreate) => apiClient.post<DepositTransaction>("/bank_statement/deposits", data),
  updateDeposit: (id: number, data: DepositUpdate) => apiClient.patch<DepositTransaction>(`/bank_statement/deposits/${id}`, data),
  deleteDeposit: (id: number) => apiClient.delete<null>(`/bank_statement/deposits/${id}`),
};
