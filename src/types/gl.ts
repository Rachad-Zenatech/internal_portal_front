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
  source_file_id: number | null;
  accounts_resolved: number;
  accounts_unresolved?: number;
  gl_entries: number;
  gl_entry_lines: number;
  bank_lines: number;
  status?: string;
  dry_run?: boolean;
  dry_run_preview_token?: string;
  dry_run_preview_expires_at?: string;
};

export type ParseImportResponse = {
  summary: ParseSummary;
  preview?: ImportPreview | null;
  dry_run?: boolean;
  dry_run_preview_token?: string;
};

export type BackgroundGlParseResponse = {
  status: "queued" | string;
  queued?: boolean;
  message: string;
  backgroundJobId?: string;
  jobId?: string;
  source_filename?: string;
  queued_upload_bytes?: number;
};

export type GLUploadQueueItem = {
  id: number;
  status: string;
  progress: number;
  filename?: string | null;
  company_book_id?: number | null;
  company_name?: string | null;
  gl_entry_lines?: number | null;
  preview_token?: string | null;
  preview_url?: string | null;
  error_message?: string | null;
  can_cancel?: boolean;
  cancel_url?: string | null;
  can_delete?: boolean;
  delete_url?: string | null;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  updated_at?: string | null;
};

export type GLUploadQueueResponse = {
  jobs: GLUploadQueueItem[];
};

export type GLUploadQueueCancelResponse = {
  id: number;
  status: string;
  canceled: boolean;
  message: string;
};

export type GLUploadQueueDeleteResponse = {
  id: number;
  status: string;
  deleted: boolean;
  message: string;
};

export type SaveImportFromUploadResponse = {
  status: "saved" | string;
  summary: ParseSummary & {
    applied_suggestions?: { applied_count: number; skipped_count: number; errors: string[] };
    xgboost_training?: { status: string; job_id?: number; training_rows?: number; class_count?: number; error?: string };
  };
};

export type GLAccountSuggestionsRequest = {
  file?: File | null;
  previewToken?: string | null;
  companyId?: number | null;
  companyName?: string | null;
  formatCode?: string | null;
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
  aiRetryRowNumbers?: number[] | null;
  aiMaxRows?: number | null;
  aiEnableEscalation?: boolean;
  aiEscalationModel?: string | null;
  aiEscalationConfidence?: number;
  applyAiSuggestions?: boolean;
};

export type GLAccountSuggestionsBackgroundResponse = {
  status: "queued" | string;
  queued?: boolean;
  jobId: string;
  backgroundJobId?: string;
  previewToken?: string | null;
  progress?: number;
};

export type GLAccountSuggestionsJobResponse = {
  id: number;
  status: string;
  progress: number;
  previewToken?: string | null;
  result?: GLAccountSuggestionsResponse | null;
  error?: { message?: string; trace?: string } | null;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  updated_at?: string | null;
};
export type GLAccountSuggestionsHistoryResponse = {
  preview_token: string;
  runs: Array<{
    job_id: string;
    retry_row_numbers: number[];
    result: GLAccountSuggestionsResponse;
    created_at?: string | null;
    completed_at?: string | null;
  }>;
  active_job?: {
    job_id: string;
    status: string;
    progress: number;
    retry_row_numbers: number[];
    created_at?: string | null;
  } | null;
};

export type GLXgboostTestTrainingRequest = {
  file: File;
  formatCode: string;
  companyName?: string | null;
  targetField?: "split_account" | "ledger_account" | "business_account" | "auto";
  excludeBlankTargets?: boolean;
  excludeTransfers?: boolean;
  includeZeroAmounts?: boolean;
  numRounds?: number;
};

export type GLParseImportRequest = {
  companyBookId: number;
  file: File;
  dryRun?: boolean;
  previewLimit?: number | null;
};

export type GLXgboostTestTrainingResponse = {
  status: "success" | "queued" | "error" | string;
  message: string;
  queued?: boolean;
  backgroundJobId?: string;
  jobId?: string;
  queued_upload_bytes?: number;
  source_filename?: string;
  format_code?: string;
  training?: {
    test_only: boolean;
    label_source: string;
    feature_text_source?: string;
    training_csv_path: string;
    target_field: string;
    training_rows: number;
    memo_rows?: number;
    description_rows?: number;
    current_account_rows?: number;
    class_count: number;
    top_accounts: Array<{ account: string; rows: number }>;
    skipped_blank_target_rows: number;
    skipped_transfer_rows: number;
    skipped_zero_amount_rows: number;
    skipped_untrainable_target_rows?: number;
    skipped_missing_transaction_text_rows?: number;
    cleanup_files: string[];
  };
  result?: {
    model_path: string;
    labels_path: string;
    metadata_path?: string;
    class_count: number;
    trained_rows: number;
    known_vendor_count?: number;
  };
  model_status?: {
    xgboost_installed?: boolean;
    model_loaded?: boolean;
    label_mapping_present?: boolean;
    metadata_present?: boolean;
    model_path?: string;
    labels_path?: string;
    metadata_path?: string;
  };
};

