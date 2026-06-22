// src/services/glService.ts

export type CompanyBook = {
  book_id: number;
  company_id: number;
  company_name: string;
  book_name: string;
  format_id: number;
  format_code: string;
  format_name: string;
};

export type CompanyBooksResponse = {
  books: CompanyBook[];
};

export type ParseSummary = {
  company_id: number;
  company_book_id: number;
  company_name: string;
  source_file_id: number;
  accounts_resolved: number;
  gl_entries: number;
  gl_entry_lines: number;
  bank_lines: number;
};

export type ParseImportResponse = {
  summary: ParseSummary;
};

export type ImportPreviewRow = {
  gl_id: number;
  date: string | null;
  transaction_number: string | null;
  account_number: string | null;
  account_name: string | null;
  type: string | null;
  name: string | null;
  memo: string | null;
  debit: number;
  credit: number;
};

export type ImportReconciliationCheck = {
  check: string;
  source: number;
  export: number;
  difference: number;
  status: "match" | "mismatch" | "unavailable";
};

export type ImportReviewReconciliation = {
  source_label: string;
  export_label: string;
  is_balanced: boolean;
  checks: ImportReconciliationCheck[];
  summary: {
    record_count: number;
    total_debit: number;
    total_credit: number;
    unique_gl_ids: number;
    debit_credit_difference: number;
  };
  explanation: string;
};

export type ImportPreviewAccountTransaction = {
  entry_id: number;
  entry_date: string | null;
  transaction_type: string | null;
  transaction_number: string | null;
  name: string | null;
  memo: string | null;
  split_account_number: string | null;
  split_account_name: string | null;
  amount: number;
  debit: number;
  credit: number;
  balance_after: number | null;
  is_bank_line: boolean;
};

export type ImportPreviewAccount = {
  account_key: string;
  account_number: string | null;
  account_name: string;
  account_type: string | null;
  line_count: number;
  unique_gl_ids: number;
  bank_lines: number;
  first_date: string | null;
  last_date: string | null;
  debits: number;
  credits: number;
  net_amount: number;
  beginning_balance: number | null;
  transactions: ImportPreviewAccountTransaction[];
};

export type ImportPreview = {
  source_file_id: number;
  totals: {
    debits: number;
    credits: number;
    line_count: number;
    unique_gl_ids: number;
  };
  reconciliation?: ImportReviewReconciliation;
  accounts: ImportPreviewAccount[];
  rows: ImportPreviewRow[];
};

export type ManualGlEntryRequest = {
  company_id: number;
  ledger_account_code: string;
  ledger_account_name?: string | null;
  ledger_account_type?: string | null;
  split_account_code?: string | null;
  split_account_name?: string | null;
  split_account_type?: string | null;
  transaction_date?: string | null;
  transaction_type?: string | null;
  transaction_number?: string | null;
  name?: string | null;
  memo?: string | null;
  amount?: number | null;
  debit?: number | null;
  credit?: number | null;
  balance?: number | null;
};

export type ManualGlEntryResponse = {
  status: "added";
  manual_entry: {
    source_file_id: number;
    company_id: number;
    entry_id: number;
    line_id: number;
    amount: number;
    is_bank_line: boolean;
  };
  preview: ImportPreview;
};

export type CompanyGLCard = {
  company_id: number;
  company_name: string;
  entity: string | null;
  default_format_id: number | null;
  default_format_name: string | null;
  period_label: string;
  import_count: number;
  last_import_filename: string | null;
  last_imported_at: string | null;
  gl_entries: number;
  gl_entry_lines: number;
  bank_lines: number;
  total_amount: number;
};

export type GLVisualTransaction = {
  entry_id: number;
  entry_date: string | null;
  transaction_type: string | null;
  transaction_number: string | null;
  name: string | null;
  memo: string | null;
  split_account_number: string | null;
  split_account_name: string | null;
  amount: number;
  balance_after: number | null;
  is_bank_line: boolean;
};

export type GLAccountGroup = {
  account_number: string;
  account_name: string;
  account_type: string | null;
  is_bank_account: boolean;
  total_amount: number;
  beginning_balance: number | null;
  transactions: GLVisualTransaction[];
};

export type GLImportVisual = {
  id: number;
  filename: string;
  format_name: string;
  imported_at: string;
  gl_entries: number;
  gl_entry_lines: number;
  bank_lines: number;
  accounts: GLAccountGroup[];
};

export type CompanyLedger = {
  company_id: number;
  company_name: string;
  entity: string | null;
  period_label: string;
  imports: GLImportVisual[];
};

