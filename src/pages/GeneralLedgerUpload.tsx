// src/pages/GeneralLedgerUpload.tsx

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type {
  ApplySuggestedTargetResponse,
  GLAccountSuggestion,
  GLAccountSuggestionsResponse,
  GLUploadQueueItem,
  GLXgboostTestTrainingResponse,
  ImportPreview,
  ImportPreviewAccount,
  ImportPreviewAccountReview,
  ImportPreviewAccountTransaction,
  ManualGlEntryRequest,
} from "@/types/gl";
import {
  useBooks,
  useParseImport,
  useParseImportInBackground,
  useGLUploadQueue,
  useDryRunPreviewPage,
  useImportPreview,
  useGLAccountSuggestions,
  useTrainXgboostTestModelFromGlExport,
  useDeleteImport,
  useAddManualEntry,
  useApplySuggestedTarget,
  useUnapplySuggestedTarget,
  useSaveImport,
  useSaveImportFromUpload,
  useSaveDryRunPreview,
} from "@/hooks/useGL";
import { useGlobalProgress } from "@/lib/GlobalProgressContext";

import { Card, CardContent } from "@/components/ui/card";
import { useSearchParams } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Check, FileSpreadsheet, Move, RotateCcw, Sparkles, UploadCloud, X } from "lucide-react";