export type GLAccountReviewCompanyContext = {
  company_id: number | null;
  company_name: string;
  company_aliases?: string[];
  entity?: string | null;
  source?: string | null;
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

export type GLAccountReviewAiTokenUsage = {
  prompt_token_count: number;
  candidates_token_count: number;
  thoughts_token_count: number;
  tool_use_prompt_token_count: number;
  total_token_count: number;
};

export type GLAccountReviewAiChunk = {
  chunk_index?: number;
  start_row: number;
  end_row: number;
  row_numbers?: number[];
  transaction_count: number;
  status?: string;
  model_response_received?: boolean;
  token_usage?: GLAccountReviewAiTokenUsage;
  retried_without_search?: boolean;
  model_attempts?: number;
  response_id?: string | null;
  search_retry_reason?: string | null;
  suggestion_count: number;
  error: string | null;
};

export type GLAccountReviewAi = {
  provider: "ai" | string;
  enabled: boolean;
  available: boolean;
  running?: boolean;
  status?: string;
  google_search_enabled?: boolean;
  web_search_enabled?: boolean;
  model_attempt_count?: number;
  rows_per_request: number;
  requested_row_count?: number;
  requested_row_numbers?: number[];
  submitted_chunk_count?: number;
  completed_chunk_count?: number;
  failed_chunk_count?: number;
  token_usage?: GLAccountReviewAiTokenUsage;
  company_context?: GLAccountReviewCompanyContext | null;
  max_rows?: number | null;
  scope_note?: string | null;
  total_transaction_count?: number | null;
  reviewed_row_numbers?: number[];
  failed_row_numbers?: number[];
  retry_row_numbers?: number[];
  test_forced_manual_review_enabled?: boolean;
  test_forced_manual_review_row_number?: number | null;
  test_empty_current_target_suggestion_enabled?: boolean;
  test_empty_current_target_row_number?: number | null;
  test_empty_current_target_suggested_account_number?: string | null;
  test_empty_current_target_suggested_account_name?: string | null;
  test_empty_current_target_memo?: string | null;
  reviewed_row_count: number;
  suggestion_count: number;
  error: string | null;
  chunks: GLAccountReviewAiChunk[];
  suggestions: GLAccountReviewAiSuggestion[];
  escalation?: {
    provider: "ai" | string;
    status?: string;
    running?: boolean;
    reviewed_row_count: number;
    suggestion_count: number;
    submitted_chunk_count?: number;
    completed_chunk_count?: number;
    failed_chunk_count?: number;
    token_usage?: GLAccountReviewAiTokenUsage;
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
  review_source?: "xgboost" | "gemini" | "rules" | "manual" | string;
  review_status?: string;
  review_label?: string;
  is_xgboost_suggestion?: boolean;
  is_suggested_change?: boolean;
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
  company_context?: GLAccountReviewCompanyContext | null;
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
    metadata_present?: boolean;
    model_path?: string;
    labels_path?: string;
    metadata_path?: string;
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
  is_bank_line?: boolean;
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
  source_file_id: number | null;
  dry_run?: boolean;
  company_id?: number | null;
  totals: {
    debits: number;
    credits: number;
    line_count: number;
    unique_gl_ids: number;
  };
  account_review_summary?: ImportPreviewAccountReviewSummary;
  reconciliation?: ImportReviewReconciliation;
  pagination?: {
    preview_token?: string;
    page?: number;
    page_size?: number;
    page_count?: number;
    offset: number;
    limit: number;
    returned_rows: number;
    total_rows: number;
    has_previous: boolean;
    has_next: boolean;
    expires_at?: string;
  };
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

export type ApplySuggestedTargetRequest = {
  company_id: number;
  row_number: number;
  target_field: "ledger_account" | "split_account" | string;
  suggested_account_number: string;
};

export type ApplySuggestedTargetResponse = {
  status: "applied";
  applied_change: {
    source_file_id: number;
    company_id: number;
    row_number: number;
    entry_id: number;
    line_id: number;
    target_field: "ledger_account" | "split_account" | string;
    previous_account_number: string | null;
    previous_account_name: string | null;
    applied_account_number: string;
    applied_account_name: string | null;
  };
  preview: ImportPreview;
};

export type ApplySuggestedTargetsResponse = {
  status: "applied";
  applied_count: number;
  error_count: number;
  applied_changes: ApplySuggestedTargetResponse["applied_change"][];
  errors: Array<{ row_number?: number; error: string }>;
  preview: ImportPreview;
};
export type UnapplySuggestedTargetRequest = {
  company_id: number;
  row_number: number;
  target_field: "ledger_account" | "split_account" | string;
  previous_account_number?: string | null;
};

export type UnapplySuggestedTargetResponse = {
  status: "unapplied";
  unapplied_change: {
    source_file_id: number;
    company_id: number;
    row_number: number;
    entry_id: number;
    line_id: number;
    target_field: "ledger_account" | "split_account" | string;
    removed_account_number: string | null;
    removed_account_name: string | null;
    restored_account_number: string | null;
    restored_account_name: string | null;
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
