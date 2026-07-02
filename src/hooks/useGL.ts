import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GLService } from '../services/glService';
import type {
  CompanyGLCard,
  ConsolidatedMatrixResponse,
  ApplySuggestedTargetRequest,
  ApplySuggestedTargetResponse,
  UnapplySuggestedTargetRequest,
  UnapplySuggestedTargetResponse,
  GLAccountSuggestionsRequest,
  GLAccountSuggestionsResponse,
  GLXgboostTestTrainingRequest,
  GLXgboostTestTrainingResponse,
  TrialBalance,
  GLExtractionFormat,
  CompanyBook,
  ParseImportResponse,
  SaveImportFromUploadResponse,
  ImportPreview,
  ManualGlEntryRequest,
  MissingInBooksExportRow,
  MissingInBooksExportDownload,
  CompanyLedger,
  ConsolidatedReconciliation,
} from '@/types/gl';

export const useConsolidatedMatrix = (period: string = "annual", year: number = 2026) => {
  return useQuery<ConsolidatedMatrixResponse, Error>({
    queryKey: ['consolidated-matrix', period, year],
    queryFn: () => GLService.getConsolidatedTrialBalanceMatrix(period, year),
  });
};

export const useCompanyCards = (period: string, year: number) => {
  return useQuery<CompanyGLCard[], Error>({
    queryKey: ['company-cards', period, year],
    queryFn: () => GLService.getCompanyCards({ period, year }),
  });
};

export const useTrialBalance = (companyId: number | null, period: string, year: number) => {
  return useQuery<TrialBalance, Error>({
    queryKey: ['trial-balance', companyId, period, year],
    queryFn: () => {
      if (companyId === null) throw new Error("Company ID is required");
      return GLService.getTrialBalance({ companyId, period, year });
    },
    enabled: companyId !== null,
  });
};

export const useCompanyLedger = (companyId: number | null, period: string, year: number) => {
  return useQuery<CompanyLedger, Error>({
    queryKey: ['company-ledger', companyId, period, year],
    queryFn: () => {
      if (companyId === null) throw new Error("Company ID is required");
      return GLService.getCompanyLedger({ companyId, period, year });
    },
    enabled: companyId !== null,
  });
};

export const useConsolidated = (year: number, quarter: number) => {
  return useQuery<ConsolidatedReconciliation, Error>({
    queryKey: ['consolidated', year, quarter],
    queryFn: () => GLService.getConsolidated({ year, quarter }),
  });
};

export const useBooks = () => {
  return useQuery<CompanyBook[], Error>({
    queryKey: ['books'],
    queryFn: () => GLService.getBooks(),
  });
};

export const useGLFormats = () => {
  return useQuery<GLExtractionFormat[], Error>({
    queryKey: ['gl-formats'],
    queryFn: () => GLService.getFormats(),
  });
};