type ParseSummary = {
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

type ManualEntryForm = {
  ledger_account_code: string;
  ledger_account_name: string;
  split_account_code: string;
  split_account_name: string;
  transaction_date: string;
  transaction_type: string;
  transaction_number: string;
  name: string;
  memo: string;
  debit: string;
  credit: string;
};

type WorkbookPreviewRow = {
  account: ImportPreviewAccount;
  txn: ImportPreviewAccountTransaction;
  suggestion: GLAccountSuggestion | null;
};

type ReviewFinderKind = "quickbooks_rule" | "xgboost" | "ai";

type AccountReviewProgress = {
  current: number;
  total: number;
};

type AccountReviewLogContext = {
  filename: string;
  companyId: number;
  companyName: string;
  formatCode: string;
  sourceFileId: number | null;
  useGemini: boolean;
};

const GEMINI_ROWS_PER_REQUEST = 50;
const GEMINI_CONCURRENCY_LIMIT = 3;
const DRY_RUN_PREVIEW_LIMIT = 1000;
// Temporary testing flag: set to null to let Gemini AI review all selected rows.
const GEMINI_AI_TEST_REVIEW_MAX_ROWS: number | null = null;
const GEMINI_AI_TEST_REVIEW_MODEL = "gemini-3.1-flash-lite";
const GEMINI_USE_GOOGLE_SEARCH = false;
const GEMINI_ENABLE_ESCALATION = false;

const emptyManualEntry: ManualEntryForm = {
  ledger_account_code: "",
  ledger_account_name: "",
  split_account_code: "",
  split_account_name: "",
  transaction_date: "",
  transaction_type: "Manual",
  transaction_number: "",
  name: "",
  memo: "",
  debit: "",
  credit: "",
};

export default function GeneralLedgerUpload() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookId, setBookId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [useGeminiReview, setUseGeminiReview] = useState(false);
  const [trainXgboostTestModel, setTrainXgboostTestModel] = useState(false);

  const [summary, setSummary] = useState<ParseSummary | null>(null);
  const [accountFilter, setAccountFilter] = useState("all");
  const [manualEntry, setManualEntry] = useState<ManualEntryForm>(emptyManualEntry);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showWorkbookPreview, setShowWorkbookPreview] = useState(false);
  const [accountSuggestions, setAccountSuggestions] =
    useState<GLAccountSuggestionsResponse | null>(null);
  const [accountReviewProgress, setAccountReviewProgress] =
    useState<AccountReviewProgress | null>(null);
  const [applyingSuggestionKey, setApplyingSuggestionKey] = useState<string | null>(null);
  const [appliedSuggestionRows, setAppliedSuggestionRows] = useState<Set<number>>(
    () => new Set()
  );
  const [focusedReviewRowId, setFocusedReviewRowId] = useState<string | null>(null);
  const [activeReviewFinder, setActiveReviewFinder] =
    useState<ReviewFinderKind | null>(null);
  const [appliedSuggestionChanges, setAppliedSuggestionChanges] = useState<
    Map<string, ApplySuggestedTargetResponse["applied_change"]>
  >(() => new Map());
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [xgboostTrainingResult, setXgboostTrainingResult] =
    useState<GLXgboostTestTrainingResponse | null>(null);
  const [backgroundUploadMessage, setBackgroundUploadMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const parseRunIdRef = useRef(0);
  const loadedPreviewTokenRef = useRef<string | null>(null);
  const pendingImportReviewScrollRef = useRef(false);
  const glFileInputRef = useRef<HTMLInputElement | null>(null);

  // Queries & Mutations
  const { data: books = [], isLoading: isLoadingBooks, error: booksError } = useBooks();



  const sourceFileId = summary?.source_file_id ?? null;
  const companyIdForPreview = summary?.company_id ?? null;
  const isDryRun = Boolean(
    summary?.dry_run || summary?.status === "dry_run" || (summary && sourceFileId === null)
  );

  const { data: previewData, isLoading: isPreviewLoading } = useImportPreview(sourceFileId, companyIdForPreview);
  const {
    data: uploadQueueData,
    isLoading: isUploadQueueLoading,
    refetch: refetchUploadQueue,
  } = useGLUploadQueue(10);
  const uploadQueue = uploadQueueData?.jobs ?? [];

  const parseImportMutation = useParseImport();
  const parseImportBackgroundMutation = useParseImportInBackground();
  const dryRunPreviewPageMutation = useDryRunPreviewPage();
  const accountSuggestionsMutation = useGLAccountSuggestions();
  const xgboostTrainingMutation = useTrainXgboostTestModelFromGlExport();
  const { addJob } = useGlobalProgress();
  const deleteImportMutation = useDeleteImport();
  const addManualEntryMutation = useAddManualEntry();
  const applySuggestedTargetMutation = useApplySuggestedTarget();
  const unapplySuggestedTargetMutation = useUnapplySuggestedTarget();
  const saveImportMutation = useSaveImport();
  const saveImportFromUploadMutation = useSaveImportFromUpload();
  const saveDryRunPreviewMutation = useSaveDryRunPreview();

  const [localPreview, setLocalPreview] = useState<ImportPreview | null>(null);

  useEffect(() => {
    if (previewData) {
      setLocalPreview(previewData);
      setShowWorkbookPreview(true);
    }
  }, [previewData]);

  // Handle URL Param selection
  useEffect(() => {
    const companyParam = searchParams.get("company_id");
    const requestedCompanyId = companyParam ? Number(companyParam) : null;
    if (requestedCompanyId && books.length > 0 && !bookId) {
      const requestedBook =
        books.find((book) => book.company_id === requestedCompanyId && book.is_default) ??
        books.find((book) => book.company_id === requestedCompanyId);
      if (requestedBook) {
        setBookId(requestedBook.book_id);
      }
    }
  }, [books, bookId, searchParams]);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("dry_run_preview_token");
    if (!token || loadedPreviewTokenRef.current === token) return;
    loadedPreviewTokenRef.current = token;
    pendingImportReviewScrollRef.current = window.location.hash === "#import-review";
    void handleDryRunPreviewPage(1, token);
  }, []);

  const selectedBook = useMemo(
    () => books.find((book) => book.book_id === bookId) ?? null,
    [books, bookId]
  );

  const preview = localPreview;
  const suggestions = useMemo(
    () => accountSuggestions?.suggestions ?? [],
    [accountSuggestions]
  );
  const suggestionByTransaction = useMemo(() => {
    const map = new Map<string, GLAccountSuggestion>();
    for (const suggestion of suggestions) {
      map.set(suggestionKeyFromSuggestion(suggestion), suggestion);
    }
    return map;
  }, [suggestions]);

  const workbookRows = useMemo<WorkbookPreviewRow[]>(() => {
    if (!preview) return [];
    return preview.accounts.flatMap((account) =>
      account.transactions.map((txn) => ({
        account,
        txn,
        suggestion:
          suggestionByTransaction.get(suggestionKeyFromPreview(account, txn)) ??
          null,
      }))
    );
  }, [preview, suggestionByTransaction]);
  const xgboostWorkbookRows = useMemo(
    () => workbookRows.filter(isWorkbookXgboostReviewRow),
    [workbookRows]
  );
  const qbRuleWorkbookRows = useMemo(
    () => workbookRows.filter(isWorkbookQuickBooksRuleReviewRow),
    [workbookRows]
  );
  const aiReviewWorkbookRows = useMemo(
    () => workbookRows.filter(isWorkbookAiReviewRow),
    [workbookRows]
  );
  const activeReviewFinderRows = useMemo(() => {
    if (activeReviewFinder === "quickbooks_rule") return qbRuleWorkbookRows;
    if (activeReviewFinder === "ai") return aiReviewWorkbookRows;
    if (activeReviewFinder === "xgboost") return xgboostWorkbookRows;
    return [];
  }, [
    activeReviewFinder,
    aiReviewWorkbookRows,
    qbRuleWorkbookRows,
    xgboostWorkbookRows,
  ]);

  const reviewDifference = preview ? preview.totals.debits - preview.totals.credits : 0;
  const reconciliationChecks = preview?.reconciliation?.checks ?? [];
  const hasReconciliationMismatch = reconciliationChecks.some((check) => check.status !== "match");
  const reviewReady = Boolean(preview) && Boolean(preview?.reconciliation?.is_balanced) && !hasReconciliationMismatch;
  const isReviewingAccounts = accountSuggestionsMutation.isPending;
  const isTrainingXgboost = xgboostTrainingMutation.isPending;
  const isPreviewPageLoading = dryRunPreviewPageMutation.isPending;
  const isBackgroundParsing = parseImportBackgroundMutation.isPending;
  const isSavingImport = saveImportMutation.isPending || saveImportFromUploadMutation.isPending || saveDryRunPreviewMutation.isPending;
  const isUploadBusy = parseImportMutation.isPending || isBackgroundParsing || isPreviewPageLoading || isTrainingXgboost || isReviewingAccounts || isSavingImport;
  const canRunAccountReview = Boolean(summary && file && selectedBook && !isReviewingAccounts);
  const canSaveDryRun = Boolean(summary?.dry_run_preview_token || (selectedBook && file));
  const accountReviewProgressLabel = accountReviewProgress
    ? formatAccountReviewProgress(accountReviewProgress)
    : null;
  const hasAccountReviewProgress = accountReviewProgress !== null;

  const previewAccounts = preview?.accounts ?? [];
  const previewPagination = preview?.pagination ?? null;
  const visibleReviewAccounts = useMemo(() => {
    if (!preview) return [];
    if (accountFilter === "all") return preview.accounts ?? [];
    return (preview.accounts ?? []).filter((account) => account.account_key === accountFilter);
  }, [accountFilter, preview]);

  useEffect(() => {
    if (!preview || !pendingImportReviewScrollRef.current) return;
    const timeout = window.setTimeout(scrollToImportReview, 100);
    return () => window.clearTimeout(timeout);
  }, [preview]);

  useEffect(() => {
    if (!accountSuggestionsMutation.isPending || !hasAccountReviewProgress) return;

    const interval = window.setInterval(() => {
      setAccountReviewProgress((current) => {
        if (!current || current.current >= current.total) return current;
        return {
          ...current,
          current: Math.min(
            current.total,
            current.current + GEMINI_CONCURRENCY_LIMIT
          ),
        };
      });
    }, 5000);

    return () => window.clearInterval(interval);
  }, [accountSuggestionsMutation.isPending, hasAccountReviewProgress]);

  function resetUploadReviewState() {
    setSummary(null);
    setLocalPreview(null);
    setAccountFilter("all");
    setManualEntry(emptyManualEntry);
    setShowManualEntry(false);
    setShowWorkbookPreview(false);
    setAccountSuggestions(null);
    setAccountReviewProgress(null);
    setApplyingSuggestionKey(null);
    setAppliedSuggestionRows(new Set());
    setFocusedReviewRowId(null);
    setActiveReviewFinder(null);
    setAppliedSuggestionChanges(new Map());
    setSuggestionError(null);
    setXgboostTrainingResult(null);
    setBackgroundUploadMessage(null);
  }

  function toggleReviewFinder(kind: ReviewFinderKind, rows: WorkbookPreviewRow[]) {
    if (rows.length === 0) return;
    setActiveReviewFinder((current) => (current === kind ? null : kind));
  }

  function goToReviewFinderRow(row: WorkbookPreviewRow) {
    const targetId = previewRowDomId(row.account, row.txn);

    setAccountFilter(row.account.account_key);
    setFocusedReviewRowId(targetId);
    setShowWorkbookPreview(false);

    window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 100);
  }

  function scrollToImportReview() {
    window.setTimeout(() => {
      const reviewSection = document.getElementById("import-review");
      if (!reviewSection) return;
      reviewSection.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      pendingImportReviewScrollRef.current = false;
    }, 50);
  }

  function handleGlFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    parseRunIdRef.current += 1;
    discardStaged(summary);
    setFile(selectedFile);
    resetUploadReviewState();
  }

  function openGlFilePicker() {
    if (!glFileInputRef.current) return;
    glFileInputRef.current.value = "";
    glFileInputRef.current.click();
  }

  function clearGlFile() {
    parseRunIdRef.current += 1;
    discardStaged(summary);
    setFile(null);
    resetUploadReviewState();
    if (glFileInputRef.current) {
      glFileInputRef.current.value = "";
    }
  }

  async function handleParse() {
    if (!file) {
      setError("Choose a GL file before parsing.");
      return;
    }
    if (!selectedBook) {
      setError("Choose a company/book before parsing.");
      return;
    }

    const currentFile = file;
    const currentBook = selectedBook;
    const parseRunId = parseRunIdRef.current + 1;
    parseRunIdRef.current = parseRunId;
    setError(null);
    setSummary(null);
    setLocalPreview(null);
    setAccountFilter("all");
    setManualEntry(emptyManualEntry);
    setShowManualEntry(false);
    setShowWorkbookPreview(false);
    setAccountSuggestions(null);
    setAccountReviewProgress(null);
    setApplyingSuggestionKey(null);
    setAppliedSuggestionRows(new Set());
    setFocusedReviewRowId(null);
    setActiveReviewFinder(null);
    setAppliedSuggestionChanges(new Map());
    setSuggestionError(null);
    setXgboostTrainingResult(null);
    setBackgroundUploadMessage(null);

    try {
      const backgroundParse = await parseImportBackgroundMutation.mutateAsync({
        companyBookId: currentBook.book_id,
        file: currentFile,
        dryRun: true,
        previewLimit: DRY_RUN_PREVIEW_LIMIT,
      });
      if (parseRunIdRef.current !== parseRunId) return;
      addJob(
        "GL dry-run preview",
        Promise.resolve(backgroundParse),
        {
          description: "Backend worker is parsing the GL file...",
          type: "upload",
        }
      );
      setBackgroundUploadMessage(
        "The backend worker is parsing this GL dry-run preview. You can leave this page and open the notification when it is ready."
      );
      void refetchUploadQueue();

      if (trainXgboostTestModel) {
        const training = await xgboostTrainingMutation.mutateAsync({
          file: currentFile,
          formatCode: currentBook.format_code,
          companyName: currentBook.company_name,
          targetField: "split_account",
          excludeBlankTargets: true,
          excludeTransfers: true,
          includeZeroAmounts: false,
          numRounds: 50,
        });
        if (parseRunIdRef.current !== parseRunId) return;
        setXgboostTrainingResult(training);
        if (training.status !== "success" && training.status !== "queued") {
          setError(`XGBoost test training failed: ${training.message}`);
          return;
        }
        if (training.status === "queued") {
          addJob(
            "XGBoost training",
            Promise.resolve(training),
            {
              description: "Training from the GL export in the background...",
              type: "database",
            }
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse GL file");
      setAccountReviewProgress(null);
    }
  }

  async function handleDryRunPreviewPage(page: number, explicitPreviewToken?: string) {
    const previewToken =
      explicitPreviewToken ??
      preview?.pagination?.preview_token ??
      summary?.dry_run_preview_token ??
      null;
    if (!previewToken) return;

    setError(null);
    pendingImportReviewScrollRef.current = true;
    setBackgroundUploadMessage("Loading saved dry-run preview...");
    try {
      const data = await dryRunPreviewPageMutation.mutateAsync({
        previewToken,
        page,
        pageSize: DRY_RUN_PREVIEW_LIMIT,
      });
      setSummary(data.summary);
      setBookId(data.summary.company_book_id);
      setLocalPreview(data.preview ?? null);
      setAccountFilter("all");
      setFocusedReviewRowId(null);
      setActiveReviewFinder(null);
      setShowWorkbookPreview(false);
      setBackgroundUploadMessage(null);
      window.history.replaceState(null, "", "/general-ledger/upload#import-review");
      scrollToImportReview();
    } catch (err) {
      setBackgroundUploadMessage(null);
      setError(err instanceof Error ? err.message : "Failed to load dry-run preview page");
    }
  }

  async function handleReviewAccountSuggestions() {
    if (!file || !selectedBook || !summary) return;

    setSuggestionError(null);
    setAccountSuggestions(null);
    setApplyingSuggestionKey(null);
    setAppliedSuggestionRows(new Set());
    setAppliedSuggestionChanges(new Map());

    await reviewAccountSuggestions({
      file,
      formatCode: selectedBook.format_code,
      parseRunId: parseRunIdRef.current,
      rowCount: summary.gl_entry_lines,
      context: {
        filename: file.name,
        companyId: selectedBook.company_id,
        companyName: selectedBook.company_name,
        formatCode: selectedBook.format_code,
        sourceFileId: summary.source_file_id,
        useGemini: useGeminiReview,
      },
    });
  }

  async function reviewAccountSuggestions({
    file,
    formatCode,
    parseRunId,
    rowCount,
    context,
  }: {
    file: File;
    formatCode: string;
    parseRunId: number;
    rowCount: number;
    context: AccountReviewLogContext;
  }) {
    if (context.useGemini) {
      const geminiReviewRowCount =
        GEMINI_AI_TEST_REVIEW_MAX_ROWS == null
          ? rowCount
          : Math.min(rowCount, GEMINI_AI_TEST_REVIEW_MAX_ROWS);
      const totalChunks = estimateGeminiChunkCount(
        geminiReviewRowCount
      );
      setAccountReviewProgress({
        current: Math.min(GEMINI_CONCURRENCY_LIMIT, totalChunks),
        total: totalChunks,
      });
    }

    try {
      const useGemini = context.useGemini;
      const review = await accountSuggestionsMutation.mutateAsync({
        file,
        companyId: context.companyId,
        companyName: context.companyName,
        formatCode,
        includeAll: true,
        useAi: useGemini,
        aiProvider: useGemini ? "gemini" : undefined,
        aiModel: useGemini ? GEMINI_AI_TEST_REVIEW_MODEL : undefined,
        aiRowsPerRequest: useGemini ? GEMINI_ROWS_PER_REQUEST : undefined,
        aiConcurrencyLimit: useGemini ? GEMINI_CONCURRENCY_LIMIT : undefined,
        aiUseGoogleSearch: useGemini ? GEMINI_USE_GOOGLE_SEARCH : undefined,
        aiReviewAll: useGemini,
        aiMaxRows: useGemini ? GEMINI_AI_TEST_REVIEW_MAX_ROWS : null,
        aiEnableEscalation: useGemini ? GEMINI_ENABLE_ESCALATION : false,
        aiEscalationConfidence: useGemini ? 0.85 : undefined,
        applyAiSuggestions: useGemini,
      });

      const geminiIssues = logGeminiReviewIssues(review, context);
      if (parseRunIdRef.current !== parseRunId) return;
      setAccountSuggestions(review);
      if (geminiIssues.length > 0) {
        setSuggestionError(formatGeminiReviewIssueNotice(geminiIssues));
      }
    } catch (suggestionErr) {
      const message =
        suggestionErr instanceof Error
          ? suggestionErr.message
          : "Failed to review account suggestions";
      logGeminiReviewRequestFailure(suggestionErr, context);
      if (parseRunIdRef.current === parseRunId) {
        setSuggestionError(`Account review failed after the GL upload was staged: ${message}`);
      }
    } finally {
      if (parseRunIdRef.current === parseRunId) {
        setAccountReviewProgress(null);
      }
    }
  }

  function discardStaged(staged: ParseSummary | null) {
    if (staged && !staged.dry_run && staged.source_file_id !== null) {
      deleteImportMutation.mutateAsync({
        companyId: staged.company_id,
        sourceFileId: staged.source_file_id,
      }).catch(() => {});
    }
  }

  async function handleCancel() {
    if (!summary) return;
    parseRunIdRef.current += 1;
    setError(null);

    if (isDryRun || summary.source_file_id === null) {
      resetUploadReviewState();
      return;
    }

    try {
      await deleteImportMutation.mutateAsync({
        companyId: summary.company_id,
        sourceFileId: summary.source_file_id,
      });
    } catch {
      // Non-fatal
    } finally {
      setSummary(null);
      setLocalPreview(null);
      setAccountFilter("all");
      setManualEntry(emptyManualEntry);
      setShowManualEntry(false);
      setShowWorkbookPreview(false);
      setAccountSuggestions(null);
      setApplyingSuggestionKey(null);
      setAppliedSuggestionRows(new Set());
      setFocusedReviewRowId(null);
      setActiveReviewFinder(null);
      setAppliedSuggestionChanges(new Map());
      setSuggestionError(null);

      // Clear URL params
      const currentSearchParams = new URLSearchParams(window.location.search);
      if (currentSearchParams.has("source_file_id")) {
        currentSearchParams.delete("source_file_id");
        currentSearchParams.delete("company_id");
        setSearchParams(currentSearchParams, { replace: true });
      }
    }
  }

  function updateManualEntry<K extends keyof ManualEntryForm>(key: K, value: ManualEntryForm[K]) {
    setManualEntry((current) => ({ ...current, [key]: value }));
  }

  function optionalNumber(value: string) {
    const cleaned = value.trim();
    return cleaned ? Number(cleaned) : undefined;
  }

  async function handleManualAdd() {
    if (!summary || isDryRun || summary.source_file_id === null) return;
    setError(null);

    try {
      const entry: ManualGlEntryRequest = {
        company_id: summary.company_id,
        ledger_account_code: manualEntry.ledger_account_code.trim(),
        ledger_account_name: manualEntry.ledger_account_name.trim() || null,
        split_account_code: manualEntry.split_account_code.trim() || null,
        split_account_name: manualEntry.split_account_name.trim() || null,
        transaction_date: manualEntry.transaction_date || null,
        transaction_type: manualEntry.transaction_type.trim() || "Manual",
        transaction_number: manualEntry.transaction_number.trim() || null,
        name: manualEntry.name.trim() || null,
        memo: manualEntry.memo.trim() || null,
        debit: optionalNumber(manualEntry.debit),
        credit: optionalNumber(manualEntry.credit),
      };

      const response = await addManualEntryMutation.mutateAsync({
        sourceFileId: summary.source_file_id,
        entry,
      });

      setLocalPreview(response.preview);
      setSummary((current) =>
        current
          ? {
              ...current,
              gl_entries: response.preview.totals.unique_gl_ids,
              gl_entry_lines: response.preview.totals.line_count,
              bank_lines: current.bank_lines + (response.manual_entry.is_bank_line ? 1 : 0),
            }
          : current
      );
      setManualEntry(emptyManualEntry);
      setShowManualEntry(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add manual GL entry");
    }
  }

  async function handleApplySuggestedTarget(suggestion: GLAccountSuggestion) {
    if (!summary || isDryRun || summary.source_file_id === null) return;
    const suggestedAccountNumber = getVisibleSuggestedTargetNumber(suggestion)?.trim();
    if (!suggestedAccountNumber || suggestedAccountNumber === "MANUAL_REVIEW") {
      setError("Choose a valid suggested target before applying.");
      return;
    }

    const suggestionKey = applySuggestionKey(suggestion);
    setError(null);
    setApplyingSuggestionKey(suggestionKey);

    try {
      const response = await applySuggestedTargetMutation.mutateAsync({
        sourceFileId: summary.source_file_id,
        change: {
          company_id: summary.company_id,
          row_number: suggestion.row_number,
          target_field: suggestion.target_field,
          suggested_account_number: suggestedAccountNumber,
        },
      });

      setLocalPreview(response.preview);
      setAppliedSuggestionRows((current) => {
        const next = new Set(current);
        next.add(suggestion.row_number);
        return next;
      });
      setAppliedSuggestionChanges((current) => {
        const next = new Map(current);
        next.set(suggestionKey, response.applied_change);
        return next;
      });
      setAccountSuggestions((current) => {
        if (!current) return current;

        const updatedSuggestions = current.suggestions.map((row) => {
          if (applySuggestionKey(row) !== suggestionKey) return row;

          const updatedRow = {
            ...row,
            current_target_account_number: response.applied_change.applied_account_number,
            current_target_account_name: response.applied_change.applied_account_name,
            suggested_target_account_number: response.applied_change.applied_account_number,
            suggested_target_account_name: response.applied_change.applied_account_name,
            suggested_account_number: response.applied_change.applied_account_number,
            suggested_account_name: response.applied_change.applied_account_name,
            confidence: 1,
            reason: "Suggested target was applied to the staged import.",
            rule: "applied_suggested_target",
            requires_manual_review: false,
          };

          if (response.applied_change.target_field === "split_account") {
            return {
              ...updatedRow,
              current_split_account_number: response.applied_change.applied_account_number,
              current_split_account_name: response.applied_change.applied_account_name,
              suggested_split_account_number: response.applied_change.applied_account_number,
              suggested_split_account_name: response.applied_change.applied_account_name,
            };
          }

          return {
            ...updatedRow,
            ledger_account_number: response.applied_change.applied_account_number,
            ledger_account_name: response.applied_change.applied_account_name,
          };
        });

        return {
          ...current,
          suggestions: updatedSuggestions,
          changed_suggestion_count: countChangedSuggestions(updatedSuggestions),
          manual_review_count: updatedSuggestions.filter((row) => row.requires_manual_review).length,
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply suggested target");
    } finally {
      setApplyingSuggestionKey((current) => (current === suggestionKey ? null : current));
    }
  }

  async function handleUnapplySuggestedTarget(suggestion: GLAccountSuggestion) {
    if (!summary || isDryRun || summary.source_file_id === null) return;
    const suggestionKey = applySuggestionKey(suggestion);
    const appliedChange = appliedSuggestionChanges.get(suggestionKey);
    if (!appliedChange) {
      setError("This suggested target is not available to undo in the current review session.");
      return;
    }

    setError(null);
    setApplyingSuggestionKey(suggestionKey);

    try {
      const response = await unapplySuggestedTargetMutation.mutateAsync({
        sourceFileId: summary.source_file_id,
        change: {
          company_id: summary.company_id,
          row_number: appliedChange.row_number,
          target_field: appliedChange.target_field,
          previous_account_number: appliedChange.previous_account_number,
        },
      });

      setLocalPreview(response.preview);
      setAppliedSuggestionRows((current) => {
        const next = new Set(current);
        next.delete(suggestion.row_number);
        return next;
      });
      setAppliedSuggestionChanges((current) => {
        const next = new Map(current);
        next.delete(suggestionKey);
        return next;
      });
      setAccountSuggestions((current) => {
        if (!current) return current;

        const updatedSuggestions = current.suggestions.map((row) => {
          if (applySuggestionKey(row) !== suggestionKey) return row;

          const updatedRow = {
            ...row,
            current_target_account_number: response.unapplied_change.restored_account_number,
            current_target_account_name: response.unapplied_change.restored_account_name,
            suggested_target_account_number: response.unapplied_change.removed_account_number,
            suggested_target_account_name: response.unapplied_change.removed_account_name,
            suggested_account_number: response.unapplied_change.removed_account_number,
            suggested_account_name: response.unapplied_change.removed_account_name,
            confidence: row.ai_confidence ?? row.confidence,
            reason: "Suggested target was unapplied from the staged import.",
            rule: "unapplied_suggested_target",
            requires_manual_review: false,
          };

          if (response.unapplied_change.target_field === "split_account") {
            return {
              ...updatedRow,
              current_split_account_number: response.unapplied_change.restored_account_number,
              current_split_account_name: response.unapplied_change.restored_account_name,
              suggested_split_account_number: response.unapplied_change.removed_account_number,
              suggested_split_account_name: response.unapplied_change.removed_account_name,
            };
          }

          return {
            ...updatedRow,
            ledger_account_number: response.unapplied_change.restored_account_number,
            ledger_account_name: response.unapplied_change.restored_account_name,
          };
        });

        return {
          ...current,
          suggestions: updatedSuggestions,
          changed_suggestion_count: countChangedSuggestions(updatedSuggestions),
          manual_review_count: updatedSuggestions.filter((row) => row.requires_manual_review).length,
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to undo suggested target");
    } finally {
      setApplyingSuggestionKey((current) => (current === suggestionKey ? null : current));
    }
  }

  async function handleSave() {
    if (!summary) return;
    setError(null);

    try {
      if (isDryRun || summary.source_file_id === null) {
        const previewToken = summary.dry_run_preview_token ?? preview?.pagination?.preview_token;
        if (previewToken) {
          const saved = await saveDryRunPreviewMutation.mutateAsync({
            previewToken,
          });
          const companyId = saved.summary.company_id ?? summary.company_id;
          window.location.assign(`/general-ledger/company/${companyId}?period=q1&year=2026`);
          return;
        }

        if (!file) {
          setError("Choose a GL file before saving.");
          return;
        }
        if (!selectedBook) {
          setError("Choose a company/book before saving.");
          return;
        }

        await saveImportFromUploadMutation.mutateAsync({
          companyBookId: selectedBook.book_id,
          file,
        });
        window.location.assign(`/general-ledger/company/${selectedBook.company_id}?period=q1&year=2026`);
        return;
      }

      await saveImportMutation.mutateAsync({
        companyId: selectedBook?.company_id ?? summary.company_id,
        sourceFileId: summary.source_file_id,
      });
      window.location.assign(`/general-ledger/company/${selectedBook?.company_id ?? summary.company_id}?period=q1&year=2026`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save import");
    }
  }

  return (
    <main className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <header>
        <button
          className="mb-2 text-sm text-muted-foreground hover:underline"
          onClick={() => window.location.assign("/general-ledger")}
        >
          ← Back to General Ledger Dashboard
        </button>

        <h1 className="text-3xl font-bold tracking-tight">Upload General Ledger</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Select a company/book, then upload the GL file. The parser format is configured automatically.
        </p>
      </header>

      {(error || booksError) && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-400/40 dark:bg-red-950/40 dark:text-red-200">
          {error || booksError?.message}
        </section>
      )}

      {backgroundUploadMessage && (
        <section className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-400/40 dark:bg-blue-950/40 dark:text-blue-200">
          {backgroundUploadMessage}
        </section>
      )}

      <GLUploadQueuePanel
        jobs={uploadQueue}
        isLoading={isUploadQueueLoading}
        onRefresh={() => void refetchUploadQueue()}
        onOpenPreview={(token) => handleDryRunPreviewPage(1, token)}
      />

      <Card>
        <CardContent className="p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Company / Book</Label>
              <Select
                value={bookId ? String(bookId) : ""}
                disabled={isLoadingBooks}
                onValueChange={(val) => {
                  parseRunIdRef.current += 1;
                  discardStaged(summary);
                  setBookId(Number(val));
                  setSummary(null);
                  setLocalPreview(null);
                  setAccountFilter("all");
                  setManualEntry(emptyManualEntry);
                  setShowManualEntry(false);
                  setShowWorkbookPreview(false);
                  setAccountSuggestions(null);
                  setApplyingSuggestionKey(null);
                  setAppliedSuggestionRows(new Set());
                  setFocusedReviewRowId(null);
                  setActiveReviewFinder(null);
                  setAppliedSuggestionChanges(new Map());
                  setSuggestionError(null);
                  setBackgroundUploadMessage(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingBooks ? "Loading books..." : "Select company / book"} />
                </SelectTrigger>
                <SelectContent>
                  {books.map((book) => (
                    <SelectItem key={book.book_id} value={String(book.book_id)}>
                      {book.book_name} — {book.format_name}
                      {book.is_default ? " (default)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="gl-file-upload">GL File</Label>
              <Input
                ref={glFileInputRef}
                id="gl-file-upload"
                type="file"
                accept=".xlsx,.xls,.csv"
                className="sr-only"
                onChange={handleGlFileChange}
              />
              <div className="flex min-h-8 items-center gap-2 rounded-lg border border-input bg-background px-2 py-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={openGlFilePicker}
                  disabled={parseImportMutation.isPending}
                >
                  <UploadCloud className="h-4 w-4" />
                  Choose file
                </Button>
                <div className="min-w-0 flex-1 text-sm">
                  {file ? (
                    <span className="block truncate" title={file.name}>
                      {file.name}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">No file selected</span>
                  )}
                </div>
                {file && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={clearGlFile}
                    disabled={parseImportMutation.isPending}
                    title="Remove selected file"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/20 p-3 md:col-span-2">
              <div>
                <Label htmlFor="dry-run-preview">Dry-run preview</Label>
                <p className="mt-1 text-xs text-muted-foreground">
                  Preview/review does not write pending import rows or archive the upload.
                  The file is stored only when Save is pressed.
                </p>
              </div>
              <Button
                id="dry-run-preview"
                type="button"
                variant="default"
                size="sm"
                disabled
                title="Preview is always dry-run; the upload is stored only when Save is pressed"
              >
                On
              </Button>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/20 p-3 md:col-span-2">
              <div>
                <Label htmlFor="gemini-review">Gemini AI test review</Label>
              </div>
              <Button
                id="gemini-review"
                type="button"
                variant={useGeminiReview ? "default" : "outline"}
                size="sm"
                onClick={() => setUseGeminiReview((enabled) => !enabled)}
                disabled={isUploadBusy}
                title={
                  isUploadBusy
                    ? "Gemini review setting is locked while this upload is running"
                    : "Toggle Gemini AI test review"
                }
              >
                {useGeminiReview ? "On" : "Off"}
              </Button>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/20 p-3 md:col-span-2">
              <div>
                <Label htmlFor="xgboost-test-training">XGBoost test training</Label>
              </div>
              <Button
                id="xgboost-test-training"
                type="button"
                variant={trainXgboostTestModel ? "default" : "outline"}
                size="sm"
                onClick={() => setTrainXgboostTestModel((enabled) => !enabled)}
                disabled={isUploadBusy}
              >
                {trainXgboostTestModel ? "On" : "Off"}
              </Button>
            </div>
          </div>

          {(xgboostTrainingResult?.status === "success" || xgboostTrainingResult?.status === "queued") && (
            <div className="mt-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-400/40 dark:bg-blue-950/40 dark:text-blue-200">
              {xgboostTrainingResult.status === "queued" ? (
                <div>
                  <div className="font-medium">XGBoost test training queued</div>
                  <div className="mt-1 text-xs">
                    The model is training in the background. Keep using the page; a notification will appear when it finishes.
                  </div>
                </div>
              ) : (
                <>
                  <div className="font-medium">
                    XGBoost test trained:{" "}
                    {xgboostTrainingResult.result?.trained_rows.toLocaleString("en-US") ?? "0"} rows /{" "}
                    {xgboostTrainingResult.result?.class_count.toLocaleString("en-US") ?? "0"} accounts
                  </div>
                  {xgboostTrainingResult.training && (
                    <div className="mt-1 text-xs">
                      Trusted current split-account labels from company/name/memo/current bank input;{" "}
                      {(xgboostTrainingResult.training.memo_rows ?? 0).toLocaleString("en-US")} memo rows,{" "}
                      {(xgboostTrainingResult.training.current_account_rows ?? 0).toLocaleString("en-US")} current-account rows; skipped{" "}
                      {xgboostTrainingResult.training.skipped_transfer_rows.toLocaleString("en-US")} transfers,{" "}
                      {(xgboostTrainingResult.training.skipped_untrainable_target_rows ?? 0).toLocaleString("en-US")} clearing/bank targets.
                    </div>
                  )}
                </>
              )}
              {xgboostTrainingResult.training?.cleanup_files?.length ? (
                <div className="mt-1 truncate font-mono text-xs" title={xgboostTrainingResult.training.cleanup_files.join(" | ")}>
                  Cleanup: {xgboostTrainingResult.training.cleanup_files.join(" | ")}
                </div>
              ) : null}
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <Button
              disabled={!selectedBook || !file || isUploadBusy}
              onClick={handleParse}
            >
              {isTrainingXgboost
                ? "Training XGBoost..."
                : isBackgroundParsing
                ? "Queueing dry-run..."
                : parseImportMutation.isPending
                ? "Building dry-run..."
                : accountSuggestionsMutation.isPending
                  ? accountReviewProgressLabel ?? (useGeminiReview ? "Reviewing with Gemini..." : "Reviewing...")
                  : "Dry-run Preview"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {selectedBook && (
        <Card className="bg-muted/30">
          <CardContent className="p-4 grid gap-4 md:grid-cols-3">
            <Info label="Selected Company" value={selectedBook.company_name} />
            <Info label="Book" value={selectedBook.book_name} />
            <Info label="Parser Format" value={selectedBook.format_name} />
          </CardContent>
        </Card>
      )}

      {summary && (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <MetricCard label="Entries Parsed" value={summary.gl_entries} />
            <MetricCard label="Lines Parsed" value={summary.gl_entry_lines} />
            <MetricCard label="Accounts Resolved" value={summary.accounts_resolved} />
            <MetricCard label="Bank Lines" value={summary.bank_lines} />
          </section>

          {(isPreviewLoading && !preview) ? (
            <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
              Loading preview...
            </div>
          ) : preview ? (
            <Card id="import-review" className="scroll-mt-6 overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4 bg-muted/20">
                <div>
                  <h2 className="text-lg font-medium">Import Review</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {preview.rows.length} of {preview.totals.line_count} rows shown
                    {isDryRun ? " from a dry-run preview" : ""}
                  </p>
                  {isDryRun && previewPagination?.preview_token && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          isPreviewPageLoading ||
                          !previewPagination.has_previous
                        }
                        onClick={() =>
                          handleDryRunPreviewPage((previewPagination.page ?? 1) - 1)
                        }
                      >
                        Previous
                      </Button>
                      <span>
                        Page {(previewPagination.page ?? 1).toLocaleString("en-US")} of{" "}
                        {(previewPagination.page_count ?? 1).toLocaleString("en-US")}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={
                          isPreviewPageLoading ||
                          !previewPagination.has_next
                        }
                        onClick={() =>
                          handleDryRunPreviewPage((previewPagination.page ?? 1) + 1)
                        }
                      >
                        {isPreviewPageLoading ? "Loading..." : "Next"}
                      </Button>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {isDryRun && (
                    <Badge className="border-blue-500/60 bg-blue-50 text-blue-700 hover:bg-blue-50 dark:border-blue-400/40 dark:bg-blue-950/40 dark:text-blue-200">
                      No DB writes until Save
                    </Badge>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowWorkbookPreview(true)}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Workbook
                  </Button>
                  <Badge variant={reviewReady ? "default" : "destructive"} className={reviewReady ? "bg-green-600 text-white hover:bg-green-600 dark:bg-green-500 dark:text-green-950 dark:hover:bg-green-500" : ""}>
                    {isDryRun ? "Preview only" : reviewReady ? "Ready for save" : "Needs review"}
                  </Badge>
                </div>
              </div>

              <div className="grid border-b bg-muted/10 md:grid-cols-5 md:divide-x">
                <ReviewStat label="Rows" value={preview.totals.line_count.toLocaleString("en-US")} />
                <ReviewStat label="Unique GL IDs" value={preview.totals.unique_gl_ids.toLocaleString("en-US")} />
                <ReviewStat label="Total Debit" value={formatMoney(preview.totals.debits)} />
                <ReviewStat label="Total Credit" value={formatMoney(preview.totals.credits)} />
                <ReviewStat
                  label="Balance"
                  value={formatMoney(reviewDifference)}
                  tone={Math.abs(reviewDifference) < 0.005 ? "ok" : "warning"}
                />
              </div>

              {preview.account_review_summary && (
                <div className="grid border-b bg-background md:grid-cols-6 md:divide-x">
                  <ReviewStat
                    label="Bank Txns"
                    value={preview.account_review_summary.bank_transaction_count.toLocaleString("en-US")}
                  />
                  <ReviewStat
                    label="QB Rules"
                    value={preview.account_review_summary.quickbooks_rule_count.toLocaleString("en-US")}
                    onClick={
                      qbRuleWorkbookRows.length > 0
                        ? () => toggleReviewFinder("quickbooks_rule", qbRuleWorkbookRows)
                        : undefined
                    }
                    title={
                      qbRuleWorkbookRows.length > 0
                        ? "Open QuickBooks rule reviewed transaction finder"
                        : "No QuickBooks rule-reviewed transactions in this preview"
                    }
                  />
                  <ReviewStat
                    label="XGBoost"
                    value={preview.account_review_summary.xgboost_count.toLocaleString("en-US")}
                    onClick={
                      xgboostWorkbookRows.length > 0
                        ? () => toggleReviewFinder("xgboost", xgboostWorkbookRows)
                        : undefined
                    }
                    title={
                      xgboostWorkbookRows.length > 0
                        ? "Open XGBoost reviewed transaction finder"
                        : "No XGBoost-reviewed transactions in this preview"
                    }
                  />
                  <ReviewStat
                    label="AI Review"
                    value={preview.account_review_summary.ai_review_count.toLocaleString("en-US")}
                    tone={preview.account_review_summary.ai_review_count > 0 ? "warning" : "default"}
                    onClick={
                      aiReviewWorkbookRows.length > 0
                        ? () => toggleReviewFinder("ai", aiReviewWorkbookRows)
                        : undefined
                    }
                    title={
                      aiReviewWorkbookRows.length > 0
                        ? "Open AI reviewed transaction finder"
                        : "No AI-reviewed transactions in this preview"
                    }
                  />
                  <ReviewStat
                    label="Human"
                    value={preview.account_review_summary.human_review_count.toLocaleString("en-US")}
                    tone={preview.account_review_summary.human_review_count > 0 ? "warning" : "default"}
                  />
                  <ReviewStat
                    label="N/A"
                    value={preview.account_review_summary.not_applicable_count.toLocaleString("en-US")}
                  />
                </div>
              )}

              {preview.reconciliation && (
                <div className="border-b p-6">
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium text-lg">Completeness Checks</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {preview.reconciliation.explanation}
                      </p>
                    </div>
                    <Badge variant={preview.reconciliation.is_balanced ? "default" : "destructive"} className={preview.reconciliation.is_balanced ? "bg-green-600 text-white hover:bg-green-600 dark:bg-green-500 dark:text-green-950 dark:hover:bg-green-500" : ""}>
                      {preview.reconciliation.is_balanced ? "Balanced" : "Review"}
                    </Badge>
                  </div>

                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/50">
                        <TableRow>
                          <TableHead>Check</TableHead>
                          <TableHead className="text-right">Source</TableHead>
                          <TableHead className="text-right">Review</TableHead>
                          <TableHead className="text-right">Difference</TableHead>
                          <TableHead className="text-right">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reconciliationChecks.map((check) => (
                          <TableRow key={check.check}>
                            <TableCell className="font-medium">{check.check}</TableCell>
                            <TableCell className="text-right">{formatCheckValue(check.check, check.source)}</TableCell>
                            <TableCell className="text-right">{formatCheckValue(check.check, check.export)}</TableCell>
                            <TableCell className="text-right">{formatCheckValue(check.check, check.difference)}</TableCell>
                            <TableCell className="text-right">
                              <Badge variant={check.status === "match" ? "outline" : "destructive"} className={check.status === "match" ? "border-green-600 bg-green-50 text-green-700 dark:border-green-400/40 dark:bg-green-950/40 dark:text-green-200" : ""}>
                                {check.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="border-b bg-muted/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-medium">Account Suggestions</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Run this after the preview loads when you want XGBoost and optional Gemini review.
                    </p>
                  </div>
                  <Button
                    variant={accountSuggestions ? "outline" : "default"}
                    disabled={!canRunAccountReview}
                    onClick={handleReviewAccountSuggestions}
                  >
                    {accountSuggestionsMutation.isPending
                      ? accountReviewProgressLabel ?? (useGeminiReview ? "Reviewing with Gemini..." : "Reviewing...")
                      : accountSuggestions
                        ? "Run Review Again"
                        : "Run Account Review"}
                  </Button>
                </div>
              </div>

              <AccountSuggestionReview
                suggestions={suggestions}
                response={accountSuggestions}
                isLoading={accountSuggestionsMutation.isPending}
                progressLabel={accountReviewProgressLabel}
                error={suggestionError}
                onApplySuggestedTarget={!isDryRun && summary ? handleApplySuggestedTarget : undefined}
                onUnapplySuggestedTarget={!isDryRun && summary ? handleUnapplySuggestedTarget : undefined}
                applyingSuggestionKey={applyingSuggestionKey}
                appliedSuggestionRows={appliedSuggestionRows}
              />

              <div className="border-b p-6">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-lg">Chart of Accounts Review</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Accounts are shown as section titles with their charges underneath.
                    </p>
                  </div>
                  <Select value={accountFilter} onValueChange={setAccountFilter}>
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="All accounts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All accounts</SelectItem>
                      {previewAccounts.map((account) => (
                        <SelectItem key={account.account_key} value={account.account_key}>
                          {formatAccountLabel(account)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {visibleReviewAccounts.length === 0 ? (
                  <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
                    No accounts found in this preview.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {visibleReviewAccounts.map((account) => (
                      <ReviewAccountGroup
                        key={account.account_key}
                        account={account}
                        isFiltered={accountFilter === account.account_key}
                        onFilter={() => setAccountFilter(account.account_key)}
                        suggestionByTransaction={suggestionByTransaction}
                        focusedReviewRowId={focusedReviewRowId}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="border-b bg-muted/10 p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-lg">Manual Missing Entry</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Stage a missed debit or credit before save.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setShowManualEntry(!showManualEntry)}
                    disabled={isDryRun}
                  >
                    {isDryRun ? "Dry-run only" : showManualEntry ? "Hide" : "Manual Add"}
                  </Button>
                </div>

                {showManualEntry && !isDryRun && (
                  <div className="mt-6 grid gap-4 md:grid-cols-4">
                    <ManualField label="Account #" value={manualEntry.ledger_account_code} onChange={(val) => updateManualEntry("ledger_account_code", val)} />
                    <ManualField label="Account Name" value={manualEntry.ledger_account_name} onChange={(val) => updateManualEntry("ledger_account_name", val)} />
                    <ManualField label="Split #" value={manualEntry.split_account_code} onChange={(val) => updateManualEntry("split_account_code", val)} />
                    <ManualField label="Split Name" value={manualEntry.split_account_name} onChange={(val) => updateManualEntry("split_account_name", val)} />
                    <ManualField label="Date" type="date" value={manualEntry.transaction_date} onChange={(val) => updateManualEntry("transaction_date", val)} />
                    <ManualField label="Type" value={manualEntry.transaction_type} onChange={(val) => updateManualEntry("transaction_type", val)} />
                    <ManualField label="Num" value={manualEntry.transaction_number} onChange={(val) => updateManualEntry("transaction_number", val)} />
                    <ManualField label="Name" value={manualEntry.name} onChange={(val) => updateManualEntry("name", val)} />
                    <ManualField label="Memo" value={manualEntry.memo} onChange={(val) => updateManualEntry("memo", val)} />
                    <ManualField label="Debit" type="number" value={manualEntry.debit} onChange={(val) => updateManualEntry("debit", val)} />
                    <ManualField label="Credit" type="number" value={manualEntry.credit} onChange={(val) => updateManualEntry("credit", val)} />
                    <div className="flex items-end justify-end">
                      <Button
                        className="w-full"
                        disabled={
                          addManualEntryMutation.isPending ||
                          !manualEntry.ledger_account_code.trim() ||
                          (!manualEntry.debit.trim() && !manualEntry.credit.trim())
                        }
                        onClick={handleManualAdd}
                      >
                        {addManualEntryMutation.isPending ? "Adding..." : "Add Row"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : null}

          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-medium">Save Import</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isDryRun
                  ? "This preview is not staged. Saving will parse this file again and write the saved GL import to the database."
                  : "Review the account groups above, then save to make this import available on the company GL dashboard."}
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="outline"
                  disabled={
                    deleteImportMutation.isPending ||
                    isSavingImport ||
                    applySuggestedTargetMutation.isPending ||
                    unapplySuggestedTargetMutation.isPending
                  }
                  onClick={handleCancel}
                >
                  {isDryRun ? "Close Preview" : deleteImportMutation.isPending ? "Discarding..." : "Cancel"}
                </Button>
                <Button
                  disabled={
                    isSavingImport ||
                    isReviewingAccounts ||
                    applySuggestedTargetMutation.isPending ||
                    unapplySuggestedTargetMutation.isPending ||
                    !reviewReady ||
                    (isDryRun && !canSaveDryRun)
                  }
                  onClick={handleSave}
                >
                  {isSavingImport ? "Saving..." : "Save Import"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {preview && (
        <DraggableWorkbookPreview
          open={showWorkbookPreview}
          filename={file?.name ?? "Uploaded GL"}
          rows={workbookRows}
          onClose={() => setShowWorkbookPreview(false)}
        />
      )}
      {activeReviewFinder && (
        <ReviewFinderPanel
          kind={activeReviewFinder}
          rows={activeReviewFinderRows}
          focusedReviewRowId={focusedReviewRowId}
          onGoTo={goToReviewFinderRow}
          onClose={() => setActiveReviewFinder(null)}
        />
      )}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="font-medium mt-1">{value}</p>
    </div>
  );
}

function GLUploadQueuePanel({
  jobs,
  isLoading,
  onRefresh,
  onOpenPreview,
}: {
  jobs: GLUploadQueueItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenPreview: (token: string) => void;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-medium">Server GL Upload Queue</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Backend dry-run parses that continue while you use the site.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
            Refresh
          </Button>
        </div>

        {isLoading && jobs.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Loading upload queue...
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No background GL uploads yet.
          </div>
        ) : (
          <div className="divide-y rounded-md border">
            {jobs.map((job) => (
              <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {job.filename || `Upload job #${job.id}`}
                    </span>
                    <Badge variant={queueStatusVariant(job.status)}>
                      {queueStatusLabel(job.status)}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {job.company_name ? `${job.company_name} · ` : ""}
                    {job.gl_entry_lines != null
                      ? `${job.gl_entry_lines.toLocaleString("en-US")} rows · `
                      : ""}
                    {job.status === "failed" ? job.error_message || "Failed" : queueProgressText(job)}
                  </div>
                  {shouldShowQueueProgress(job) && (
                    <div
                      className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                      aria-label={`${queueProgressPercent(job)}% complete`}
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${queueProgressPercent(job)}%` }}
                      />
                    </div>
                  )}
                  <div className="mt-1 text-xs text-muted-foreground">
                    Started {formatQueueDate(job.created_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {job.preview_token ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onOpenPreview(job.preview_token as string)}
                    >
                      Open Preview
                    </Button>
                  ) : (
                    <Button type="button" size="sm" variant="outline" disabled>
                      Preview pending
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function queueStatusLabel(status: string) {
  if (status === "queued" || status === "queued_local") return "Queued";
  if (status === "processing") return "Backend processing";
  if (status === "completed") return "Ready";
  if (status === "failed") return "Failed";
  return status || "Unknown";
}

function queueStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default";
  if (status === "failed") return "destructive";
  if (status === "processing") return "secondary";
  return "outline";
}

function queueProgressPercent(job: GLUploadQueueItem) {
  if (job.status === "completed") return 100;
  return Math.max(0, Math.min(100, Number(job.progress) || 0));
}

function queueProgressText(job: GLUploadQueueItem) {
  if (job.status === "queued" || job.status === "queued_local") return "Waiting for backend worker";
  if (job.status === "processing") {
    const progress = queueProgressPercent(job);
    return progress <= 1 ? "Backend worker starting..." : `${progress}% complete`;
  }
  if (job.status === "completed") return "Ready to open";
  return `${queueProgressPercent(job)}% complete`;
}

function shouldShowQueueProgress(job: GLUploadQueueItem) {
  return job.status === "processing" || job.status === "completed";
}

function formatQueueDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function ReviewFinderPanel({
  kind,
  rows,
  focusedReviewRowId,
  onGoTo,
  onClose,
}: {
  kind: ReviewFinderKind;
  rows: WorkbookPreviewRow[];
  focusedReviewRowId: string | null;
  onGoTo: (row: WorkbookPreviewRow) => void;
  onClose: () => void;
}) {
  const title = reviewFinderTitle(kind);
  const emptyText = reviewFinderEmptyText(kind);

  return (
    <div className="fixed right-4 top-20 z-50 flex max-h-[min(620px,calc(100vh-6rem))] w-[min(460px,calc(100vw-2rem))] flex-col overflow-hidden rounded-md border bg-background shadow-2xl">
      <div className="flex items-start justify-between gap-3 border-b bg-muted/60 px-4 py-3">
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {rows.length.toLocaleString("en-US")} reviewed transactions
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onClose}
          title={`Close ${title}`}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="overflow-auto p-2">
          {rows.map((row, index) => {
            const rowId = previewRowDomId(row.account, row.txn);
            const isFocused = focusedReviewRowId === rowId;
            const label = row.txn.name || row.txn.memo || row.txn.transaction_type || "Transaction";
            const marker = formatReviewFinderMarker(kind, row);
            const suggested = formatReviewSuggestedTarget(
              row.suggestion ?? undefined,
              row.txn.account_review
            );
            const confidence = formatReviewConfidence(
              row.suggestion ?? undefined,
              row.txn.account_review
            );

            return (
              <button
                key={rowId}
                type="button"
                className={`group mb-2 w-full rounded-md border p-3 text-left text-foreground transition-colors hover:border-primary/40 hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  isFocused ? "border-primary bg-accent text-accent-foreground" : "bg-background"
                }`}
                onClick={() => onGoTo(row)}
                title={marker}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {index + 1}. {label}
                    </div>
                    <div className={`mt-1 truncate text-xs ${isFocused ? "text-accent-foreground/80" : "text-muted-foreground group-hover:text-accent-foreground/80"}`}>
                      {row.txn.entry_date || "-"} · {row.txn.transaction_type || "-"} · {formatAccountLabel(row.account)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-xs font-medium">
                    {formatMoney(row.txn.amount)}
                  </div>
                </div>
                <div className={`mt-2 truncate text-xs ${isFocused ? "text-accent-foreground/80" : "text-muted-foreground group-hover:text-accent-foreground/80"}`}>
                  {marker}
                </div>
                <div className={`mt-1 truncate text-xs ${isFocused ? "text-accent-foreground" : "text-blue-700 group-hover:text-accent-foreground dark:text-blue-300"}`}>
                  Suggested: {suggested}
                </div>
                <div className={`mt-1 text-xs font-medium ${isFocused ? "text-accent-foreground" : "text-foreground group-hover:text-accent-foreground"}`}>
                  Confidence: {confidence}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function reviewFinderTitle(kind: ReviewFinderKind) {
  if (kind === "quickbooks_rule") return "QB Rules finder";
  if (kind === "ai") return "AI Review finder";
  return "XGBoost finder";
}

function reviewFinderEmptyText(kind: ReviewFinderKind) {
  if (kind === "quickbooks_rule") {
    return "No QuickBooks rule-reviewed transactions are available in this preview.";
  }
  if (kind === "ai") {
    return "No AI-reviewed transactions are available in this preview.";
  }
  return "No XGBoost-reviewed transactions are available in this preview.";
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function ReviewStat({
  label,
  value,
  tone = "default",
  onClick,
  title,
}: {
  label: string;
  value: string;
  tone?: "default" | "ok" | "warning";
  onClick?: () => void;
  title?: string;
}) {
  const toneClass =
    tone === "ok"
      ? "text-green-600 dark:text-green-400"
      : tone === "warning"
      ? "text-red-600 dark:text-red-400"
      : "";
  const content = (
    <>
      <p className={`text-xs uppercase ${onClick ? "text-muted-foreground group-hover:text-accent-foreground/80" : "text-muted-foreground"}`}>{label}</p>
      <p className={`mt-1 text-lg font-semibold ${toneClass || (onClick ? "group-hover:text-accent-foreground" : "")}`}>{value}</p>
    </>
  );
  if (onClick) {
    return (
      <button
        type="button"
        className="group p-4 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={onClick}
        title={title}
      >
        {content}
      </button>
    );
  }
  return (
    <div className="p-4" title={title}>
      {content}
    </div>
  );
}

function ReviewAccountGroup({
  account,
  isFiltered,
  onFilter,
  suggestionByTransaction,
  focusedReviewRowId,
}: {
  account: ImportPreviewAccount;
  isFiltered: boolean;
  onFilter: () => void;
  suggestionByTransaction: Map<string, GLAccountSuggestion>;
  focusedReviewRowId?: string | null;
}) {
  const transactions = account.transactions ?? [];
  const closingBalance = getPreviewAccountClosingBalance(account);

  return (
    <div className="overflow-hidden rounded-md border bg-card text-card-foreground shadow-sm">
      <div className={`flex flex-col gap-3 border-b p-4 md:flex-row md:items-start md:justify-between ${isFiltered ? "bg-accent/60" : "bg-muted/40"}`}>
        <div>
          <h4 className="font-medium">{formatAccountLabel(account)}</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            {account.account_type || "Unknown account type"} · {formatDateRange(account)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Badge variant="secondary" className="bg-background text-muted-foreground">
            {account.line_count.toLocaleString("en-US")} lines
          </Badge>
          {account.bank_lines > 0 && (
            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-200 dark:hover:bg-green-950/40">
              {account.bank_lines.toLocaleString("en-US")} bank
            </Badge>
          )}
          <span className="font-semibold text-muted-foreground">Debit {formatMoney(account.debits)}</span>
          <span className="font-semibold text-muted-foreground">Credit {formatMoney(account.credits)}</span>
          <span className={`font-semibold ${Math.abs(account.net_amount) < 0.005 ? "text-muted-foreground" : account.net_amount > 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
            Net {formatMoney(account.net_amount)}
          </span>
          <ReviewBalanceStat label="Beginning" value={account.beginning_balance} />
          <ReviewBalanceStat label="Closing" value={closingBalance} />
          {!isFiltered && (
            <Button variant="outline" size="sm" onClick={onFilter}>Focus</Button>
          )}
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="p-6 text-sm text-center text-muted-foreground">No charges found.</div>
      ) : (
        <Table containerClassName="max-h-[420px]">
            <TableHeader className="sticky top-0 bg-muted/50 z-10 shadow-sm">
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Num</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Memo</TableHead>
                <TableHead>Current Target</TableHead>
                <TableHead>Suggested Target</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-muted/30 font-medium">
                <TableCell colSpan={10} className="text-right text-muted-foreground">Beginning Balance</TableCell>
                <TableCell className="text-right">{formatOptionalMoney(account.beginning_balance)}</TableCell>
                <TableCell />
              </TableRow>

              {transactions.map((txn) => {
                const suggestion = suggestionByTransaction.get(
                  suggestionKeyFromPreview(account, txn)
                );
                const previewReview = txn.account_review;
                const currentTargetTitle = formatReviewCurrentTarget(txn, suggestion, previewReview);
                const suggestedTargetTitle = formatReviewSuggestedTarget(suggestion, previewReview);
                const rowTitle = formatAccountReviewTransactionTitle(txn, suggestion, previewReview);
                const rowDomId = previewRowDomId(account, txn);
                const rowIsFocused = focusedReviewRowId === rowDomId;

                return (
                <TableRow
                  id={rowDomId}
                  key={txn.entry_id}
                  className={rowIsFocused ? "bg-accent ring-2 ring-inset ring-ring" : undefined}
                  title={rowTitle}
                >
                  <TableCell className="whitespace-nowrap" title={formatReviewText(txn.entry_date)}>{txn.entry_date || "-"}</TableCell>
                  <TableCell className="whitespace-nowrap" title={formatReviewText(txn.transaction_type)}>{txn.transaction_type || "-"}</TableCell>
                  <TableCell className="whitespace-nowrap" title={formatReviewText(txn.transaction_number)}>{txn.transaction_number || "-"}</TableCell>
                  <TableCell className="whitespace-nowrap" title={formatReviewText(txn.name)}>{txn.name || "-"}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={txn.memo || ""}>{txn.memo || "-"}</TableCell>
                  <TableCell className="min-w-[220px] max-w-[260px]" title={currentTargetTitle}>
                    <AccountValue
                      number={
                        suggestion?.current_target_account_number ??
                        previewReview?.current_target_account_number ??
                        txn.split_account_number
                      }
                      name={
                        suggestion?.current_target_account_name ??
                        previewReview?.current_target_account_name ??
                        txn.split_account_name
                      }
                      muted={!suggestion && !previewReview}
                    />
                  </TableCell>
                  <TableCell className="min-w-[220px] max-w-[280px]" title={suggestedTargetTitle}>
                    {suggestion ? (
                      <SuggestedAccountValue suggestion={suggestion} />
                    ) : previewReview?.suggested_account_number ? (
                      <div className="min-w-0">
                        <AccountValue
                          number={previewReview.suggested_account_number}
                          name={previewReview.suggested_account_name}
                        />
                        <ConfidenceValue review={previewReview} className="mt-1" />
                      </div>
                    ) : previewReview ? (
                      <div className="min-w-0">
                        <span className="text-muted-foreground">No change</span>
                        <ConfidenceValue review={previewReview} className="mt-1" />
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No change</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <ConfidenceValue
                      suggestion={suggestion}
                      review={previewReview}
                      compact
                    />
                  </TableCell>
                  <TableCell className="hidden" aria-hidden="true">
                    <AccountComparison
                      suggestion={suggestion ?? null}
                      fallbackNumber={txn.split_account_number}
                      fallbackName={txn.split_account_name}
                    />
                    {txn.split_account_number ? `${txn.split_account_number} · ${txn.split_account_name || ""}` : "-"}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap" title={formatOptionalMoney(txn.debit)}>{txn.debit ? formatMoney(txn.debit) : "-"}</TableCell>
                  <TableCell className="text-right whitespace-nowrap" title={formatOptionalMoney(txn.credit)}>{txn.credit ? formatMoney(txn.credit) : "-"}</TableCell>
                  <TableCell className="text-right whitespace-nowrap" title={formatOptionalMoney(txn.balance_after)}>{txn.balance_after == null ? "-" : formatMoney(txn.balance_after)}</TableCell>
                  <TableCell className="text-right" title={formatReviewMarker(suggestion, previewReview)}>
                    <ReviewStatusStack
                      suggestion={suggestion}
                      review={previewReview}
                    />
                  </TableCell>
                </TableRow>
                );
              })}

              <TableRow className="border-t-2 bg-muted/40 font-semibold">
                <TableCell colSpan={10} className="text-right text-muted-foreground">Closing Balance</TableCell>
                <TableCell className="text-right">{formatMoney(closingBalance)}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
        </Table>
      )}
    </div>
  );
}

function ReviewBalanceStat({ label, value }: { label: string; value: number | null }) {
  return (
    <span className="rounded-md bg-background border px-2 py-1 text-right text-xs text-muted-foreground">
      {label}: <span className="font-semibold text-foreground">{formatOptionalMoney(value)}</span>
    </span>
  );
}

function ManualField({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (value: string) => void; type?: "text" | "date" | "number"; }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Input type={type} step={type === "number" ? "0.01" : undefined} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function formatMoney(value: number) {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatOptionalMoney(value: number | null | undefined) {
  return value == null ? "-" : formatMoney(value);
}

function estimateGeminiChunkCount(rowCount: number) {
  return Math.max(1, Math.ceil(rowCount / GEMINI_ROWS_PER_REQUEST));
}

function formatAccountReviewProgress(progress: AccountReviewProgress) {
  return `Gemini chunk ${progress.current.toLocaleString("en-US")} of ${progress.total.toLocaleString("en-US")}`;
}

function applySuggestionKey(suggestion: Pick<GLAccountSuggestion, "row_number" | "target_field">) {
  return `${suggestion.row_number}-${suggestion.target_field || "split_account"}`;
}

function countChangedSuggestions(suggestions: GLAccountSuggestion[]) {
  return suggestions.filter((suggestion) => {
    const suggestedCode = getVisibleSuggestedTargetNumber(suggestion);
    const currentCode = suggestion.current_target_account_number;
    return Boolean(suggestedCode && suggestedCode !== currentCode);
  }).length;
}

function getGeminiReviewedRowNumbers(
  aiReview: GLAccountSuggestionsResponse["ai_review"]
) {
  const rowNumbers =
    aiReview?.reviewed_row_numbers?.length
      ? aiReview.reviewed_row_numbers
      : aiReview?.suggestions.map((suggestion) => suggestion.row_number) ?? [];

  return Array.from(
    new Set(
      rowNumbers
        .map((rowNumber) => Number(rowNumber))
        .filter((rowNumber) => Number.isFinite(rowNumber) && rowNumber > 0)
    )
  ).sort((a, b) => a - b);
}

function formatRowNumberRanges(rowNumbers: number[]) {
  if (rowNumbers.length === 0) return "";

  const ranges: string[] = [];
  let start = rowNumbers[0];
  let end = rowNumbers[0];

  for (const rowNumber of rowNumbers.slice(1)) {
    if (rowNumber === end + 1) {
      end = rowNumber;
      continue;
    }

    ranges.push(start === end ? String(start) : `${start}-${end}`);
    start = rowNumber;
    end = rowNumber;
  }

  ranges.push(start === end ? String(start) : `${start}-${end}`);
  return ranges.join(", ");
}

function logGeminiReviewIssues(
  response: GLAccountSuggestionsResponse,
  context: AccountReviewLogContext
) {
  if (!context.useGemini) return [];

  const issues = getGeminiReviewIssueMessages(response);
  if (issues.length === 0) return issues;

  console.info("[GL Upload] Gemini AI review notice.", {
    ...context,
    tokenOrQuotaLimitLikely: issues.some(isTokenOrQuotaLimitMessage),
    firstIssue: issues[0] ?? null,
    issueCount: issues.length,
    issues,
    aiReview: response.ai_review ?? null,
  });

  return issues;
}

function logGeminiReviewRequestFailure(error: unknown, context: AccountReviewLogContext) {
  if (!context.useGemini) return;

  const message = getUnknownErrorMessage(error);
  console.error("[GL Upload] Gemini AI review request failed.", {
    ...context,
    tokenOrQuotaLimitLikely: isTokenOrQuotaLimitMessage(message),
    message,
    error,
  });
}

function getGeminiReviewIssueMessages(response: GLAccountSuggestionsResponse) {
  const aiReview = response.ai_review;
  if (!aiReview) return ["Gemini review metadata was missing from the response"];

  const issues: string[] = [];
  if (!aiReview.available) {
    issues.push("Gemini review was unavailable");
  }
  if (aiReview.error) {
    issues.push(aiReview.error);
  }

  for (const chunk of aiReview.chunks ?? []) {
    if (chunk.error) {
      issues.push(`Rows ${chunk.start_row}-${chunk.end_row}: ${chunk.error}`);
    }
  }

  if (aiReview.escalation?.error) {
    issues.push(`Escalation ${aiReview.escalation.model}: ${aiReview.escalation.error}`);
  }

  for (const chunk of aiReview.escalation?.chunks ?? []) {
    if (chunk.error) {
      issues.push(`Escalation rows ${chunk.start_row}-${chunk.end_row}: ${chunk.error}`);
    }
  }

  return issues;
}

function formatGeminiReviewIssueNotice(issues: string[]) {
  const firstIssue = issues[0] ?? "Unknown Gemini review failure";
  const quotaHint = issues.some(isTokenOrQuotaLimitMessage)
    ? " This looks like a token, quota, or rate-limit issue."
    : "";
  return `Gemini review did not finish: ${firstIssue}${quotaHint} The GL upload was still staged.`;
}

function isTokenOrQuotaLimitMessage(message: string) {
  const normalized = message.toLowerCase();
  return [
    "out of tokens",
    "token",
    "quota",
    "rate limit",
    "resource_exhausted",
    "exhausted",
    "too many requests",
    "429",
    "context length",
    "maximum context",
  ].some((needle) => normalized.includes(needle));
}

function getUnknownErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return "Unknown error";
  }
}

function formatCheckValue(check: string, value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  const lower = check.toLowerCase();
  if (lower.includes("debit") || lower.includes("credit")) {
    return formatMoney(value);
  }
  return value.toLocaleString("en-US");
}

function formatAccountLabel(account: ImportPreviewAccount) {
  if (account.account_number) return `${account.account_number} - ${account.account_name}`;
  return account.account_name;
}

function formatDateRange(account: ImportPreviewAccount) {
  if (account.first_date && account.last_date) {
    if (account.first_date === account.last_date) return account.first_date;
    return `${account.first_date} to ${account.last_date}`;
  }
  return account.first_date || account.last_date || "-";
}

function getPreviewAccountClosingBalance(account: ImportPreviewAccount) {
  const lastWithBalance = [...(account.transactions ?? [])].reverse().find((txn) => txn.balance_after != null);
  if (lastWithBalance?.balance_after != null) return lastWithBalance.balance_after;
  if (account.beginning_balance != null) return account.beginning_balance + account.net_amount;
  return account.net_amount;
}

function AccountSuggestionReview({
  suggestions,
  response,
  isLoading,
  progressLabel,
  error,
  onApplySuggestedTarget,
  onUnapplySuggestedTarget,
  applyingSuggestionKey,
  appliedSuggestionRows,
}: {
  suggestions: GLAccountSuggestion[];
  response: GLAccountSuggestionsResponse | null;
  isLoading: boolean;
  progressLabel?: string | null;
  error: string | null;
  onApplySuggestedTarget?: (suggestion: GLAccountSuggestion) => void;
  onUnapplySuggestedTarget?: (suggestion: GLAccountSuggestion) => void;
  applyingSuggestionKey?: string | null;
  appliedSuggestionRows?: Set<number>;
}) {
  const previewRows = suggestions;
  const modelLoaded = response?.xgboost_model_status?.model_loaded;
  const aiReview = response?.ai_review;
  const geminiReviewedRowNumbers = useMemo(
    () => getGeminiReviewedRowNumbers(aiReview),
    [aiReview]
  );
  const geminiReviewedRowSet = useMemo(
    () => new Set(geminiReviewedRowNumbers),
    [geminiReviewedRowNumbers]
  );
  const geminiReviewedRowsLabel = formatRowNumberRanges(geminiReviewedRowNumbers);
  const forcedManualReviewRowNumber =
    aiReview?.test_forced_manual_review_row_number ?? null;
  const emptyCurrentTargetRowNumber =
    aiReview?.test_empty_current_target_row_number ?? null;
  const emptyCurrentTargetSuggestionLabel = formatSuggestionAccount(
    aiReview?.test_empty_current_target_suggested_account_number ?? null,
    aiReview?.test_empty_current_target_suggested_account_name ?? null
  );
  const emptyCurrentTargetMemo = aiReview?.test_empty_current_target_memo ?? null;
  const aiReviewLabel = aiReview
    ? `Gemini AI ${aiReview.model} ${aiReview.suggestion_count.toLocaleString("en-US")}/${aiReview.reviewed_row_count.toLocaleString("en-US")}${
        aiReview.escalation
          ? ` + ${aiReview.escalation.model} ${aiReview.escalation.reviewed_row_count.toLocaleString("en-US")}`
          : ""
      }`
    : null;
  if (!response && !isLoading && !error) {
    return null;
  }

  return (
    <div className="border-b p-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-medium">
            <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-300" />
            Account Review
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {response
              ? `${response.suggestion_count.toLocaleString("en-US")} reviewed rows from ${response.transaction_count.toLocaleString("en-US")} parsed transactions`
              : "Reviewing imported rows against the shared chart of accounts"}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Badge variant={modelLoaded ? "outline" : "secondary"}>
            {modelLoaded ? "XGBoost loaded" : "XGBoost not loaded"}
          </Badge>
          {aiReview?.max_rows != null && (
            <Badge variant="secondary">
              Gemini AI test cap: {aiReview.max_rows.toLocaleString("en-US")} rows
            </Badge>
          )}
          {aiReview?.model && aiReview?.max_rows != null && (
            <Badge variant="outline">
              Test model: {aiReview.model}
            </Badge>
          )}
          {aiReview && aiReview.google_search_enabled === false && (
            <Badge variant="secondary">Search grounding off</Badge>
          )}
          {aiReviewLabel && (
            <Badge variant={aiReview?.error ? "destructive" : "outline"}>
              {aiReviewLabel}
            </Badge>
          )}
          {response && (
            <Badge variant={response.manual_review_count > 0 ? "destructive" : "outline"}>
              {response.manual_review_count.toLocaleString("en-US")} manual
            </Badge>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-400/40 dark:bg-amber-950/40 dark:text-amber-200">
          {error}
        </div>
      )}

      {aiReview?.error && (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-400/40 dark:bg-amber-950/40 dark:text-amber-200">
          Gemini review did not finish: {aiReview.error}
        </div>
      )}

      {aiReview?.scope_note && (
        <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-400/40 dark:bg-blue-950/40 dark:text-blue-200">
          {aiReview.scope_note}
        </div>
      )}

      {geminiReviewedRowsLabel && (
        <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-400/40 dark:bg-blue-950/40 dark:text-blue-200">
          <div className="font-medium">Gemini AI test rows reviewed</div>
          <div className="mt-1 font-mono text-xs">{geminiReviewedRowsLabel}</div>
        </div>
      )}

      {aiReview?.test_forced_manual_review_enabled && forcedManualReviewRowNumber && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-400/40 dark:bg-red-950/40 dark:text-red-200">
          <div className="font-medium">Gemini AI suggested manual review</div>
          <div className="mt-1">
            Test row {forcedManualReviewRowNumber} was forced to Manual review so this path can be tested.
          </div>
        </div>
      )}

      {aiReview?.test_empty_current_target_suggestion_enabled && emptyCurrentTargetRowNumber && (
        <div className="mb-3 rounded-md border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800 dark:border-violet-400/40 dark:bg-violet-950/40 dark:text-violet-200">
          <div className="font-medium">Gemini AI suggested an account from memo with blank transaction Name</div>
          <div className="mt-1">
            Test row {emptyCurrentTargetRowNumber} has a blank transaction Name/payee and an empty current target. Gemini AI suggests {emptyCurrentTargetSuggestionLabel} from the memo/account context, but still requires manual review.
          </div>
          {emptyCurrentTargetMemo && (
            <div className="mt-1 truncate font-mono text-xs" title={emptyCurrentTargetMemo}>
              Memo: {emptyCurrentTargetMemo}
            </div>
          )}
        </div>
      )}

      {aiReview && !aiReview.error && aiReview.reviewed_row_count === 0 && (
        <div className="mb-3 rounded-md border border-muted bg-muted/30 p-3 text-sm text-muted-foreground">
          Gemini had no parsed rows to review.
        </div>
      )}

      {isLoading && (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {progressLabel ?? "Reviewing account suggestions..."}
        </div>
      )}

      {!isLoading && !error && response && suggestions.length === 0 && (
        <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          No account corrections were flagged.
        </div>
      )}

      {!isLoading && previewRows.length > 0 && (
        <Table containerClassName="max-h-[520px] rounded-md border">
            <TableHeader className="sticky top-0 z-10 bg-muted/50 shadow-sm">
              <TableRow>
                <TableHead>Row</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead>Description / Memo</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Current Target</TableHead>
                <TableHead>Suggested Target</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((suggestion) => {
                const transactionTitle = formatSuggestionTransactionTitle(suggestion);
                const descriptionTitle = formatReviewText(suggestion.memo || suggestion.name);
                const currentTargetTitle = formatSuggestionAccount(
                  suggestion.current_target_account_number,
                  suggestion.current_target_account_name
                );
                const suggestedTargetTitle = formatSuggestionLabel(suggestion);
                const rowTitle = formatAccountSuggestionTitle(suggestion);
                const wasGeminiReviewed = geminiReviewedRowSet.has(suggestion.row_number);
                const hasXgboostSuggestion = isXgboostSuggestion(suggestion);
                const hasPlainSuggestion = Boolean(
                  isMarkedSuggestedChange(suggestion) &&
                    !hasXgboostSuggestion &&
                    !isGeminiSuggestion(suggestion)
                );
                const wasAiSuggestedManualReview = Boolean(
                  suggestion.row_number === forcedManualReviewRowNumber ||
                    (suggestion.rule === "gemini_ai_review_manual" &&
                      suggestion.ai_provider === "gemini")
                );
                const wasEmptyTargetManualSuggestion = Boolean(
                  suggestion.row_number === emptyCurrentTargetRowNumber ||
                    (suggestion.rule === "gemini_ai_review_needs_manual" &&
                      suggestion.ai_provider === "gemini" &&
                      !suggestion.current_target_account_number)
                );
                const isApplied = Boolean(appliedSuggestionRows?.has(suggestion.row_number));
                const visibleSuggestedTargetNumber = getVisibleSuggestedTargetNumber(suggestion);
                const canApplySuggestedTarget = Boolean(
                  onApplySuggestedTarget &&
                    visibleSuggestedTargetNumber &&
                    visibleSuggestedTargetNumber !== "MANUAL_REVIEW" &&
                    !isNoChangeSuggestion(suggestion) &&
                    !isApplied
                );
                const canUnapplySuggestedTarget = Boolean(
                  onUnapplySuggestedTarget && isApplied
                );
                const suggestionKey = applySuggestionKey(suggestion);
                const isApplying = applyingSuggestionKey === suggestionKey;
                const actionLabel = isApplied ? "Unapply" : "Apply";
                const busyActionLabel = isApplied ? "Unapplying" : "Applying";

                return (
                <TableRow key={`${suggestion.row_number}-${suggestion.target_field}`} title={rowTitle}>
                  <TableCell className="whitespace-nowrap font-medium" title={`Row ${suggestion.row_number}`}>
                    <div>{suggestion.row_number}</div>
                    {wasGeminiReviewed && (
                      <Badge variant="outline" className="mt-1 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/40 dark:bg-blue-950/40 dark:text-blue-200">
                        Gemini AI test
                      </Badge>
                    )}
                    {wasAiSuggestedManualReview && (
                      <Badge variant="outline" className="mt-1 border-red-200 bg-red-50 text-red-700 dark:border-red-400/40 dark:bg-red-950/40 dark:text-red-200">
                        AI manual review
                      </Badge>
                    )}
                    {wasEmptyTargetManualSuggestion && (
                      <Badge variant="outline" className="mt-1 border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-400/40 dark:bg-violet-950/40 dark:text-violet-200">
                        Blank Name + memo
                      </Badge>
                    )}
                    {hasXgboostSuggestion && (
                      <Badge variant="outline" className="mt-1 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/40 dark:bg-blue-950/40 dark:text-blue-200">
                        {suggestion.review_label || "XGBoosted"}
                      </Badge>
                    )}
                    {hasPlainSuggestion && (
                      <Badge variant="outline" className="mt-1 border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/40 dark:bg-emerald-950/40 dark:text-emerald-200">
                        {suggestion.review_label || "Suggested"}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[260px]" title={transactionTitle}>
                    <div className="truncate" title={transactionTitle}>
                      {suggestion.name || suggestion.memo || suggestion.transaction_type || "-"}
                    </div>
                    <div className="text-xs text-muted-foreground" title={transactionTitle}>
                      {suggestion.date || "-"} · {suggestion.transaction_type || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[360px]" title={descriptionTitle}>
                    <div
                      className="truncate text-sm"
                      title={descriptionTitle}
                    >
                      {suggestion.memo || suggestion.name || "-"}
                    </div>
                    {suggestion.transaction_number && (
                      <div className="mt-1 text-xs text-muted-foreground" title={formatReviewText(suggestion.transaction_number)}>
                        Num {suggestion.transaction_number}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap font-medium" title={formatMoney(suggestion.amount)}>
                    {formatMoney(suggestion.amount)}
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate" title={currentTargetTitle}>
                    {currentTargetTitle}
                  </TableCell>
                  <TableCell className="max-w-[260px]" title={suggestedTargetTitle}>
                    <div className="truncate" title={suggestedTargetTitle}>
                      {suggestedTargetTitle}
                    </div>
                    {wasAiSuggestedManualReview && (
                      <div className="mt-1 text-xs font-medium text-red-700 dark:text-red-300">
                        Gemini AI suggested manual review
                      </div>
                    )}
                    {wasEmptyTargetManualSuggestion && (
                      <div className="mt-1 text-xs font-medium text-violet-700 dark:text-violet-300">
                        Gemini AI used memo/account context; manual review required
                      </div>
                    )}
                    {suggestion.ai_provider && (
                      <div className="mt-1 text-xs text-muted-foreground" title={formatAiReviewTitle(suggestion)}>
                        {suggestion.ai_provider} {formatPercent(suggestion.ai_confidence ?? 0)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <ConfidenceValue suggestion={suggestion} compact />
                  </TableCell>
                  <TableCell className="text-right" title={formatReviewMarker(suggestion)}>
                    <ReviewStatusStack suggestion={suggestion} />
                    {isApplied && (
                      <Badge variant="outline" className="mt-1 border-green-600 bg-green-50 text-green-700 dark:border-green-400/40 dark:bg-green-950/40 dark:text-green-200">
                        Applied
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={
                        isApplying ||
                        (!canApplySuggestedTarget && !canUnapplySuggestedTarget)
                      }
                      onClick={() =>
                        isApplied
                          ? onUnapplySuggestedTarget?.(suggestion)
                          : onApplySuggestedTarget?.(suggestion)
                      }
                      title={
                        canUnapplySuggestedTarget
                          ? "Undo applied target on staged import"
                          : canApplySuggestedTarget
                            ? "Apply suggested target to staged import"
                            : suggestedTargetTitle
                      }
                    >
                      {isApplied ? (
                        <RotateCcw className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      {isApplying ? busyActionLabel : actionLabel}
                    </Button>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
        </Table>
      )}
    </div>
  );
}

function DraggableWorkbookPreview({
  open,
  filename,
  rows,
  onClose,
}: {
  open: boolean;
  filename: string;
  rows: WorkbookPreviewRow[];
  onClose: () => void;
}) {
  const [position, setPosition] = useState({ x: 32, y: 96 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!open) return;
    const width = Math.min(1100, window.innerWidth - 32);
    setPosition({
      x: Math.max(16, Math.round((window.innerWidth - width) / 2)),
      y: 88,
    });
  }, [open]);

  useEffect(() => {
    if (!isDragging) return;

    function handleMove(event: PointerEvent) {
      const panelWidth = Math.min(1100, window.innerWidth - 32);
      const panelHeight = Math.min(720, window.innerHeight - 32);
      setPosition({
        x: clamp(event.clientX - dragOffset.current.x, 16, window.innerWidth - panelWidth - 16),
        y: clamp(event.clientY - dragOffset.current.y, 16, window.innerHeight - panelHeight - 16),
      });
    }

    function handleUp() {
      setIsDragging(false);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [isDragging]);

  if (!open) return null;

  return (
    <div
      className="fixed z-50 flex max-h-[calc(100vh-2rem)] w-[min(1100px,calc(100vw-2rem))] flex-col overflow-hidden rounded-md border bg-background shadow-2xl"
      style={{ left: position.x, top: position.y }}
    >
      <div
        className="flex cursor-move items-center justify-between gap-3 border-b bg-muted/60 px-4 py-3"
        onPointerDown={(event) => {
          const rect = event.currentTarget.parentElement?.getBoundingClientRect();
          dragOffset.current = {
            x: event.clientX - (rect?.left ?? position.x),
            y: event.clientY - (rect?.top ?? position.y),
          };
          setIsDragging(true);
        }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Move className="h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{filename}</p>
            <p className="text-xs text-muted-foreground">
              {rows.length.toLocaleString("en-US")} workbook rows
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <Table containerClassName="overflow-auto">
          <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Memo</TableHead>
              <TableHead>Current Target</TableHead>
              <TableHead>Suggested Target</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Confidence</TableHead>
              <TableHead className="text-right">Review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 500).map((row) => (
              <TableRow
                key={`${row.account.account_key}-${row.txn.entry_id}`}
                title={formatAccountReviewTransactionTitle(
                  row.txn,
                  row.suggestion ?? undefined,
                  row.txn.account_review
                )}
              >
                <TableCell className="whitespace-nowrap">{row.txn.entry_date || "-"}</TableCell>
                <TableCell className="max-w-[220px] truncate">
                  {formatAccountLabel(row.account)}
                </TableCell>
                <TableCell className="whitespace-nowrap">{row.txn.transaction_type || "-"}</TableCell>
                <TableCell className="max-w-[220px] truncate" title={row.txn.name || ""}>
                  {row.txn.name || "-"}
                </TableCell>
                <TableCell className="max-w-[260px] truncate" title={row.txn.memo || ""}>
                  {row.txn.memo || "-"}
                </TableCell>
                <TableCell className="min-w-[220px] max-w-[260px]">
                  <AccountValue
                    number={
                      row.suggestion?.current_target_account_number ??
                      row.txn.account_review?.current_target_account_number ??
                      row.txn.split_account_number
                    }
                    name={
                      row.suggestion?.current_target_account_name ??
                      row.txn.account_review?.current_target_account_name ??
                      row.txn.split_account_name
                    }
                    muted={!row.suggestion && !row.txn.account_review}
                  />
                </TableCell>
                <TableCell className="min-w-[220px] max-w-[280px]">
                  {row.suggestion ? (
                    <SuggestedAccountValue suggestion={row.suggestion} />
                  ) : row.txn.account_review?.suggested_account_number ? (
                    <div className="min-w-0">
                      <AccountValue
                        number={row.txn.account_review.suggested_account_number}
                        name={row.txn.account_review.suggested_account_name}
                      />
                      <ConfidenceValue review={row.txn.account_review} className="mt-1" />
                    </div>
                  ) : row.txn.account_review ? (
                    <div className="min-w-0">
                      <span className="text-muted-foreground">No change</span>
                      <ConfidenceValue review={row.txn.account_review} className="mt-1" />
                    </div>
                  ) : (
                    <span className="text-muted-foreground">No change</span>
                  )}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {formatMoney(row.txn.amount)}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <ConfidenceValue
                    suggestion={row.suggestion ?? undefined}
                    review={row.txn.account_review}
                    compact
                  />
                </TableCell>
                <TableCell
                  className="text-right"
                  title={formatReviewMarker(
                    row.suggestion ?? undefined,
                    row.txn.account_review
                  )}
                >
                  <ReviewStatusStack
                    suggestion={row.suggestion ?? undefined}
                    review={row.txn.account_review}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
      </Table>
    </div>
  );
}

function AccountComparison({
  suggestion,
  fallbackNumber,
  fallbackName,
}: {
  suggestion: GLAccountSuggestion | null;
  fallbackNumber: string | null;
  fallbackName: string | null;
}) {
  return (
    <div className="space-y-1 text-sm">
      <div className="flex min-w-0 items-start gap-2">
        <span className="w-16 shrink-0 text-xs font-medium uppercase text-muted-foreground">
          Current
        </span>
        <AccountValue
          number={suggestion?.current_target_account_number ?? fallbackNumber}
          name={suggestion?.current_target_account_name ?? fallbackName}
          muted={!suggestion}
        />
      </div>
      <div className="flex min-w-0 items-start gap-2">
        <span className="w-16 shrink-0 text-xs font-medium uppercase text-muted-foreground">
          Suggested
        </span>
        {suggestion ? (
          <SuggestedAccountValue suggestion={suggestion} />
        ) : (
          <span className="text-muted-foreground">No change</span>
        )}
      </div>
    </div>
  );
}

function AccountValue({
  number,
  name,
  muted = false,
}: {
  number: string | null;
  name: string | null;
  muted?: boolean;
}) {
  return (
    <span
      className={`min-w-0 truncate ${muted ? "text-muted-foreground" : "text-foreground"}`}
      title={formatSuggestionAccount(number, name)}
    >
      {formatSuggestionAccount(number, name)}
    </span>
  );
}

function SuggestedAccountValue({
  suggestion,
}: {
  suggestion: GLAccountSuggestion;
}) {
  const suggestedNumber = getVisibleSuggestedTargetNumber(suggestion);
  const suggestedName = getVisibleSuggestedTargetName(suggestion);

  if (suggestion.requires_manual_review && !suggestedNumber) {
    return (
      <div className="min-w-0">
        <span className="font-medium text-red-700 dark:text-red-300">Manual review</span>
        <ConfidenceValue suggestion={suggestion} className="mt-1" />
      </div>
    );
  }
  if (isNoChangeSuggestion(suggestion)) {
    return (
      <div className="min-w-0">
        <span className="text-muted-foreground">No change</span>
        <ConfidenceValue suggestion={suggestion} className="mt-1" />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <span
        className="block min-w-0 truncate font-medium text-blue-700 dark:text-blue-300"
        title={formatSuggestionAccount(
          suggestedNumber,
          suggestedName
        )}
      >
        {formatSuggestionAccount(
          suggestedNumber,
          suggestedName
        )}
      </span>
      <ConfidenceValue suggestion={suggestion} className="mt-1" />
    </div>
  );
}

function ConfidenceValue({
  suggestion,
  review,
  compact = false,
  className = "",
}: {
  suggestion?: GLAccountSuggestion | null;
  review?: ImportPreviewAccountReview | null;
  compact?: boolean;
  className?: string;
}) {
  const confidence = formatReviewConfidence(suggestion ?? undefined, review ?? undefined);
  if (confidence === "-") {
    return (
      <span className={`text-muted-foreground ${className}`} title="No confidence score available">
        -
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center rounded-sm border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium text-foreground ${className}`}
      title={formatReviewConfidenceTitle(suggestion ?? undefined, review ?? undefined)}
    >
      {compact ? confidence : `Confidence ${confidence}`}
    </span>
  );
}

function ReviewStatusStack({
  suggestion,
  review,
}: {
  suggestion?: GLAccountSuggestion | null;
  review?: ImportPreviewAccountReview | null;
}) {
  const visibleReview =
    review && review.source !== "not_bank_transaction" ? review : null;
  const status = formatReviewMarker(suggestion ?? undefined, visibleReview);
  const hasReviewStatus = Boolean(suggestion || visibleReview);

  if (!hasReviewStatus) {
    return <span className="text-muted-foreground">-</span>;
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-1">
        {suggestion && <SuggestionBadge suggestion={suggestion} />}
        {visibleReview && <PreviewReviewBadge review={visibleReview} />}
      </div>
      {status !== "-" && (
        <div className="max-w-[220px] text-right text-[11px] leading-tight text-muted-foreground">
          {status}
        </div>
      )}
      <ConfidenceValue suggestion={suggestion} review={visibleReview} />
    </div>
  );
}

function SuggestionBadge({ suggestion }: { suggestion: GLAccountSuggestion }) {
  const hasGeminiSuggestion =
    isGeminiSuggestion(suggestion) && Boolean(getVisibleSuggestedTargetNumber(suggestion));
  const hasXgboostSuggestion = isXgboostSuggestion(suggestion);
  const hasPlainSuggestion = Boolean(
    isMarkedSuggestedChange(suggestion) &&
      !hasXgboostSuggestion &&
      !isGeminiSuggestion(suggestion)
  );

  if (
    suggestion.requires_manual_review &&
    isGeminiSuggestion(suggestion) &&
    suggestion.rule === "gemini_ai_review_manual"
  ) {
    return <Badge variant="destructive">Gemini manual review</Badge>;
  }
  if (suggestion.requires_manual_review && hasGeminiSuggestion) {
    return <Badge className="bg-violet-600 text-white hover:bg-violet-600 dark:bg-violet-500 dark:text-violet-950 dark:hover:bg-violet-500">Gemini manual suggestion</Badge>;
  }
  if (hasXgboostSuggestion) {
    return (
      <Badge className="bg-blue-600 text-white hover:bg-blue-600 dark:bg-blue-500 dark:text-blue-950 dark:hover:bg-blue-500">
        {shouldUseXgboostFallbackSuggestion(suggestion)
          ? "XGBoost suggested"
          : suggestion.review_label || "XGBoosted"}
      </Badge>
    );
  }
  if (suggestion.requires_manual_review) {
    return <Badge variant="destructive">Review</Badge>;
  }
  if (isGeminiSuggestion(suggestion)) {
    return <Badge className="bg-violet-600 text-white hover:bg-violet-600 dark:bg-violet-500 dark:text-violet-950 dark:hover:bg-violet-500">Gemini</Badge>;
  }
  if (hasPlainSuggestion || getVisibleSuggestedTargetNumber(suggestion)) {
    return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-500">{suggestion.review_label || "Suggested"}</Badge>;
  }
  return <Badge variant="outline">Checked</Badge>;
}

function isNoChangeSuggestion(suggestion: GLAccountSuggestion) {
  if (shouldUseXgboostFallbackSuggestion(suggestion)) return false;
  const suggestedNumber = getVisibleSuggestedTargetNumber(suggestion);

  return (
    suggestion.rule === "keep_current" ||
    suggestion.rule === "gemini_ai_no_change" ||
    Boolean(
      suggestedNumber &&
        suggestion.current_target_account_number &&
        suggestedNumber === suggestion.current_target_account_number
    )
  );
}

function isMarkedSuggestedChange(suggestion: GLAccountSuggestion) {
  const suggestedNumber = getVisibleSuggestedTargetNumber(suggestion);
  if (shouldUseXgboostFallbackSuggestion(suggestion)) {
    return Boolean(
      suggestedNumber &&
        suggestedNumber !== "MANUAL_REVIEW" &&
        suggestedNumber !== suggestion.current_target_account_number
    );
  }

  if (suggestion.is_suggested_change != null) return suggestion.is_suggested_change;

  return Boolean(
    suggestedNumber &&
      suggestedNumber !== "MANUAL_REVIEW" &&
      suggestion.current_target_account_number &&
      suggestedNumber !== suggestion.current_target_account_number
  );
}

function PreviewReviewBadge({ review }: { review: ImportPreviewAccountReview }) {
  if (review.source === "xgboost") {
    return <Badge className="bg-blue-600 text-white hover:bg-blue-600 dark:bg-blue-500 dark:text-blue-950 dark:hover:bg-blue-500">XGBoost</Badge>;
  }
  if (review.requires_human_review) {
    return <Badge variant="destructive">Review</Badge>;
  }
  if (review.requires_ai_review) {
    return <Badge className="bg-violet-600 text-white hover:bg-violet-600 dark:bg-violet-500 dark:text-violet-950 dark:hover:bg-violet-500">AI review</Badge>;
  }
  if (review.source === "quickbooks_rule") {
    return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-500">QB Rule</Badge>;
  }
  if (review.categorized) {
    return <Badge variant="outline">Checked</Badge>;
  }
  return <Badge variant="secondary">Review</Badge>;
}

function suggestionKeyFromSuggestion(suggestion: GLAccountSuggestion) {
  return transactionSuggestionKey({
    ledgerAccountNumber: suggestion.ledger_account_number,
    splitAccountNumber: suggestion.current_split_account_number,
    date: suggestion.date,
    transactionType: suggestion.transaction_type,
    transactionNumber: suggestion.transaction_number,
    name: suggestion.name,
    memo: suggestion.memo,
    amount: suggestion.amount,
  });
}

function suggestionKeyFromPreview(
  account: ImportPreviewAccount,
  txn: ImportPreviewAccountTransaction
) {
  return transactionSuggestionKey({
    ledgerAccountNumber: account.account_number,
    splitAccountNumber: txn.split_account_number,
    date: txn.entry_date,
    transactionType: txn.transaction_type,
    transactionNumber: txn.transaction_number,
    name: txn.name,
    memo: txn.memo,
    amount: txn.amount,
  });
}

function transactionSuggestionKey(parts: {
  ledgerAccountNumber: string | null;
  splitAccountNumber: string | null;
  date: string | null;
  transactionType: string | null;
  transactionNumber: string | null;
  name: string | null;
  memo: string | null;
  amount: number;
}) {
  return [
    parts.ledgerAccountNumber,
    parts.splitAccountNumber,
    parts.date,
    parts.transactionType,
    parts.transactionNumber,
    parts.name,
    parts.memo,
    parts.amount.toFixed(2),
  ]
    .map((part) => String(part ?? "").trim().toLowerCase())
    .join("|");
}

function isWorkbookXgboostReviewRow(row: WorkbookPreviewRow) {
  return (
    (row.suggestion ? isXgboostSuggestion(row.suggestion) : false) ||
    row.txn.account_review?.source === "xgboost"
  );
}

function isWorkbookQuickBooksRuleReviewRow(row: WorkbookPreviewRow) {
  return row.txn.account_review?.source === "quickbooks_rule";
}

function isWorkbookAiReviewRow(row: WorkbookPreviewRow) {
  return Boolean(
    (row.suggestion &&
      (isGeminiSuggestion(row.suggestion) || row.suggestion.ai_provider)) ||
      row.txn.account_review?.requires_ai_review ||
      row.txn.account_review?.source === "gemini" ||
      row.txn.account_review?.source === "ai"
  );
}

function formatReviewFinderMarker(kind: ReviewFinderKind, row: WorkbookPreviewRow) {
  const review = row.txn.account_review;
  if (kind === "quickbooks_rule" && review?.source === "quickbooks_rule") {
    return `review_source: ${review.source} | review_status: ${review.status}`;
  }
  if (kind === "ai") {
    if (row.suggestion && (isGeminiSuggestion(row.suggestion) || row.suggestion.ai_provider)) {
      return formatReviewMarker(row.suggestion, null);
    }
    if (review && review.source !== "not_bank_transaction") {
      return `review_source: ${review.source} | review_status: ${review.status}`;
    }
  }
  if (kind === "xgboost" && review?.source === "xgboost") {
    return `review_source: ${review.source} | review_status: ${review.status}`;
  }
  return formatReviewMarker(row.suggestion ?? undefined, review);
}

function previewRowDomId(
  account: ImportPreviewAccount,
  txn: ImportPreviewAccountTransaction
) {
  return `gl-review-row-${account.account_key}-${txn.entry_id}`.replace(
    /[^A-Za-z0-9_-]/g,
    "-"
  );
}

function formatSuggestionAccount(number: string | null, name: string | null) {
  if (number && name) return `${number} · ${name}`;
  return number || name || "-";
}

function shouldUseXgboostFallbackSuggestion(suggestion: GLAccountSuggestion) {
  const xgboostCode = suggestion.xgboost_suggested_account_number?.trim();
  if (!xgboostCode || xgboostCode === "MANUAL_REVIEW") return false;

  const visibleCode = suggestion.suggested_target_account_number?.trim();
  if (!visibleCode || visibleCode === "MANUAL_REVIEW") return true;
  if (visibleCode === xgboostCode) return false;

  return (
    suggestion.rule === "keep_current" ||
    suggestion.rule === "missing_split" ||
    suggestion.rule === "unknown_current_split" ||
    suggestion.rule === "needs_ai_review" ||
    suggestion.rule.endsWith("_xgboost_candidate")
  );
}

function getVisibleSuggestedTargetNumber(suggestion: GLAccountSuggestion) {
  return shouldUseXgboostFallbackSuggestion(suggestion)
    ? suggestion.xgboost_suggested_account_number
    : suggestion.suggested_target_account_number;
}

function getVisibleSuggestedTargetName(suggestion: GLAccountSuggestion) {
  return shouldUseXgboostFallbackSuggestion(suggestion)
    ? suggestion.xgboost_suggested_account_name
    : suggestion.suggested_target_account_name;
}

function formatSuggestionLabel(suggestion: GLAccountSuggestion) {
  const suggestedNumber = getVisibleSuggestedTargetNumber(suggestion);
  const suggestedName = getVisibleSuggestedTargetName(suggestion);

  if (suggestion.requires_manual_review && !suggestedNumber) {
    return "Manual review";
  }
  if (isNoChangeSuggestion(suggestion)) return "No change";
  return formatSuggestionAccount(
    suggestedNumber,
    suggestedName
  );
}

function formatReviewText(value: string | number | null | undefined) {
  if (value == null) return "-";
  const text = String(value).trim();
  return text || "-";
}

function formatReviewCurrentTarget(
  txn: ImportPreviewAccountTransaction,
  suggestion?: GLAccountSuggestion,
  review?: ImportPreviewAccountReview | null
) {
  return formatSuggestionAccount(
    suggestion?.current_target_account_number ??
      review?.current_target_account_number ??
      txn.split_account_number,
    suggestion?.current_target_account_name ??
      review?.current_target_account_name ??
      txn.split_account_name
  );
}

function formatReviewSuggestedTarget(
  suggestion?: GLAccountSuggestion,
  review?: ImportPreviewAccountReview | null
) {
  if (suggestion) return formatSuggestionLabel(suggestion);
  if (review?.suggested_account_number || review?.suggested_account_name) {
    return formatSuggestionAccount(review.suggested_account_number, review.suggested_account_name);
  }
  return "No change";
}

function formatSuggestionStatus(suggestion: GLAccountSuggestion) {
  const hasGeminiSuggestion =
    isGeminiSuggestion(suggestion) && Boolean(getVisibleSuggestedTargetNumber(suggestion));
  const hasXgboostSuggestion = isXgboostSuggestion(suggestion);

  if (
    suggestion.requires_manual_review &&
    isGeminiSuggestion(suggestion) &&
    suggestion.rule === "gemini_ai_review_manual"
  ) {
    return "Gemini AI suggested manual review";
  }
  if (suggestion.requires_manual_review && hasGeminiSuggestion) {
    return "Gemini AI suggested an account; manual review required";
  }
  if (hasXgboostSuggestion) {
    if (shouldUseXgboostFallbackSuggestion(suggestion)) {
      return "XGBoost suggested an account; low training support requires manual approval";
    }
    return suggestion.review_label || (
      suggestion.requires_manual_review
        ? "XGBoost suggested an account; manual review required"
        : "XGBoosted"
    );
  }
  if (suggestion.requires_manual_review) return "Manual review required";
  if (isGeminiSuggestion(suggestion)) return "Gemini";
  if (isMarkedSuggestedChange(suggestion) || getVisibleSuggestedTargetNumber(suggestion)) {
    return suggestion.review_label || "Suggested";
  }
  return "Checked";
}

function isXgboostSuggestion(suggestion: GLAccountSuggestion) {
  return (
    suggestion.is_xgboost_suggestion === true ||
    suggestion.review_source === "xgboost" ||
    suggestion.rule === "xgboost_prediction" ||
    suggestion.rule.endsWith("_xgboost_candidate") ||
    shouldUseXgboostFallbackSuggestion(suggestion)
  );
}

function isGeminiSuggestion(suggestion: GLAccountSuggestion) {
  return suggestion.review_source === "gemini" || suggestion.rule.startsWith("gemini_ai_");
}

function formatPreviewReviewStatus(review: ImportPreviewAccountReview) {
  if (review.requires_human_review) return "Human review required";
  if (review.requires_ai_review) return "AI review required";
  if (review.source === "quickbooks_rule") return "QuickBooks rule";
  if (review.source === "xgboost") return "XGBoost";
  if (review.categorized) return "Checked";
  return "Review";
}

function formatReviewStatus(
  suggestion?: GLAccountSuggestion,
  review?: ImportPreviewAccountReview | null
) {
  const statuses: string[] = [];
  if (suggestion) statuses.push(formatSuggestionStatus(suggestion));
  if (review && review.source !== "not_bank_transaction") {
    statuses.push(formatPreviewReviewStatus(review));
  }
  return statuses.length > 0 ? statuses.join("; ") : "-";
}

function formatReviewMarker(
  suggestion?: GLAccountSuggestion,
  review?: ImportPreviewAccountReview | null
) {
  if (review?.source === "xgboost") {
    return `review_source: ${review.source} | review_status: ${review.status}`;
  }
  if (suggestion) {
    const source = suggestion.review_source || inferSuggestionReviewSource(suggestion);
    const status = suggestion.review_status || inferSuggestionReviewStatus(suggestion);
    return `review_source: ${source} | review_status: ${status}`;
  }
  if (review && review.source !== "not_bank_transaction") {
    return `review_source: ${review.source} | review_status: ${review.status}`;
  }
  return "-";
}

function inferSuggestionReviewSource(suggestion: GLAccountSuggestion) {
  if (isXgboostSuggestion(suggestion)) return "xgboost";
  if (isGeminiSuggestion(suggestion)) return "gemini";
  if (suggestion.requires_manual_review) return "manual";
  return "rules";
}

function inferSuggestionReviewStatus(suggestion: GLAccountSuggestion) {
  if (isXgboostSuggestion(suggestion)) {
    return suggestion.requires_manual_review ? "xgboost_suggested" : "xgboosted";
  }
  if (isGeminiSuggestion(suggestion)) {
    if (suggestion.requires_manual_review && getVisibleSuggestedTargetNumber(suggestion)) {
      return "gemini_manual_suggestion";
    }
    if (suggestion.requires_manual_review) return "gemini_manual_review";
    return isMarkedSuggestedChange(suggestion) ? "gemini_suggested" : "gemini_checked";
  }
  if (suggestion.requires_manual_review) return "manual_review";
  return isMarkedSuggestedChange(suggestion) ? "suggested" : "checked";
}

function formatSuggestionTransactionTitle(suggestion: GLAccountSuggestion) {
  return [
    `Date: ${formatReviewText(suggestion.date)}`,
    `Type: ${formatReviewText(suggestion.transaction_type)}`,
    `Num: ${formatReviewText(suggestion.transaction_number)}`,
    `Name: ${formatReviewText(suggestion.name)}`,
    `Memo: ${formatReviewText(suggestion.memo)}`,
  ].join("\n");
}

function formatAiReviewTitle(suggestion: GLAccountSuggestion) {
  return [
    `AI provider: ${formatReviewText(suggestion.ai_provider)}`,
    `AI model: ${formatReviewText(suggestion.ai_model)}`,
    `AI confidence: ${formatPercent(suggestion.ai_confidence)}`,
    `AI reason: ${formatReviewText(suggestion.ai_reason)}`,
    `Fits when: ${formatReviewText(suggestion.ai_fits_when)}`,
  ].join("\n");
}

function formatAccountSuggestionTitle(suggestion: GLAccountSuggestion) {
  const lines = [
    `Row: ${suggestion.row_number}`,
    formatSuggestionTransactionTitle(suggestion),
    `Amount: ${formatMoney(suggestion.amount)}`,
    `Current target: ${formatSuggestionAccount(
      suggestion.current_target_account_number,
      suggestion.current_target_account_name
    )}`,
    `Suggested target: ${formatSuggestionLabel(suggestion)}`,
    `Confidence: ${formatPercent(suggestion.confidence)}`,
    `Status: ${formatSuggestionStatus(suggestion)}`,
    `Review label: ${formatReviewText(suggestion.review_label)}`,
    `Review source: ${formatReviewText(suggestion.review_source)}`,
    `Review status: ${formatReviewText(suggestion.review_status)}`,
    `Review marker: ${formatReviewMarker(suggestion)}`,
    `Rule: ${formatReviewText(suggestion.rule)}`,
    `Reason: ${formatReviewText(suggestion.reason)}`,
  ];

  if (suggestion.ai_provider) lines.push(formatAiReviewTitle(suggestion));
  if (suggestion.xgboost_reason) {
    lines.push(`XGBoost confidence: ${formatPercent(suggestion.xgboost_confidence)}`);
    lines.push(`XGBoost reason: ${formatReviewText(suggestion.xgboost_reason)}`);
  }

  return lines.join("\n");
}

function formatAccountReviewTransactionTitle(
  txn: ImportPreviewAccountTransaction,
  suggestion?: GLAccountSuggestion,
  review?: ImportPreviewAccountReview | null
) {
  const lines = [
    `Date: ${formatReviewText(txn.entry_date)}`,
    `Type: ${formatReviewText(txn.transaction_type)}`,
    `Num: ${formatReviewText(txn.transaction_number)}`,
    `Name: ${formatReviewText(txn.name)}`,
    `Memo: ${formatReviewText(txn.memo)}`,
    `Amount: ${formatMoney(txn.amount)}`,
    `Debit: ${formatOptionalMoney(txn.debit)}`,
    `Credit: ${formatOptionalMoney(txn.credit)}`,
    `Balance: ${formatOptionalMoney(txn.balance_after)}`,
    `Current target: ${formatReviewCurrentTarget(txn, suggestion, review)}`,
    `Suggested target: ${formatReviewSuggestedTarget(suggestion, review)}`,
    `Status: ${formatReviewStatus(suggestion, review)}`,
    `Review marker: ${formatReviewMarker(suggestion, review)}`,
  ];

  if (suggestion) {
    lines.push(`Suggestion confidence: ${formatPercent(suggestion.confidence)}`);
    lines.push(`Suggestion reason: ${formatReviewText(suggestion.reason)}`);
  }
  if (review && review.source !== "not_bank_transaction") {
    lines.push(`Review source: ${formatReviewText(review.source)}`);
    lines.push(`Review confidence: ${formatPercent(review.confidence)}`);
    lines.push(`Review reason: ${formatReviewText(review.reason)}`);
  }

  return lines.join("\n");
}

function formatReviewConfidence(
  suggestion?: GLAccountSuggestion,
  review?: ImportPreviewAccountReview | null
) {
  if (suggestion?.confidence != null) return formatPercent(suggestion.confidence);
  if (review && review.source !== "not_bank_transaction" && review.confidence != null) {
    return formatPercent(review.confidence);
  }
  return "-";
}

function formatReviewConfidenceTitle(
  suggestion?: GLAccountSuggestion,
  review?: ImportPreviewAccountReview | null
) {
  const lines: string[] = [];
  const visibleConfidence = formatReviewConfidence(suggestion, review);
  lines.push(`Visible confidence: ${visibleConfidence}`);

  if (suggestion) {
    lines.push(`Suggestion confidence: ${formatPercent(suggestion.confidence)}`);
    if (suggestion.ai_confidence != null) {
      lines.push(`AI confidence: ${formatPercent(suggestion.ai_confidence)}`);
    }
    if (suggestion.xgboost_confidence != null) {
      lines.push(`XGBoost confidence: ${formatPercent(suggestion.xgboost_confidence)}`);
    }
  }
  if (review && review.source !== "not_bank_transaction") {
    lines.push(`Preview review confidence: ${formatPercent(review.confidence)}`);
  }

  return lines.join("\n");
}

function formatPercent(value: number | null | undefined) {
  if (value == null) return "-";
  return `${Math.round(value * 100)}%`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