export type TrialBalanceRow = {
  account_number: string;
  account_name: string;
  account_type: string | null;
  debit: number;
  credit: number;
};

export type TrialBalance = {
  company_id: number;
  company_name: string;
  period_label: string;
  rows: TrialBalanceRow[];
  totals: {
    debit: number;
    credit: number;
  };
};

export type ReconcilingItem = {
  date: string | null;
  description: string;
  amount: number;
  kind?: string;
};

export type ConsolidatedCompany = {
  company_id: number;
  company_name: string;
  entity: string | null;
  book_balance: number;
  bank_balance: number;
  difference: number;
  in_bank_not_in_books: ReconcilingItem[];
  in_books_not_in_bank: ReconcilingItem[];
};

export type ConsolidatedReconciliation = {
  period_label: string;
  year: number;
  quarter: number;
  companies: ConsolidatedCompany[];
};

export type ConsolidatedMatrixAccount = {
  account_number: string;
  account_name: string;
  balances: Record<string, number>;
};

export type ConsolidatedMatrixTab = {
  name: string;
  columns: string[];
  accounts: ConsolidatedMatrixAccount[];
};

export type ConsolidatedMatrixResponse = {
  tabs: ConsolidatedMatrixTab[];
};

import { apiClient } from "./apiClient";

export const GLService = {
  async getBooks(): Promise<CompanyBook[]> {
    const data = await apiClient.get<CompanyBooksResponse | CompanyBook[]>("/accounting/gl/books");
    return Array.isArray(data) ? data : data.books;
  },

  async parseImport(params: {
    companyBookId: number;
    file: File;
  }): Promise<ParseImportResponse> {
    const formData = new FormData();
    formData.append("company_book_id", String(params.companyBookId));
    formData.append("file", params.file);

    return apiClient.post<ParseImportResponse>("/accounting/gl/imports/parse", formData);
  },

  async saveImport(params: {
    companyId: number;
    sourceFileId: number;
  }): Promise<void> {
    await apiClient.post<void>("/accounting/gl/imports/save", {
      company_id: params.companyId,
      source_file_id: params.sourceFileId,
    });
  },

  async deleteImport(params: {
    companyId: number;
    sourceFileId: number;
  }): Promise<void> {
    await apiClient.delete<void>(
      `/accounting/gl/imports/${params.sourceFileId}?company_id=${params.companyId}`
    );
  },

  async getImportPreview(params: {
    sourceFileId: number;
    companyId: number;
    limit?: number;
  }): Promise<ImportPreview> {
    const limit = params.limit ?? 100;
    return apiClient.get<ImportPreview>(
      `/accounting/gl/imports/${params.sourceFileId}/preview?company_id=${params.companyId}&limit=${limit}`
    );
  },

  async addManualEntry(params: {
    sourceFileId: number;
    entry: ManualGlEntryRequest;
    previewLimit?: number;
  }): Promise<ManualGlEntryResponse> {
    const previewLimit = params.previewLimit ?? 100;
    return apiClient.post<ManualGlEntryResponse>(
      `/accounting/gl/imports/${params.sourceFileId}/manual-entry?preview_limit=${previewLimit}`,
      params.entry
    );
  },

  async getCompanyCards(params: {
    period: string;
    year: number;
  }): Promise<CompanyGLCard[]> {
    return apiClient.get<CompanyGLCard[]>(
      `/accounting/gl/company-cards?period=${params.period}&year=${params.year}`
    );
  },

  async getCompanyLedger(params: {
    companyId: number;
    period: string;
    year: number;
  }): Promise<CompanyLedger> {
    return apiClient.get<CompanyLedger>(
      `/accounting/gl/company/${params.companyId}?period=${params.period}&year=${params.year}`
    );
  },

  async getTrialBalance(params: {
    companyId: number;
    period: string;
    year: number;
  }): Promise<TrialBalance> {
    return apiClient.get<TrialBalance>(
      `/accounting/gl/company/${params.companyId}/trial-balance?period=${params.period}&year=${params.year}`
    );
  },

  async getConsolidated(params: {
    year: number;
    quarter: number;
  }): Promise<ConsolidatedReconciliation> {
    return apiClient.get<ConsolidatedReconciliation>(
      `/accounting/gl/consolidated?year=${params.year}&quarter=${params.quarter}`
    );
  },

  async getConsolidatedTrialBalanceMatrix(period: string = "annual", year: number = 2026): Promise<ConsolidatedMatrixResponse> {
    return apiClient.get<ConsolidatedMatrixResponse>(
      `/reports/consolidated-trial-balance-matrix?period=${period}&year=${year}`
    );
  },
};