export const useAssignFormat = () => {
  const queryClient = useQueryClient();
  return useMutation<CompanyBook, Error, { companyId: number; formatId: number }>({
    mutationFn: ({ companyId, formatId }) => GLService.assignCompanyBook({ companyId, formatId }),
    onSuccess: (assignedBook) => {
      queryClient.setQueriesData<CompanyGLCard[]>(
        { queryKey: ['company-cards'] },
        (cards) =>
          cards?.map((card) =>
            card.company_id === assignedBook.company_id
              ? {
                  ...card,
                  default_format_id: assignedBook.format_id,
                  default_format_name: assignedBook.format_name,
                }
              : card
          )
      );

      queryClient.setQueryData<CompanyBook[]>(['books'], (books) => {
        const updatedBook = { ...assignedBook, is_default: true };
        if (!books) return [updatedBook];

        let found = false;
        const nextBooks = books.map((book) => {
          if (book.book_id === assignedBook.book_id) {
            found = true;
            return updatedBook;
          }
          if (book.company_id === assignedBook.company_id) {
            return { ...book, is_default: false };
          }
          return book;
        });

        return found ? nextBooks : [...nextBooks, updatedBook];
      });

      queryClient.invalidateQueries({ queryKey: ['company-cards'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
    },
  });
};

export const useImportPreview = (sourceFileId: number | null, companyId: number | null) => {
  return useQuery<ImportPreview, Error>({
    queryKey: ['import-preview', sourceFileId, companyId],
    queryFn: () => {
      if (sourceFileId === null || companyId === null) throw new Error("Missing IDs");
      return GLService.getImportPreview({ sourceFileId, companyId });
    },
    enabled: sourceFileId !== null && companyId !== null,
  });
};

export const useParseImport = () => {
  return useMutation<ParseImportResponse, Error, { companyBookId: number; file: File; dryRun?: boolean }>({
    mutationFn: ({ companyBookId, file, dryRun }) => GLService.parseImport({ companyBookId, file, dryRun }),
  });
};

export const useGLAccountSuggestions = () => {
  return useMutation<
    GLAccountSuggestionsResponse,
    Error,
    GLAccountSuggestionsRequest
  >({
    mutationFn: (params) => GLService.getAccountSuggestions(params),
  });
};

export const useTrainXgboostTestModelFromGlExport = () => {
  return useMutation<
    GLXgboostTestTrainingResponse,
    Error,
    GLXgboostTestTrainingRequest
  >({
    mutationFn: (params) => GLService.trainXgboostTestModelFromGlExport(params),
  });
};

export const useSaveImport = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { companyId: number; sourceFileId: number }>({
    mutationFn: ({ companyId, sourceFileId }) => GLService.saveImport({ companyId, sourceFileId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-cards'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      queryClient.invalidateQueries({ queryKey: ['company-ledger'] });
    },
  });
};

export const useSaveImportFromUpload = () => {
  const queryClient = useQueryClient();
  return useMutation<
    SaveImportFromUploadResponse,
    Error,
    { companyBookId: number; file: File }
  >({
    mutationFn: ({ companyBookId, file }) =>
      GLService.saveImportFromUpload({ companyBookId, file }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-cards'] });
      queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
      queryClient.invalidateQueries({ queryKey: ['company-ledger'] });
    },
  });
};

export const useDeleteImport = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { companyId: number; sourceFileId: number }>({
    mutationFn: ({ companyId, sourceFileId }) => GLService.deleteImport({ companyId, sourceFileId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-cards'] });
      queryClient.invalidateQueries({ queryKey: ['import-preview'] });
    },
  });
};

export const useAddManualEntry = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { manual_entry: any; preview: ImportPreview },
    Error,
    { sourceFileId: number; entry: ManualGlEntryRequest }
  >({
    mutationFn: ({ sourceFileId, entry }) => GLService.addManualEntry({ sourceFileId, entry }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['import-preview', variables.sourceFileId] });
    },
  });
};

export const useApplySuggestedTarget = () => {
  const queryClient = useQueryClient();
  return useMutation<
    ApplySuggestedTargetResponse,
    Error,
    { sourceFileId: number; change: ApplySuggestedTargetRequest }
  >({
    mutationFn: ({ sourceFileId, change }) =>
      GLService.applySuggestedTarget({ sourceFileId, change }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['import-preview', variables.sourceFileId] });
    },
  });
};

export const useUnapplySuggestedTarget = () => {
  const queryClient = useQueryClient();
  return useMutation<
    UnapplySuggestedTargetResponse,
    Error,
    { sourceFileId: number; change: UnapplySuggestedTargetRequest }
  >({
    mutationFn: ({ sourceFileId, change }) =>
      GLService.unapplySuggestedTarget({ sourceFileId, change }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['import-preview', variables.sourceFileId] });
    },
  });
};

export const useDownloadMissingInBooksExport = () => {
  return useMutation<
    MissingInBooksExportDownload,
    Error,
    { companyId: number; year: number; quarter: number; items: MissingInBooksExportRow[] }
  >({
    mutationFn: ({ companyId, year, quarter, items }) =>
      GLService.downloadMissingInBooksExport({ companyId, year, quarter, items }),
  });
};
