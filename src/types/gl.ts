export type CompanyBook = {
  book_id: number;
  company_id: number;
  company_name: string;
  book_name: string;
  format_id: number;
  format_code: string;
  format_name: string;
  is_default: boolean;
};

export type GLExtractionFormat = {
  id: number;
  code: string;
  name: string;
};

export type CompanyBooksResponse = {
  books: CompanyBook[];
};

export type GLFormatsResponse = {
  formats: GLExtractionFormat[];
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

export type GLAccountSuggestionsRequest = {
  file: File;
  formatCode: string;
  includeAll?: boolean;
  useXgboost?: boolean;
  xgboostMinConfidence?: number;
  useAi?: boolean;
  aiProvider?: "gemini" | string;
  aiModel?: string | null;
  aiRowsPerRequest?: number;
  aiConcurrencyLimit?: number;
  aiUseGoogleSearch?: boolean;
  aiReviewAll?: boolean;
  aiMaxRows?: number | null;
  aiEnableEscalation?: boolean;
  aiEscalationModel?: string | null;
  aiEscalationConfidence?: number;
  applyAiSuggestions?: boolean;
};

export type GLAccountReviewAiSuggestion = {
  row_number: number;
  target_field: string;
  current_account_number: string | null;
  suggested_account_number: string | null;
  suggested_account_name: string | null;
  confidence: number;
  reason: string;
  fits_when?: string | null;
  requires_manual_review: boolean;
};

export type GLAccountReviewAiChunk = {
  start_row: number;
  end_row: number;
  transaction_count: number;
  suggestion_count: number;
  error: string | null;
};

export type GLAccountReviewAi = {
  provider: "gemini" | string;
  model: string;
  enabled: boolean;
  available: boolean;
  google_search_enabled?: boolean;
  rows_per_request: number;
  max_rows?: number | null;
  scope_note?: string | null;
  total_transaction_count?: number | null;
  reviewed_row_numbers?: number[];
  reviewed_row_count: number;
  suggestion_count: number;
  error: string | null;
  chunks: GLAccountReviewAiChunk[];
  suggestions: GLAccountReviewAiSuggestion[];
  escalation?: {
    provider: "gemini" | string;
    model: string;
    reviewed_row_count: number;
    suggestion_count: number;
    error: string | null;
    chunks: GLAccountReviewAiChunk[];
  } | null;
};

export type GLAccountSuggestion = {
  row_number: number;
  date: string | null;
  transaction_type: string | null;
  transaction_number: string | null;
  name: string | null;
  memo: string | null;
  amount: number;
  ledger_account_number: string | null;
  ledger_account_name: string | null;
  current_split_account_number: string | null;
  current_split_account_name: string | null;
  target_field: "ledger_account" | "split_account" | string;
  current_target_account_number: string | null;
  current_target_account_name: string | null;
  suggested_target_account_number: string | null;
  suggested_target_account_name: string | null;
  suggested_split_account_number: string | null;
  suggested_split_account_name: string | null;
  suggested_account_number: string | null;
  suggested_account_name: string | null;
  confidence: number;
  reason: string;
  rule: string;
  requires_manual_review: boolean;
  xgboost_suggested_account_number: string | null;
  xgboost_suggested_account_name: string | null;
  xgboost_confidence: number | null;
  xgboost_model_loaded: boolean;
  xgboost_reason: string | null;
  ai_provider?: string | null;
  ai_model?: string | null;
  ai_target_field?: "ledger_account" | "split_account" | string | null;
  ai_suggested_account_number?: string | null;
  ai_suggested_account_name?: string | null;
  ai_confidence?: number | null;
  ai_reason?: string | null;
  ai_requires_manual_review?: boolean | null;
  ai_fits_when?: string | null;
  training_vendor: string | null;
  training_amount: number;
  training_description: string | null;
  approved_account: string | null;
};

export type GLAccountSuggestionsResponse = {
  filename: string;
  format_code: string;
  metadata?: Record<string, string | null>;
  transaction_count: number;
  suggestion_count: number;
  changed_suggestion_count: number;
  manual_review_count: number;
  review_mode: string;
  xgboost_min_confidence: number;
  xgboost_model_status: {
    xgboost_installed?: boolean;
    model_loaded?: boolean;
    label_mapping_present?: boolean;
    model_path?: string;
    labels_path?: string;
  };
  ai_review?: GLAccountReviewAi | null;
  suggestions: GLAccountSuggestion[];
};

export type ImportPreviewAccountReview = {
  status: string;
  source: string;
  categorized: boolean;
  target_field: "ledger_account" | "split_account" | string;
  current_target_account_number: string | null;
  current_target_account_name: string | null;
  suggested_account_number: string | null;
  suggested_account_name: string | null;
  suggested_payee: string | null;
  suggested_memo: string | null;
  confidence: number;
  requires_ai_review: boolean;
  requires_human_review: boolean;
  reason: string | null;
  matched_rule: Record<string, unknown> | null;
  applied_actions: Record<string, unknown>[];
  xgboost_candidate: Record<string, unknown> | null;
  ai_context: Record<string, unknown> | null;
  is_bank_transaction: boolean;
};

export type ImportPreviewAccountReviewSummary = {
  quickbooks_rule_count: number;
  xgboost_count: number;
  ai_review_count: number;
  human_review_count: number;
  bank_transaction_count: number;
  not_applicable_count: number;
};

export type ImportPreviewRow = {
  gl_id: number;
  line_id: number;
  date: string | null;
  transaction_number: string | null;
  account_number: string | null;
  account_name: string | null;
  type: string | null;
  name: string | null;
  memo: string | null;
  debit: number;
  credit: number;
  account_review?: ImportPreviewAccountReview | null;
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
  line_id: number;
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
  account_review?: ImportPreviewAccountReview | null;
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
  account_review_summary?: ImportPreviewAccountReviewSummary;
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

export type MissingInBooksExportRow = {
  date: string | null;
  description: string;
  amount: number;
  kind?: string | null;
};

export type MissingInBooksExportDownload = {
  blob: Blob;
  filename: string;
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
