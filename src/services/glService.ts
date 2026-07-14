// src/services/glService.ts

import { BASE_URL, apiClient } from "./apiClient";
import type {
  BackgroundGlParseResponse,
  CompanyBook,
  CompanyBooksResponse,
  CompanyGLCard,
  CompanyLedger,
  ConsolidatedMatrixResponse,
  ConsolidatedReconciliation,
  ApplySuggestedTargetRequest,
  ApplySuggestedTargetResponse,
  ApplySuggestedTargetsResponse,
  UnapplySuggestedTargetRequest,
  UnapplySuggestedTargetResponse,
  GLAccountSuggestionsRequest,
  GLAccountSuggestionsBackgroundResponse,
  GLAccountSuggestionsJobResponse,
  GLAccountSuggestionsHistoryResponse,
  GLAccountSuggestionsResponse,
  GLParseImportRequest,
  GLUploadQueueCancelResponse,
  GLUploadQueueDeleteResponse,
  GLUploadQueueResponse,
  GLXgboostTestTrainingRequest,
  GLXgboostTestTrainingResponse,
  GLExtractionFormat,
  GLFormatsResponse,
  ImportPreview,
  MissingInBooksExportDownload,
  MissingInBooksExportRow,
  ManualGlEntryRequest,
  ManualGlEntryResponse,
  ParseImportResponse,
  SaveImportFromUploadResponse,
  TrialBalance,
} from "@/types/gl";

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
};

