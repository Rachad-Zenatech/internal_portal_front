// src/services/glService.ts

import { BASE_URL, apiClient } from "./apiClient";
import type {
  CompanyBook,
  CompanyBooksResponse,
  CompanyGLCard,
  CompanyLedger,
  ConsolidatedMatrixResponse,
  ConsolidatedReconciliation,
  ApplySuggestedTargetRequest,
  ApplySuggestedTargetResponse,
  UnapplySuggestedTargetRequest,
  UnapplySuggestedTargetResponse,
  GLAccountSuggestionsRequest,
  GLAccountSuggestionsResponse,
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
  TrialBalance,
} from "@/types/gl";

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

  async parseImport(params: {
    companyBookId: number;
    file: File;
  }): Promise<ParseImportResponse> {
    const formData = new FormData();
    formData.append("company_book_id", String(params.companyBookId));
    formData.append("file", params.file);

    return apiClient.post<ParseImportResponse>("/accounting/gl/imports/parse", formData);
  },

  async getAccountSuggestions(params: GLAccountSuggestionsRequest): Promise<GLAccountSuggestionsResponse> {
    const formData = new FormData();
    formData.append("file", params.file);
    if (params.companyId !== undefined && params.companyId !== null) {
      formData.append("company_id", String(params.companyId));
    }
    if (params.companyName) {
      formData.append("company_name", params.companyName);
    }
    formData.append("format_code", params.formatCode);
    formData.append("include_all", String(params.includeAll ?? false));
    formData.append("use_xgboost", String(params.useXgboost ?? true));
    formData.append(
      "xgboost_min_confidence",
      String(params.xgboostMinConfidence ?? 0.8)
    );
    const useAi = params.useAi === true;
    formData.append("use_ai", String(useAi));
    if (useAi) {
      formData.append("ai_provider", params.aiProvider ?? "gemini");
      formData.append("ai_rows_per_request", String(params.aiRowsPerRequest ?? 50));
      formData.append("ai_concurrency_limit", String(params.aiConcurrencyLimit ?? 3));
      formData.append("ai_use_google_search", String(params.aiUseGoogleSearch ?? true));
      formData.append("ai_review_all", String(params.aiReviewAll ?? true));
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

    return apiClient.post<GLAccountSuggestionsResponse>(
      "/accounting/gl/exports/account-suggestions",
      formData
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

  async applySuggestedTarget(params: {
    sourceFileId: number;
    change: ApplySuggestedTargetRequest;
    previewLimit?: number;
  }): Promise<ApplySuggestedTargetResponse> {
    const previewLimit = params.previewLimit ?? 100;
    return apiClient.post<ApplySuggestedTargetResponse>(
      `/accounting/gl/imports/${params.sourceFileId}/apply-suggested-target?preview_limit=${previewLimit}`,
      params.change
    );
  },

  async unapplySuggestedTarget(params: {
    sourceFileId: number;
    change: UnapplySuggestedTargetRequest;
    previewLimit?: number;
  }): Promise<UnapplySuggestedTargetResponse> {
    const previewLimit = params.previewLimit ?? 100;
    return apiClient.post<UnapplySuggestedTargetResponse>(
      `/accounting/gl/imports/${params.sourceFileId}/unapply-suggested-target?preview_limit=${previewLimit}`,
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
