// src/services/glService.ts

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
  date: string | null;
  account_number: string | null;
  account_name: string | null;
  type: string | null;
  name: string | null;
  memo: string | null;
  debit: number;
  credit: number;
};

export type ImportPreview = {
  source_file_id: number;
  totals: {
    debits: number;
    credits: number;
    line_count: number;
  };
  rows: ImportPreviewRow[];
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

async function handleError(response: Response, fallbackMessage: string): Promise<never> {
  const text = await response.text();

  try {
    const errorData = JSON.parse(text);
    throw new Error(
      errorData.detail || `Error ${response.status}: ${fallbackMessage}`
    );
  } catch {
    throw new Error(`Error ${response.status}: ${fallbackMessage}`);
  }
}

export const GLService = {
  async getBooks(): Promise<CompanyBook[]> {
    const response = await fetch(`${API_BASE_URL}/accounting/gl/books`);

    if (!response.ok) {
      await handleError(response, "Failed to fetch company books");
    }

    const data: CompanyBooksResponse | CompanyBook[] = await response.json();

    return Array.isArray(data) ? data : data.books;
  },

  async parseImport(params: {
    companyBookId: number;
    file: File;
  }): Promise<ParseImportResponse> {
    const formData = new FormData();
    formData.append("company_book_id", String(params.companyBookId));
    formData.append("file", params.file);

    const response = await fetch(`${API_BASE_URL}/accounting/gl/imports/parse`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      await handleError(response, "Failed to parse GL file");
    }

    return response.json();
  },

  async saveImport(params: {
    companyId: number;
    sourceFileId: number;
  }): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/accounting/gl/imports/save`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        company_id: params.companyId,
        source_file_id: params.sourceFileId,
      }),
    });

    if (!response.ok) {
      await handleError(response, "Failed to save import");
    }
  },

  async deleteImport(params: {
    companyId: number;
    sourceFileId: number;
  }): Promise<void> {
    const response = await fetch(
      `${API_BASE_URL}/accounting/gl/imports/${params.sourceFileId}?company_id=${params.companyId}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      await handleError(response, "Failed to discard import");
    }
  },

  async getImportPreview(params: {
    sourceFileId: number;
    companyId: number;
    limit?: number;
  }): Promise<ImportPreview> {
    const limit = params.limit ?? 100;
    const response = await fetch(
      `${API_BASE_URL}/accounting/gl/imports/${params.sourceFileId}/preview?company_id=${params.companyId}&limit=${limit}`
    );

    if (!response.ok) {
      await handleError(response, "Failed to load import preview");
    }

    return response.json();
  },

  async getCompanyCards(params: {
    period: string;
    year: number;
  }): Promise<CompanyGLCard[]> {
    const response = await fetch(
      `${API_BASE_URL}/accounting/gl/company-cards?period=${params.period}&year=${params.year}`
    );

    if (!response.ok) {
      await handleError(response, "Failed to load company cards");
    }

    return response.json();
  },

  async getCompanyLedger(params: {
    companyId: number;
    period: string;
    year: number;
  }): Promise<CompanyLedger> {
    const response = await fetch(
      `${API_BASE_URL}/accounting/gl/company/${params.companyId}?period=${params.period}&year=${params.year}`
    );

    if (!response.ok) {
      await handleError(response, "Failed to load company ledger");
    }

    return response.json();
  },

  async getTrialBalance(params: {
    companyId: number;
    period: string;
    year: number;
  }): Promise<TrialBalance> {
    const response = await fetch(
      `${API_BASE_URL}/accounting/gl/company/${params.companyId}/trial-balance?period=${params.period}&year=${params.year}`
    );

    if (!response.ok) {
      await handleError(response, "Failed to load trial balance");
    }

    return response.json();
  },

  async getConsolidated(params: {
    year: number;
    quarter: number;
  }): Promise<ConsolidatedReconciliation> {
    const response = await fetch(
      `${API_BASE_URL}/accounting/gl/consolidated?year=${params.year}&quarter=${params.quarter}`
    );

    if (!response.ok) {
      await handleError(response, "Failed to load consolidated reconciliation");
    }

    return response.json();
  },

  async getConsolidatedTrialBalanceMatrix(period: string = "annual", year: number = 2026): Promise<ConsolidatedMatrixResponse> {
    const response = await fetch(`${API_BASE_URL}/reports/consolidated-trial-balance-matrix?period=${period}&year=${year}`);

    if (!response.ok) {
      await handleError(response, "Failed to load consolidated trial balance matrix");
    }

    return response.json();
  },
};