export const GLService = {
  async getFormats(): Promise<GLExtractionFormat[]> {
    const data = await apiClient.get<GLFormatsResponse | GLExtractionFormat[]>("/accounting/gl/formats");
    return Array.isArray(data) ? data : data.formats;
  },

  async getBooks(): Promise<CompanyBook[]> {
    const data = await apiClient.get<CompanyBooksResponse | CompanyBook[]>("/accounting/gl/books");
    return Array.isArray(data) ? data : data.books;
  },

  async assignCompanyBook(params: {
    companyId: number;
    formatId: number;
  }): Promise<CompanyBook> {
    return apiClient.post<CompanyBook>(
      `/accounting/gl/company/${params.companyId}/book`,
      { format_id: params.formatId }
    );
  },

  async parseImport(params: GLParseImportRequest): Promise<ParseImportResponse> {
    const formData = new FormData();
    formData.append("company_book_id", String(params.companyBookId));
    formData.append("dry_run", String(params.dryRun ?? true));
    if (params.previewLimit !== undefined && params.previewLimit !== null) {
      formData.append("preview_limit", String(params.previewLimit));
    }
    formData.append("file", params.file);

    const endpoint = "/accounting/gl/imports/parse";
    console.log("[GL Preview] fetch", {
      url: `${BASE_URL}${endpoint}`,
      method: "POST",
      companyBookId: params.companyBookId,
      dryRun: params.dryRun ?? true,
      previewLimit: params.previewLimit ?? null,
      fileName: params.file.name,
      fileSize: params.file.size,
    });

    try {
      const response = await apiClient.post<ParseImportResponse>(endpoint, formData);
      console.log("[GL Preview] response", {
        status: response.summary?.status ?? null,
        sourceFileId: response.summary?.source_file_id ?? null,
        companyId: response.summary?.company_id ?? null,
        dryRun: response.dry_run,
        previewRows: response.preview?.rows?.length ?? null,
        previewLineCount: response.preview?.totals?.line_count ?? null,
        previewToken: response.dry_run_preview_token ?? response.preview?.pagination?.preview_token ?? null,
      });
      return response;
    } catch (error) {
      console.log("[GL Preview] fetch failed", { url: `${BASE_URL}${endpoint}`, error });
      throw error;
    }
  },
  async parseImportInBackground(params: GLParseImportRequest): Promise<BackgroundGlParseResponse> {
    const formData = new FormData();
    formData.append("company_book_id", String(params.companyBookId));
    if (params.previewLimit !== undefined && params.previewLimit !== null) {
      formData.append("preview_limit", String(params.previewLimit));
    }
    formData.append("file", params.file);

    const endpoint = "/accounting/gl/imports/parse-background";
    console.log("[GL Preview] background fetch", {
      url: `${BASE_URL}${endpoint}`,
      method: "POST",
      companyBookId: params.companyBookId,
      previewLimit: params.previewLimit ?? null,
      fileName: params.file.name,
      fileSize: params.file.size,
    });

    try {
      const response = await apiClient.post<BackgroundGlParseResponse>(endpoint, formData);
      console.log("[GL Preview] background response", {
        backgroundJobId: response.backgroundJobId ?? response.jobId,
        status: response.status,
        message: response.message,
      });
      return response;
    } catch (error) {
      console.log("[GL Preview] background fetch failed", { url: `${BASE_URL}${endpoint}`, error });
      throw error;
    }
  },
  async parseImportAsync(params: {
    companyBookId: number;
    file: File;
  }): Promise<{ backgroundJobId: string }> {
    const response = await GLService.parseImportInBackground({
      companyBookId: params.companyBookId,
      file: params.file,
      dryRun: true,
    });
    return {
      backgroundJobId: response.backgroundJobId || response.jobId || "",
    };
  },

  async getUploadQueue(limit = 20): Promise<GLUploadQueueResponse> {
    return apiClient.get<GLUploadQueueResponse>(
      `/accounting/gl/imports/queue?limit=${encodeURIComponent(String(limit))}`
    );
  },

  async cancelUploadQueueJob(jobId: number): Promise<GLUploadQueueCancelResponse> {
    return apiClient.post<GLUploadQueueCancelResponse>(
      `/accounting/gl/imports/queue/${jobId}/cancel`,
      {}
    );
  },

  async deleteUploadQueueJob(jobId: number): Promise<GLUploadQueueDeleteResponse> {
    return apiClient.delete<GLUploadQueueDeleteResponse>(
      `/accounting/gl/imports/queue/${jobId}`
    );
  },

  async getDryRunPreviewPage(params: {
    previewToken: string;
    page: number;
    pageSize?: number;
  }): Promise<ParseImportResponse> {
    const searchParams = new URLSearchParams({
      page: String(params.page),
      page_size: String(params.pageSize ?? 1000),
    });
    const endpoint = `/accounting/gl/imports/dry-run-preview/${params.previewToken}?${searchParams.toString()}`;
    console.log("[GL Preview] page fetch", {
      url: `${BASE_URL}${endpoint}`,
      method: "GET",
      previewToken: params.previewToken,
      page: params.page,
      pageSize: params.pageSize ?? 1000,
    });

    try {
      const response = await apiClient.get<ParseImportResponse>(endpoint);
      console.log("[GL Preview] page response", {
        status: response.summary?.status ?? null,
        previewRows: response.preview?.rows?.length ?? null,
        page: response.preview?.pagination?.page ?? null,
        pageCount: response.preview?.pagination?.page_count ?? null,
      });
      return response;
    } catch (error) {
      console.log("[GL Preview] page fetch failed", { url: `${BASE_URL}${endpoint}`, error });
      throw error;
    }
  },
  async deleteDryRunPreview(params: { previewToken: string }): Promise<void> {
    await apiClient.delete<void>(
      `/accounting/gl/imports/dry-run-preview/${params.previewToken}`
    );
  },

  async saveDryRunPreview(params: { previewToken: string; suggestions?: ApplySuggestedTargetRequest[] }): Promise<SaveImportFromUploadResponse> {
    const endpoint = `/accounting/gl/imports/dry-run-preview/${params.previewToken}/save`;
    console.log("[GL Preview] save fetch", {
      url: `${BASE_URL}${endpoint}`,
      method: "POST",
      previewToken: params.previewToken,
    });

    try {
      const response = await apiClient.post<SaveImportFromUploadResponse>(endpoint, {
        suggestions: params.suggestions ?? [],
      });
      console.log("[GL Preview] save response", {
        sourceFileId: response.summary?.source_file_id ?? null,
        companyId: response.summary?.company_id ?? null,
        status: response.status,
      });
      return response;
    } catch (error) {
      console.log("[GL Preview] save fetch failed", { url: `${BASE_URL}${endpoint}`, error });
      throw error;
    }
  },
  async getAccountSuggestions(params: GLAccountSuggestionsRequest): Promise<GLAccountSuggestionsResponse> {
    const formData = new FormData();
    const hasPreviewToken = Boolean(params.previewToken);
    if (!hasPreviewToken) {
      if (!params.file) {
        throw new Error("Account review requires an uploaded file or dry-run preview token.");
      }
      formData.append("file", params.file);
    }
    if (params.companyId !== undefined && params.companyId !== null) {
      formData.append("company_id", String(params.companyId));
    }
    if (params.companyName) {
      formData.append("company_name", params.companyName);
    }
    if (params.formatCode) {
      formData.append("format_code", params.formatCode);
    }
    formData.append("include_all", String(params.includeAll ?? false));
    formData.append("use_xgboost", String(params.useXgboost ?? true));
    formData.append(
      "xgboost_min_confidence",
      String(params.xgboostMinConfidence ?? 0.8)
    );
    const useAi = params.useAi === true;
    formData.append("use_ai", String(useAi));
    if (useAi) {
      const aiRowsPerRequest = params.aiRowsPerRequest ?? 100;
      formData.append("ai_provider", params.aiProvider ?? "ai");
      formData.append("ai_rows_per_request", String(aiRowsPerRequest));
      formData.append("ai_concurrency_limit", String(params.aiConcurrencyLimit ?? 5));
      formData.append("ai_use_google_search", String(params.aiUseGoogleSearch ?? true));
      formData.append("ai_review_all", String(params.aiReviewAll ?? true));
      if (params.aiRetryRowNumbers?.length) {
        formData.append(
          "ai_retry_row_numbers_json",
          JSON.stringify(params.aiRetryRowNumbers),
        );
      }
      if (params.aiMaxRows !== undefined && params.aiMaxRows !== null) {
        formData.append("ai_max_rows", String(params.aiMaxRows));
      }
      formData.append("ai_enable_escalation", String(params.aiEnableEscalation ?? true));
      formData.append(
        "ai_escalation_confidence",
        String(params.aiEscalationConfidence ?? 0.85)
      );
      formData.append("apply_ai_suggestions", String(params.applyAiSuggestions ?? true));
      if (params.aiModel) {
        formData.append("ai_model", params.aiModel);
      }
      if (params.aiEscalationModel) {
        formData.append("ai_escalation_model", params.aiEscalationModel);
      }
    } else {
      formData.append("ai_review_all", "false");
      formData.append("ai_enable_escalation", "false");
      formData.append("apply_ai_suggestions", "false");
    }

    const endpoint = hasPreviewToken
      ? `/accounting/gl/imports/dry-run-preview/${encodeURIComponent(
          String(params.previewToken)
        )}/account-suggestions`
      : "/accounting/gl/exports/account-suggestions";
    console.log("[GL Account Suggestions] fetch", {
      url: `${BASE_URL}${endpoint}`,
      method: "POST",
      fileName: params.file?.name ?? null,
      fileSize: params.file?.size ?? null,
      previewToken: params.previewToken ?? null,
      companyId: params.companyId ?? null,
      companyName: params.companyName ?? null,
      formatCode: params.formatCode,
      includeAll: params.includeAll ?? false,
      useXgboost: params.useXgboost ?? true,
      useAi,
      aiReviewAll: useAi ? params.aiReviewAll ?? true : false,
      aiRowsPerRequest: useAi ? params.aiRowsPerRequest ?? 100 : null,
      aiConcurrencyLimit: useAi ? params.aiConcurrencyLimit ?? 5 : null,
      aiMaxRows: useAi ? params.aiMaxRows ?? null : null,
      aiRetryRowCount: useAi ? params.aiRetryRowNumbers?.length ?? 0 : 0,
    });

    try {
      const response = await apiClient.post<GLAccountSuggestionsResponse>(endpoint, formData);
      console.log("[GL Account Suggestions] response", {
        suggestionCount: response.suggestion_count,
        changedSuggestionCount: response.changed_suggestion_count,
        manualReviewCount: response.manual_review_count,
        reviewMode: response.review_mode,
        aiStatus: response.ai_review?.status,
        aiModelAttemptCount: response.ai_review?.model_attempt_count,
        aiReviewedRows: response.ai_review?.reviewed_row_count,
        aiSuggestionCount: response.ai_review?.suggestion_count,
        aiFailedChunks: response.ai_review?.failed_chunk_count,
        aiTotalTokenCount: response.ai_review?.token_usage?.total_token_count,
        aiTokenUsage: response.ai_review?.token_usage,
        aiError: response.ai_review?.error,
      });
      return response;
    } catch (error) {
      console.log("[GL Account Suggestions] fetch failed", {
        url: `${BASE_URL}${endpoint}`,
        error,
      });
      throw error;
    }
  },

  async queueAccountSuggestions(
    params: GLAccountSuggestionsRequest
  ): Promise<GLAccountSuggestionsBackgroundResponse> {
    if (!params.previewToken) {
      throw new Error("Background account review requires a dry-run preview token.");
    }

    const formData = new FormData();
    if (params.companyId !== undefined && params.companyId !== null) {
      formData.append("company_id", String(params.companyId));
    }
    if (params.companyName) {
      formData.append("company_name", params.companyName);
    }
    if (params.formatCode) {
      formData.append("format_code", params.formatCode);
    }
    formData.append("include_all", String(params.includeAll ?? true));
    formData.append("use_xgboost", String(params.useXgboost ?? true));
    formData.append(
      "xgboost_min_confidence",
      String(params.xgboostMinConfidence ?? 0.8)
    );
    const useAi = params.useAi === true;
    formData.append("use_ai", String(useAi));
    if (useAi) {
      const aiRowsPerRequest = params.aiRowsPerRequest ?? 100;
      formData.append("ai_provider", params.aiProvider ?? "ai");
      formData.append("ai_rows_per_request", String(aiRowsPerRequest));
      formData.append("ai_concurrency_limit", String(params.aiConcurrencyLimit ?? 5));
      formData.append("ai_use_google_search", String(params.aiUseGoogleSearch ?? true));
      formData.append("ai_review_all", String(params.aiReviewAll ?? true));
      if (params.aiRetryRowNumbers?.length) {
        formData.append(
          "ai_retry_row_numbers_json",
          JSON.stringify(params.aiRetryRowNumbers),
        );
      }
      if (params.aiMaxRows !== undefined && params.aiMaxRows !== null) {
        formData.append("ai_max_rows", String(params.aiMaxRows));
      }
      formData.append("ai_enable_escalation", String(params.aiEnableEscalation ?? true));
      formData.append(
        "ai_escalation_confidence",
        String(params.aiEscalationConfidence ?? 0.85)
      );
      formData.append("apply_ai_suggestions", String(params.applyAiSuggestions ?? true));
      if (params.aiModel) {
        formData.append("ai_model", params.aiModel);
      }
      if (params.aiEscalationModel) {
        formData.append("ai_escalation_model", params.aiEscalationModel);
      }
    } else {
      formData.append("ai_review_all", "false");
      formData.append("ai_enable_escalation", "false");
      formData.append("apply_ai_suggestions", "false");
    }

    const endpoint = `/accounting/gl/imports/dry-run-preview/${encodeURIComponent(
      String(params.previewToken)
    )}/account-suggestions-background`;
    console.log("[GL Account Suggestions] queue", {
      url: `${BASE_URL}${endpoint}`,
      previewToken: params.previewToken,
      companyId: params.companyId ?? null,
      formatCode: params.formatCode,
      useAi,
      aiRetryRowCount: useAi ? params.aiRetryRowNumbers?.length ?? 0 : 0,
    });
    return apiClient.post<GLAccountSuggestionsBackgroundResponse>(endpoint, formData);
  },

  async getAccountSuggestionsJob(jobId: string | number): Promise<GLAccountSuggestionsJobResponse> {
    return apiClient.get<GLAccountSuggestionsJobResponse>(
      `/accounting/gl/imports/account-suggestions/jobs/${encodeURIComponent(String(jobId))}`
    );
  },
  async getAccountSuggestionsHistory(
    previewToken: string
  ): Promise<GLAccountSuggestionsHistoryResponse> {
    return apiClient.get<GLAccountSuggestionsHistoryResponse>(
      `/accounting/gl/imports/dry-run-preview/${encodeURIComponent(previewToken)}/account-suggestions-history`
    );
  },

  async trainXgboostTestModelFromGlExport(
    params: GLXgboostTestTrainingRequest
  ): Promise<GLXgboostTestTrainingResponse> {
    const formData = new FormData();
    formData.append("file", params.file);
    formData.append("format_code", params.formatCode);
    if (params.companyName) {
      formData.append("company_name", params.companyName);
    }
    formData.append("target_field", params.targetField ?? "split_account");
    formData.append("exclude_blank_targets", String(params.excludeBlankTargets ?? true));
    formData.append("exclude_transfers", String(params.excludeTransfers ?? true));
    formData.append("include_zero_amounts", String(params.includeZeroAmounts ?? false));
    formData.append("num_rounds", String(params.numRounds ?? 50));
    formData.append("run_in_background", "true");

    return apiClient.post<GLXgboostTestTrainingResponse>(
      "/classification/train-from-gl-export",
      formData
    );
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

  async saveImportFromUpload(params: {
    companyBookId: number;
    file: File;
    suggestions?: ApplySuggestedTargetRequest[];
  }): Promise<SaveImportFromUploadResponse> {
    const formData = new FormData();
    formData.append("company_book_id", String(params.companyBookId));
    if (params.suggestions?.length) {
      formData.append("suggestions_json", JSON.stringify(params.suggestions));
    }
    formData.append("file", params.file);

    return apiClient.post<SaveImportFromUploadResponse>(
      "/accounting/gl/imports/save-from-upload",
      formData
    );
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
    const searchParams = new URLSearchParams({
      company_id: String(params.companyId),
    });
    if (params.limit !== undefined) {
      searchParams.set("limit", String(params.limit));
    }
    return apiClient.get<ImportPreview>(
      `/accounting/gl/imports/${params.sourceFileId}/preview?${searchParams.toString()}`
    );
  },

  async getImportSummary(params: {
    sourceFileId: number;
    companyId: number;
  }): Promise<ParseSummary> {
    const preview = await GLService.getImportPreview({
      sourceFileId: params.sourceFileId,
      companyId: params.companyId,
      limit: 1,
    });
    const bankLines = preview.accounts.reduce(
      (total, account) => total + Number(account.bank_lines || 0),
      0
    );
    return {
      company_id: params.companyId,
      company_book_id: 0,
      company_name: "",
      source_file_id: params.sourceFileId,
      accounts_resolved: preview.accounts.length,
      gl_entries: preview.totals.unique_gl_ids,
      gl_entry_lines: preview.totals.line_count,
      bank_lines: bankLines,
      status: preview.dry_run ? "dry_run" : "pending",
      dry_run: Boolean(preview.dry_run),
    };
  },

  async addManualEntry(params: {
    sourceFileId: number;
    entry: ManualGlEntryRequest;
    previewLimit?: number;
  }): Promise<ManualGlEntryResponse> {
    const searchParams = new URLSearchParams();
    if (params.previewLimit !== undefined) {
      searchParams.set("preview_limit", String(params.previewLimit));
    }
    const query = searchParams.toString();
    return apiClient.post<ManualGlEntryResponse>(
      `/accounting/gl/imports/${params.sourceFileId}/manual-entry${query ? `?${query}` : ""}`,
      params.entry
    );
  },

  async applySuggestedTarget(params: {
    sourceFileId: number;
    change: ApplySuggestedTargetRequest;
    previewLimit?: number;
  }): Promise<ApplySuggestedTargetResponse> {
    const searchParams = new URLSearchParams();
    if (params.previewLimit !== undefined) {
      searchParams.set("preview_limit", String(params.previewLimit));
    }
    const query = searchParams.toString();
    return apiClient.post<ApplySuggestedTargetResponse>(
      `/accounting/gl/imports/${params.sourceFileId}/apply-suggested-target${query ? `?${query}` : ""}`,
      params.change
    );
  },

  async applySuggestedTargets(params: {
    sourceFileId: number;
    companyId: number;
    suggestions: ApplySuggestedTargetRequest[];
    previewLimit?: number;
  }): Promise<ApplySuggestedTargetsResponse> {
    const searchParams = new URLSearchParams();
    if (params.previewLimit !== undefined) {
      searchParams.set("preview_limit", String(params.previewLimit));
    }
    const query = searchParams.toString();
    return apiClient.post<ApplySuggestedTargetsResponse>(
      `/accounting/gl/imports/${params.sourceFileId}/apply-suggested-targets${query ? `?${query}` : ""}`,
      {
        company_id: params.companyId,
        suggestions: params.suggestions,
      }
    );
  },
  async unapplySuggestedTarget(params: {
    sourceFileId: number;
    change: UnapplySuggestedTargetRequest;
    previewLimit?: number;
  }): Promise<UnapplySuggestedTargetResponse> {
    const searchParams = new URLSearchParams();
    if (params.previewLimit !== undefined) {
      searchParams.set("preview_limit", String(params.previewLimit));
    }
    const query = searchParams.toString();
    return apiClient.post<UnapplySuggestedTargetResponse>(
      `/accounting/gl/imports/${params.sourceFileId}/unapply-suggested-target${query ? `?${query}` : ""}`,
      params.change
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

  missingInBooksExportUrl(params: {
    companyId: number;
    year: number;
    quarter: number;
  }): string {
    return `${BASE_URL}/accounting/gl/company/${params.companyId}/missing-in-books-export?year=${params.year}&quarter=${params.quarter}`;
  },

  async downloadMissingInBooksExport(params: {
    companyId: number;
    year: number;
    quarter: number;
    items: MissingInBooksExportRow[];
  }): Promise<MissingInBooksExportDownload> {
    const url = `${BASE_URL}/accounting/gl/company/${params.companyId}/missing-in-books-export?year=${params.year}&quarter=${params.quarter}`;
    const response = await fetch(
      url,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: params.items }),
      }
    );

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || "Failed to generate export");
    }

    return {
      blob: await response.blob(),
      filename: filenameFromContentDisposition(
        response.headers.get("Content-Disposition")
      ),
    };
  },
};

function filenameFromContentDisposition(value: string | null) {
  if (!value) return "missing_in_books_export.zip";

  const encoded = value.match(/filename\*=UTF-8''([^;]+)/i);
  if (encoded?.[1]) return decodeURIComponent(encoded[1]);

  const plain = value.match(/filename="([^"]+)"/i);
  return plain?.[1] || "missing_in_books_export.zip";
}
