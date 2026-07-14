// src/pages/GeneralLedgerUpload.tsx

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type {
  ApplySuggestedTargetRequest,
  ApplySuggestedTargetResponse,
  GLAccountSuggestion,
  GLAccountSuggestionsRequest,
  GLAccountSuggestionsResponse,
  GLXgboostTestTrainingResponse,
  ImportPreview,
  ImportPreviewAccount,
  ImportPreviewAccountReview,
  ImportPreviewAccountTransaction,
  ManualGlEntryRequest,
  ParseImportResponse,
} from "@/types/gl";
import {
  useBooks,
  useImportSummary,
  useParseImport,
  useParseImportInBackground,
  useGLUploadQueue,
  useCancelGLUploadQueueJob,
  useDeleteGLUploadQueueJob,
  useDryRunPreviewPage,
  useImportPreview,
  useGLAccountSuggestions,
  useTrainXgboostTestModelFromGlExport,
  useDeleteImport,
  useAddManualEntry,
  useApplySuggestedTarget,
  useApplySuggestedTargets,
  useUnapplySuggestedTarget,
  useSaveImport,
  useSaveImportFromUpload,
  useSaveDryRunPreview,
} from "@/hooks/useGL";
import { GLService } from "@/services/glService";
import { GLUploadQueuePanel } from "@/components/GLUploadQueuePanel";
import { GLSplitCompareDialog } from "@/components/GeneralLedger/GLSplitCompareDialog";
import { useGlobalProgress } from "@/lib/GlobalProgressContext";

import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
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

type ReviewFinderKind =
  | "quickbooks_rule"
  | "xgboost"
  | "split_lookup"
  | "ai"
  | "ai_changed"
  | "human_review"
  | "differences";

type DifferenceFinderFilter =
  | "all"
  | "quickbooks_rule"
  | "bank_transfer"
  | "split_lookup"
  | "xgboost"
  | "ai"
  | "ai_changed"
  | "human_review";

type SaveImportBlockerTarget =
  | "upload"
  | "reconciliation"
  | "account_review"
  | "import_review"
  | "save_import";

type SaveImportBlocker = {
  key: string;
  title: string;
  detail: string;
  actionLabel: string;
  target: SaveImportBlockerTarget;
};

type AiReviewRunState = "disabled" | "running" | "completed" | "not_run" | "incomplete";

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

type AiReview = NonNullable<GLAccountSuggestionsResponse["ai_review"]>;
type AiReviewChunk = AiReview["chunks"][number];

const AI_ROWS_PER_REQUEST = 100;
const GEMINI_CONCURRENCY_LIMIT = 5;
const DRY_RUN_PREVIEW_LIMIT = 5000;
const AI_REVIEW_MAX_ROWS: number | null = null;
const AI_USE_WEB_SEARCH = false;
const AI_ENABLE_ESCALATION = false;
const ACCOUNT_REVIEW_POLL_MS = 2000;

function wait(ms: number) {
  return new Promise<void>((resolve) => window.setTimeout(resolve, ms));
}

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

// A dry-run preview cache entry is gone when it expired, was saved/discarded,
// or the token in the URL is stale (e.g. a reopened link/notification). The
// backend signals this with a 410 whose message we match here so the UI can
// prompt a fresh upload instead of showing a hard error.
function isPreviewExpiredError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err ?? "");
  return /expired|was not found|already saved/i.test(message);
}

const PREVIEW_EXPIRED_NOTICE =
  "This import preview has expired or was already saved. Please upload the file again.";
const PREVIEW_EXPIRED_RERUN_NOTICE =
  "This import preview has expired or was already saved. The selected file is still available, so rerun Account Review or upload the file again.";

export default function GeneralLedgerUpload() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [bookId, setBookId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const useGeminiReview = true;
  const [trainXgboostTestModel, setTrainXgboostTestModel] = useState(false);
  const [isUploadDrawerOpen, setIsUploadDrawerOpen] = useState(false);

  const [summary, setSummary] = useState<ParseSummary | null>(null);
  const [accountFilter, setAccountFilter] = useState("all");
  const [reviewFilterKind, setReviewFilterKind] = useState<"all" | "ai" | "ai_changed">("all");
  const [manualEntry, setManualEntry] = useState<ManualEntryForm>(emptyManualEntry);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showWorkbookPreview, setShowWorkbookPreview] = useState(false);
  const [accountSuggestions, setAccountSuggestions] =
    useState<GLAccountSuggestionsResponse | null>(null);
  const [accountReviewProgress, setAccountReviewProgress] =
    useState<AccountReviewProgress | null>(null);
  const [accountReviewJobId, setAccountReviewJobId] = useState<string | null>(null);
  const [isAccountReviewJobRunning, setIsAccountReviewJobRunning] = useState(false);
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
  const [cancelingQueueJobId, setCancelingQueueJobId] = useState<number | null>(null);
  const [deletingQueueJobId, setDeletingQueueJobId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const parseRunIdRef = useRef(0);
  const loadedPreviewTokenRef = useRef<string | null>(null);
  const autoAccountReviewKeyRef = useRef<string | null>(null);
  const pendingImportReviewScrollRef = useRef(false);
  const glFileInputRef = useRef<HTMLInputElement | null>(null);

  // Queries & Mutations
  const { data: books = [], isLoading: isLoadingBooks, error: booksError } = useBooks();
  const urlSourceFileId = searchParams.get("source_file_id")
    ? Number(searchParams.get("source_file_id"))
    : null;
  const urlCompanyId = searchParams.get("company_id")
    ? Number(searchParams.get("company_id"))
    : null;

  const { data: importSummary } = useImportSummary(urlSourceFileId, urlCompanyId);

  useEffect(() => {
    if (importSummary && !summary) {
      setSummary(importSummary);
    }
  }, [importSummary, summary]);

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
  const { activeJobs, addJob, removeJob } = useGlobalProgress();
  const deleteImportMutation = useDeleteImport();
  const addManualEntryMutation = useAddManualEntry();
  const applySuggestedTargetMutation = useApplySuggestedTarget();
  const applySuggestedTargetsMutation = useApplySuggestedTargets();
  const unapplySuggestedTargetMutation = useUnapplySuggestedTarget();
  const saveImportMutation = useSaveImport();
  const saveImportFromUploadMutation = useSaveImportFromUpload();
  const saveDryRunPreviewMutation = useSaveDryRunPreview();
  const cancelUploadQueueJobMutation = useCancelGLUploadQueueJob();
  const deleteUploadQueueJobMutation = useDeleteGLUploadQueueJob();

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
    // This is a one-time URL bootstrap; pagination controls call the handler directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const aiChangedWorkbookRows = useMemo(
    () => workbookRows.filter(isWorkbookAiChangedReviewRow),
    [workbookRows]
  );
  const humanReviewWorkbookRows = useMemo(
    () => workbookRows.filter(isWorkbookHumanReviewRow),
    [workbookRows]
  );
  const splitLookupWorkbookRows = useMemo(
    () => workbookRows.filter(isWorkbookSplitLookupRow),
    [workbookRows]
  );
  const differencesWorkbookRows = useMemo(
    () => sortDifferenceFinderRows(workbookRows.filter(isWorkbookDifferenceRow)),
    [workbookRows]
  );
  const activeReviewFinderRows = useMemo(() => {
    if (activeReviewFinder === "quickbooks_rule") return qbRuleWorkbookRows;
    if (activeReviewFinder === "ai") return aiReviewWorkbookRows;
    if (activeReviewFinder === "ai_changed") return aiChangedWorkbookRows;
    if (activeReviewFinder === "xgboost") return xgboostWorkbookRows;
    if (activeReviewFinder === "split_lookup") return splitLookupWorkbookRows;
    if (activeReviewFinder === "human_review") return humanReviewWorkbookRows;
    if (activeReviewFinder === "differences") return differencesWorkbookRows;
    return [];
  }, [
    activeReviewFinder,
    aiChangedWorkbookRows,
    aiReviewWorkbookRows,
    differencesWorkbookRows,
    humanReviewWorkbookRows,
    qbRuleWorkbookRows,
    splitLookupWorkbookRows,
    xgboostWorkbookRows,
  ]);

  const reviewDifference = preview ? preview.totals.debits - preview.totals.credits : 0;
  const reconciliationChecks = preview?.reconciliation?.checks ?? [];
  const hasReconciliationMismatch = reconciliationChecks.some((check) => check.status !== "match");
  const reviewReady = Boolean(preview) && Boolean(preview?.reconciliation?.is_balanced) && !hasReconciliationMismatch;
  const isReviewingAccounts = accountSuggestionsMutation.isPending || isAccountReviewJobRunning;
  const aiReviewRunState = getAiReviewRunState(accountSuggestions, isReviewingAccounts, useGeminiReview);
  const missingAiReviewRowNumbers = useMemo(
    () => getAiReviewMissingRowNumbers(accountSuggestions?.ai_review ?? null),
    [accountSuggestions]
  );
  const shouldRetryMissingAiRows =
    aiReviewRunState === "incomplete" && missingAiReviewRowNumbers.length > 0;
  const isTrainingXgboost = xgboostTrainingMutation.isPending;
  const isPreviewPageLoading = dryRunPreviewPageMutation.isPending;
  const isBackgroundParsing = parseImportBackgroundMutation.isPending;
  const isSavingImport = saveImportMutation.isPending || saveImportFromUploadMutation.isPending || saveDryRunPreviewMutation.isPending;
  const isUploadBusy = parseImportMutation.isPending || isBackgroundParsing || isPreviewPageLoading || isTrainingXgboost || isReviewingAccounts || isSavingImport;
  const canSaveDryRun = Boolean(summary?.dry_run_preview_token || (selectedBook && file));
  const activePreviewToken = preview?.pagination?.preview_token ?? summary?.dry_run_preview_token ?? null;
  const canRerunAccountReview = Boolean(summary && selectedBook && (file || activePreviewToken)) &&
    !isReviewingAccounts &&
    !isSavingImport &&
    !isPreviewPageLoading &&
    !isTrainingXgboost &&
    !parseImportMutation.isPending &&
    !isBackgroundParsing;
  const accountReviewProgressLabel = accountReviewProgress
    ? formatAccountReviewProgress(accountReviewProgress, accountReviewJobId)
    : null;
  const hasAccountReviewProgress = accountReviewProgress !== null;
  const saveImportBlockers = useMemo<SaveImportBlocker[]>(() => {
    const blockers: SaveImportBlocker[] = [];
    const mismatchedChecks = reconciliationChecks.filter(
      (check) => check.status !== "match"
    );

    if (isSavingImport) {
      blockers.push({
        key: "saving",
        title: "Save is already running",
        detail: "Wait for the current save request to finish before starting another one.",
        actionLabel: "Go to save",
        target: "save_import",
      });
    }
    if (!preview) {
      blockers.push({
        key: "no-preview",
        title: "No import preview is loaded",
        detail: "Build or reopen a dry-run preview before saving the GL import.",
        actionLabel: "Open upload",
        target: "upload",
      });
    } else {
      if (!preview.reconciliation?.is_balanced) {
        blockers.push({
          key: "not-balanced",
          title: "Reconciliation is not balanced",
          detail: `Debit and credit totals must balance before save. Current difference: ${formatMoney(reviewDifference)}.`,
          actionLabel: "Go to checks",
          target: "reconciliation",
        });
      }
      if (mismatchedChecks.length > 0) {
        blockers.push({
          key: "checks-mismatch",
          title: "Completeness checks do not match",
          detail: `${mismatchedChecks.map((check) => check.check).join(", ")} must match the source file before save.`,
          actionLabel: "Go to checks",
          target: "reconciliation",
        });
      }
    }
    if (isReviewingAccounts) {
      blockers.push({
        key: "account-review-running",
        title: "Account review is still running",
        detail: accountReviewProgressLabel ?? "Wait for the account review job to finish.",
        actionLabel: "Go to account review",
        target: "account_review",
      });
    }
    if (applySuggestedTargetMutation.isPending || unapplySuggestedTargetMutation.isPending) {
      blockers.push({
        key: "suggestion-apply-running",
        title: "Suggested account changes are still applying",
        detail: "Wait for the apply or undo request to finish before saving.",
        actionLabel: "Go to account review",
        target: "account_review",
      });
    }
    if (isDryRun && !canSaveDryRun) {
      blockers.push({
        key: "dry-run-source-missing",
        title: "Dry-run source is missing",
        detail: "This preview needs either a valid preview token or the selected file/book before it can be saved.",
        actionLabel: "Open upload",
        target: "upload",
      });
    }

    return blockers;
  }, [
    accountReviewProgressLabel,
    applySuggestedTargetMutation.isPending,
    canSaveDryRun,
    isDryRun,
    isReviewingAccounts,
    isSavingImport,
    preview,
    reconciliationChecks,
    reviewDifference,
    unapplySuggestedTargetMutation.isPending,
  ]);

  const previewAccounts = preview?.accounts ?? [];
  const previewPagination = preview?.pagination ?? null;
  const visibleReviewAccounts = useMemo(() => {
    if (!preview) return [];

    const accounts = accountFilter === "all"
      ? (preview.accounts ?? [])
      : (preview.accounts ?? []).filter((account) => account.account_key === accountFilter);

    if (reviewFilterKind === "all") return accounts;

    return accounts
      .map((account) => {
        const filteredTransactions = (account.transactions ?? []).filter((txn) => {
          const row = {
            account,
            txn,
            suggestion: suggestionByTransaction.get(suggestionKeyFromPreview(account, txn)) ?? null,
          };
          return reviewFilterKind === "ai"
            ? isWorkbookAiReviewRow(row)
            : isWorkbookAiChangedReviewRow(row);
        });

        return filteredTransactions.length > 0
          ? { ...account, transactions: filteredTransactions }
          : null;
      })
      .filter((account): account is ImportPreviewAccount => account !== null);
  }, [accountFilter, preview, reviewFilterKind, suggestionByTransaction]);

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


  useEffect(() => {
    if (!preview || !summary || !selectedBook) return;
    const previewToken =
      preview.pagination?.preview_token ?? summary.dry_run_preview_token ?? null;
    if (!file && !previewToken) return;
    if (accountSuggestions || suggestionError || isReviewingAccounts) return;
    if (isSavingImport || isPreviewPageLoading || isTrainingXgboost || parseImportMutation.isPending || isBackgroundParsing) return;

    const reviewKey = [
      summary.dry_run_preview_token ?? summary.source_file_id ?? "new-upload",
      file?.name ?? previewToken ?? "server-preview",
      file?.size ?? 0,
      summary.gl_entry_lines,
      selectedBook.book_id,
      useGeminiReview ? "ai" : "rules",
    ].join(":");
    if (autoAccountReviewKeyRef.current === reviewKey) return;
    autoAccountReviewKeyRef.current = reviewKey;

    void reviewAccountSuggestions({
      file,
      previewToken,
      formatCode: selectedBook.format_code,
      parseRunId: parseRunIdRef.current,
      rowCount: summary.gl_entry_lines,
      context: {
        filename: file?.name ?? `dry-run-preview-${previewToken}`,
        companyId: selectedBook.company_id,
        companyName: selectedBook.company_name,
        formatCode: selectedBook.format_code,
        sourceFileId: summary.source_file_id,
        useGemini: useGeminiReview,
      },
    });
  }, [
    accountSuggestions,
    file,
    isBackgroundParsing,
    isPreviewPageLoading,
    isReviewingAccounts,
    isSavingImport,
    isTrainingXgboost,
    parseImportMutation.isPending,
    preview,
    selectedBook,
    suggestionError,
    summary,
    useGeminiReview,
  ]);
  function resetUploadReviewState() {
    setSummary(null);
    setLocalPreview(null);
    setAccountFilter("all");
    setManualEntry(emptyManualEntry);
    setShowManualEntry(false);
    setShowWorkbookPreview(false);
    setAccountSuggestions(null);
    setAccountReviewProgress(null);
    setAccountReviewJobId(null);
    setIsAccountReviewJobRunning(false);
    setApplyingSuggestionKey(null);
    setAppliedSuggestionRows(new Set());
    setFocusedReviewRowId(null);
    setActiveReviewFinder(null);
    setAppliedSuggestionChanges(new Map());
    setSuggestionError(null);
    setXgboostTrainingResult(null);
    setBackgroundUploadMessage(null);
    autoAccountReviewKeyRef.current = null;
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
      const mainContainer = document.querySelector("main");
      if (!reviewSection || !mainContainer) return;
      
      const reviewRect = reviewSection.getBoundingClientRect();
      const mainRect = mainContainer.getBoundingClientRect();
      
      // Calculate scroll position bounded only to the main container
      const targetScroll = mainContainer.scrollTop + (reviewRect.top - mainRect.top) - 24;
      
      mainContainer.scrollTo({
        top: targetScroll,
        behavior: "smooth"
      });
      
      pendingImportReviewScrollRef.current = false;
    }, 50);
  }

  function scrollToSection(id: string) {
    window.setTimeout(() => {
      const section = document.getElementById(id);
      const mainContainer = document.querySelector("main");
      if (!section || !mainContainer) return;

      const sectionRect = section.getBoundingClientRect();
      const mainRect = mainContainer.getBoundingClientRect();
      const targetScroll = mainContainer.scrollTop + (sectionRect.top - mainRect.top) - 24;

      mainContainer.scrollTo({
        top: targetScroll,
        behavior: "smooth",
      });
    }, 50);
  }

  function handleSaveImportBlockerAction(blocker: SaveImportBlocker) {
    setShowWorkbookPreview(false);
    setActiveReviewFinder(null);

    if (blocker.target === "upload") {
      setIsUploadDrawerOpen(true);
      return;
    }
    if (blocker.target === "reconciliation") {
      scrollToSection("reconciliation-checks");
      return;
    }
    if (blocker.target === "account_review") {
      scrollToSection("account-suggestions");
      return;
    }
    if (blocker.target === "import_review") {
      scrollToSection("import-review");
      return;
    }
    scrollToSection("save-import");
  }

  function applyDryRunParseResponse(response: ParseImportResponse) {
    const previewToken =
      response.dry_run_preview_token ??
      response.summary.dry_run_preview_token ??
      response.preview?.pagination?.preview_token ??
      null;
    setSummary({
      ...response.summary,
      dry_run_preview_token: previewToken ?? response.summary.dry_run_preview_token,
    });
    setBookId(response.summary.company_book_id);
    setLocalPreview(response.preview ?? null);
    setAccountFilter("all");
    setFocusedReviewRowId(null);
    setActiveReviewFinder(null);
    setShowWorkbookPreview(false);

    if (previewToken) {
      window.history.replaceState(
        null,
        "",
        `/general-ledger/upload?dry_run_preview_token=${encodeURIComponent(previewToken)}#import-review`
      );
    } else {
      window.history.replaceState(null, "", "/general-ledger/upload#import-review");
    }
    scrollToImportReview();
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
    setAccountReviewJobId(null);
    setIsAccountReviewJobRunning(false);
    setApplyingSuggestionKey(null);
    setAppliedSuggestionRows(new Set());
    setFocusedReviewRowId(null);
    setActiveReviewFinder(null);
    setAppliedSuggestionChanges(new Map());
    setSuggestionError(null);
    setXgboostTrainingResult(null);
    setBackgroundUploadMessage(null);
    autoAccountReviewKeyRef.current = null;

    try {
      try {
        const backgroundParse = await parseImportBackgroundMutation.mutateAsync({
          companyBookId: currentBook.book_id,
          file: currentFile,
          dryRun: true,
          previewLimit: null,
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
        setIsUploadDrawerOpen(false);
        void refetchUploadQueue();
      } catch (backgroundErr) {
        if (parseRunIdRef.current !== parseRunId) return;
        console.warn("[GL Upload] Background parse queue failed; falling back to direct parse.", backgroundErr);
        setBackgroundUploadMessage("Background queue failed. Parsing this GL file in this tab instead...");
        const directParse = await parseImportMutation.mutateAsync({
          companyBookId: currentBook.book_id,
          file: currentFile,
          dryRun: true,
          previewLimit: null,
        });
        if (parseRunIdRef.current !== parseRunId) return;
        applyDryRunParseResponse(directParse);
        setBackgroundUploadMessage(null);
        setIsUploadDrawerOpen(false);
      }

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
      setBackgroundUploadMessage(null);
    }
  }

  async function handleCancelQueueJob(jobId: number) {
    setError(null);
    setCancelingQueueJobId(jobId);
    try {
      const result = await cancelUploadQueueJobMutation.mutateAsync({ jobId });
      setBackgroundUploadMessage(
        result.message ||
          (result.canceled
            ? "GL upload canceled."
            : "Cancel requested. The backend worker will stop this upload shortly.")
      );
      const activeUploadJob = activeJobs.find((job) => String(job.jobId) === String(jobId));
      if (activeUploadJob) {
        removeJob(activeUploadJob.id);
      }
      void refetchUploadQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel GL upload");
    } finally {
      setCancelingQueueJobId(null);
    }
  }

  async function handleDeleteQueueJob(jobId: number) {
    setError(null);
    setDeletingQueueJobId(jobId);
    try {
      const result = await deleteUploadQueueJobMutation.mutateAsync({ jobId });
      setBackgroundUploadMessage(result.message || "GL upload queue item deleted.");
      const activeUploadJob = activeJobs.find((job) => String(job.jobId) === String(jobId));
      if (activeUploadJob) {
        removeJob(activeUploadJob.id);
      }
      void refetchUploadQueue();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete GL upload");
    } finally {
      setDeletingQueueJobId(null);
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
      if (isPreviewExpiredError(err)) {
        // Stale token from a reopened/refreshed link: clear it and reset so we
        // don't keep re-driving a dead preview, then prompt a fresh upload.
        window.history.replaceState(null, "", "/general-ledger/upload");
        loadedPreviewTokenRef.current = null;
        resetUploadReviewState();
        setError(PREVIEW_EXPIRED_NOTICE);
        return;
      }
      setError(err instanceof Error ? err.message : "Failed to load dry-run preview page");
    }
  }

  async function pollAccountReviewJob(
    jobId: string,
    parseRunId: number
  ): Promise<GLAccountSuggestionsResponse> {
    while (true) {
      if (parseRunIdRef.current !== parseRunId) {
        throw new Error("Account review was superseded by a newer upload.");
      }
      const job = await GLService.getAccountSuggestionsJob(jobId);
      setAccountReviewProgress({
        current: Math.min(99, Math.max(1, job.progress ?? 1)),
        total: 100,
      });

      if (job.status === "completed") {
        if (!job.result) {
          throw new Error("Account review finished without a result.");
        }
        setAccountReviewProgress({ current: 100, total: 100 });
        return job.result;
      }
      if (["cancel_requested", "canceled", "discarded"].includes(job.status)) {
        throw new Error("Dry-run preview expired or was not found.");
      }
      if (job.status === "failed") {
        throw new Error(job.error?.message || `Account review ${job.status}.`);
      }

      await wait(ACCOUNT_REVIEW_POLL_MS);
    }
  }

  function handleRerunAccountReview() {
    if (!summary || !selectedBook) return;
    const reviewPreviewToken = file ? null : activePreviewToken;
    if (!file && !reviewPreviewToken) {
      setSuggestionError(PREVIEW_EXPIRED_NOTICE);
      return;
    }

    const retryAiRowNumbers = shouldRetryMissingAiRows
      ? missingAiReviewRowNumbers
      : [];
    const previousResponse = retryAiRowNumbers.length > 0 ? accountSuggestions : null;
    const parseRunId = parseRunIdRef.current + 1;
    parseRunIdRef.current = parseRunId;
    autoAccountReviewKeyRef.current = null;
    setError(null);
    setSuggestionError(null);
    if (!previousResponse) {
      setAccountSuggestions(null);
    }
    setAccountReviewProgress(null);
    setAccountReviewJobId(null);
    setIsAccountReviewJobRunning(false);
    setApplyingSuggestionKey(null);
    setAppliedSuggestionRows(new Set());
    setAppliedSuggestionChanges(new Map());
    setFocusedReviewRowId(null);
    setActiveReviewFinder(null);

    void reviewAccountSuggestions({
      file,
      previewToken: reviewPreviewToken,
      formatCode: selectedBook.format_code,
      parseRunId,
      rowCount: retryAiRowNumbers.length || summary.gl_entry_lines,
      retryAiRowNumbers,
      previousResponse,
      context: {
        filename: file?.name ?? `dry-run-preview-${reviewPreviewToken}`,
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
    previewToken,
    formatCode,
    parseRunId,
    rowCount,
    retryAiRowNumbers,
    previousResponse,
    context,
  }: {
    file?: File | null;
    previewToken?: string | null;
    formatCode: string;
    parseRunId: number;
    rowCount: number;
    retryAiRowNumbers?: number[];
    previousResponse?: GLAccountSuggestionsResponse | null;
    context: AccountReviewLogContext;
  }) {
    if (previewToken) {
      setAccountReviewProgress({ current: 1, total: 100 });
    } else if (context.useGemini) {
      const geminiReviewRowCount =
        AI_REVIEW_MAX_ROWS == null
          ? rowCount
          : Math.min(rowCount, AI_REVIEW_MAX_ROWS);
      const totalChunks = estimateGeminiChunkCount(
        geminiReviewRowCount
      );
      setAccountReviewProgress({
        current: Math.min(GEMINI_CONCURRENCY_LIMIT, totalChunks),
        total: totalChunks,
      });
    }

    let reviewCompleted = false;
    try {
      const useGemini = context.useGemini;
      const request: GLAccountSuggestionsRequest = {
        file,
        previewToken,
        companyId: context.companyId,
        companyName: context.companyName,
        formatCode,
        includeAll: true,
        // AI review does not depend on XGBoost. Once a response confirms that
        // no model is loaded, reruns call AI directly.
        useXgboost:
          accountSuggestions?.xgboost_model_status?.model_loaded ?? true,
        useAi: useGemini,
        aiProvider: useGemini ? "ai" : undefined,
        aiRowsPerRequest: useGemini ? AI_ROWS_PER_REQUEST : undefined,
        aiConcurrencyLimit: useGemini ? GEMINI_CONCURRENCY_LIMIT : undefined,
        aiUseGoogleSearch: useGemini ? AI_USE_WEB_SEARCH : undefined,
        aiReviewAll: false,
        aiMaxRows: useGemini ? AI_REVIEW_MAX_ROWS : null,
        aiEnableEscalation: useGemini ? AI_ENABLE_ESCALATION : false,
        aiEscalationConfidence: useGemini ? 0.85 : undefined,
        applyAiSuggestions: useGemini,
        aiRetryRowNumbers: useGemini && retryAiRowNumbers?.length
          ? retryAiRowNumbers
          : undefined,
      };
      let review: GLAccountSuggestionsResponse;
      if (previewToken) {
        setIsAccountReviewJobRunning(true);
        const queued = await GLService.queueAccountSuggestions(request);
        const queuedJobId = queued.backgroundJobId ?? queued.jobId;
        setAccountReviewJobId(queuedJobId);
        setAccountReviewProgress({
          current: Math.min(99, Math.max(1, queued.progress ?? 1)),
          total: 100,
        });
        review = await pollAccountReviewJob(queuedJobId, parseRunId);
      } else {
        review = await accountSuggestionsMutation.mutateAsync(request);
      }

      const mergedReview =
        previousResponse && retryAiRowNumbers?.length
          ? mergeAiRetryAccountSuggestions(previousResponse, review, retryAiRowNumbers)
          : review;
      const geminiIssues = logGeminiReviewIssues(mergedReview, context);
      if (parseRunIdRef.current !== parseRunId) return;
      setAccountSuggestions(mergedReview);
      setAccountReviewProgress({ current: 100, total: 100 });
      reviewCompleted = true;
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
        if (isPreviewExpiredError(suggestionErr)) {
          window.history.replaceState(null, "", "/general-ledger/upload");
          loadedPreviewTokenRef.current = null;
          setSuggestionError(file ? PREVIEW_EXPIRED_RERUN_NOTICE : PREVIEW_EXPIRED_NOTICE);
        } else {
          setSuggestionError(`Account review failed after the GL upload was staged: ${message}`);
        }
      }
    } finally {
      if (parseRunIdRef.current === parseRunId) {
        setIsAccountReviewJobRunning(false);
        if (!reviewCompleted) {
          setAccountReviewProgress(null);
          setAccountReviewJobId(null);
        }
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
              suggested_split_account_name: response.unapplied_change.removed_account_number,
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

  function changedSuggestionPayloads(): ApplySuggestedTargetRequest[] {
    if (!accountSuggestions) return [];
    const seenRows = new Set<number>();
    const payloads: ApplySuggestedTargetRequest[] = [];

    for (const suggestion of accountSuggestions.suggestions) {
      if (suggestion.requires_manual_review) continue;
      const suggestedAccountNumber = getVisibleSuggestedTargetNumber(suggestion)?.trim();
      if (!suggestedAccountNumber || suggestedAccountNumber === "MANUAL_REVIEW") continue;
      const currentTargetNumber = String(
        suggestion.current_target_account_number ??
          (suggestion.target_field === "ledger_account"
            ? suggestion.ledger_account_number
            : suggestion.current_split_account_number) ??
          ""
      ).trim();
      if (suggestedAccountNumber === currentTargetNumber) continue;
      if (seenRows.has(suggestion.row_number)) continue;
      seenRows.add(suggestion.row_number);
      payloads.push({
        company_id: summary?.company_id ?? selectedBook?.company_id ?? 0,
        row_number: suggestion.row_number,
        target_field: suggestion.target_field,
        suggested_account_number: suggestedAccountNumber,
      });
    }

    return payloads.filter((payload) => payload.company_id > 0);
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
            suggestions: changedSuggestionPayloads(),
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
          suggestions: changedSuggestionPayloads(),
        });
        window.location.assign(`/general-ledger/company/${selectedBook.company_id}?period=q1&year=2026`);
        return;
      }

      const suggestionsToApply = changedSuggestionPayloads();
      if (suggestionsToApply.length > 0) {
        await applySuggestedTargetsMutation.mutateAsync({
          sourceFileId: summary.source_file_id,
          companyId: selectedBook?.company_id ?? summary.company_id,
          suggestions: suggestionsToApply,
        });
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

      <Drawer open={isUploadDrawerOpen} onOpenChange={setIsUploadDrawerOpen} direction="right">
        <GLUploadQueuePanel
          jobs={uploadQueue}
          isLoading={isUploadQueueLoading}
          isPreviewLoading={isPreviewPageLoading}
          onRefresh={() => void refetchUploadQueue()}
          onOpenPreview={(token) => handleDryRunPreviewPage(1, token)}
          onCancelJob={(jobId) => handleCancelQueueJob(jobId)}
          cancelingJobId={cancelingQueueJobId}
          onDeleteJob={(jobId) => handleDeleteQueueJob(jobId)}
          deletingJobId={deletingQueueJobId}
          headerAction={
            <div className="flex items-center gap-2">
              <GLSplitCompareDialog books={books} />
              <DrawerTrigger asChild>
                <Button size="sm">
                  <UploadCloud className="mr-2 h-4 w-4" />
                  New Upload
                </Button>
              </DrawerTrigger>
            </div>
          }
        />

        <DrawerContent className="sm:max-w-xl">
          <div className="mx-auto w-full max-w-4xl p-6 pb-8">
            <DrawerHeader className="px-0 pt-0">
              <DrawerTitle>Upload General Ledger</DrawerTitle>
              <DrawerDescription>
                Select a company, upload a GL file, and configure your parse settings.
              </DrawerDescription>
            </DrawerHeader>
            <Card className="border-0 shadow-none">
              <CardContent className="p-0 mt-4">
                <div className="flex flex-col gap-4">
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
                    <span className="block break-all whitespace-normal" title={file.name}>
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
            <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/20 p-4">
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
            <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/20 p-4">
              <div>
                <Label htmlFor="gemini-review">AI review</Label>
              </div>
              <Button
                id="gemini-review"
                type="button"
                variant="default"
                size="sm"
                disabled
                title={
                  "AI review runs automatically for production GL uploads"
                }
              >
                Auto
              </Button>
            </div>
            <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/20 p-4">
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
                <div className="mt-1 font-mono text-xs" title={xgboostTrainingResult.training.cleanup_files.join(" | ")}>
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
                : isReviewingAccounts
                  ? accountReviewProgressLabel ?? (useGeminiReview ? "Reviewing with AI..." : "Reviewing...")
                  : "Dry-run Preview"}
            </Button>
          </div>
        </CardContent>
      </Card>
          </div>
        </DrawerContent>
      </Drawer>

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
            <Card id="import-review" className="scroll-mt-6 overflow-visible">
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
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Workbook
                  </Button>
                  {isDryRun && (
                    <GLSplitCompareDialog
                      books={books}
                      bookId={bookId}
                      localPreview={preview}
                      localSuggestions={suggestions}
                    />
                  )}
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
                <div className="sticky top-0 z-40 grid border-b bg-background md:grid-cols-9 md:divide-x shadow-sm">
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
                    label="Split Count"
                    value={splitLookupWorkbookRows.length.toLocaleString("en-US")}
                    onClick={
                      splitLookupWorkbookRows.length > 0
                        ? () => toggleReviewFinder("split_lookup", splitLookupWorkbookRows)
                        : undefined
                    }
                    title={
                      splitLookupWorkbookRows.length > 0
                        ? "Open split account lookup transaction finder"
                        : "No split account lookup-reviewed transactions in this preview"
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
                    label="AI Changed"
                    value={aiChangedWorkbookRows.length.toLocaleString("en-US")}
                    tone={aiChangedWorkbookRows.length > 0 ? "warning" : "default"}
                    onClick={
                      aiChangedWorkbookRows.length > 0
                        ? () => toggleReviewFinder("ai_changed", aiChangedWorkbookRows)
                        : undefined
                    }
                    title={
                      aiChangedWorkbookRows.length > 0
                        ? "Open AI changed transaction finder"
                        : "No AI-changed transactions in this preview"
                    }
                  />
                  <ReviewStat
                    label="Human review"
                    value={preview.account_review_summary.human_review_count.toLocaleString("en-US")}
                    tone={preview.account_review_summary.human_review_count > 0 ? "warning" : "default"}
                    onClick={
                      humanReviewWorkbookRows.length > 0
                        ? () => toggleReviewFinder("human_review", humanReviewWorkbookRows)
                        : undefined
                    }
                    title={
                      humanReviewWorkbookRows.length > 0
                        ? "Open Human review transaction finder"
                        : "No Human review transactions in this preview"
                    }
                  />
                  <ReviewStat
                    label="N/A"
                    value={preview.account_review_summary.not_applicable_count.toLocaleString("en-US")}
                  />
                  <ReviewStat
                    label="Differences"
                    value={differencesWorkbookRows.length.toLocaleString("en-US")}
                    tone={differencesWorkbookRows.length > 0 ? "warning" : "default"}
                    onClick={
                      differencesWorkbookRows.length > 0
                        ? () => toggleReviewFinder("differences", differencesWorkbookRows)
                        : undefined
                    }
                    title={
                      differencesWorkbookRows.length > 0
                        ? "Open transactions where current and suggested targets differ"
                        : "No transactions with differing targets in this preview"
                    }
                  />
                </div>
              )}

              {preview.reconciliation && (
                <div id="reconciliation-checks" className="scroll-mt-6 border-b p-6">
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

              <div id="account-suggestions" className="scroll-mt-6 border-b bg-muted/10 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-medium">Account Suggestions</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {accountReviewProgressLabel ??
                        (suggestionError
                          ? "Review failed"
                          : accountSuggestions
                            ? "Review complete"
                            : "Review pending")}
                    </p>
                  </div>
                  <Badge variant={suggestionError ? "destructive" : accountSuggestions ? "default" : "outline"}>
                    {isReviewingAccounts
                      ? "Running"
                      : suggestionError
                        ? "Failed"
                        : accountSuggestions && aiReviewRunState === "incomplete"
                          ? "Incomplete"
                          : accountSuggestions && aiReviewRunState === "not_run"
                            ? "AI not run"
                            : accountSuggestions
                              ? "Complete"
                              : "Pending"}
                  </Badge>
                </div>
              </div>

              <AccountSuggestionReview
                suggestions={suggestions}
                response={accountSuggestions}
                isLoading={isReviewingAccounts}
                progressLabel={accountReviewProgressLabel}
                error={suggestionError}
                aiReviewRunState={aiReviewRunState}
                onRerun={handleRerunAccountReview}
                canRerun={canRerunAccountReview}
                rerunLabel={
                  shouldRetryMissingAiRows
                    ? "Run Missing AI Batch"
                    : aiReviewRunState === "not_run"
                      ? "Run AI Review"
                    : useGeminiReview
                      ? "Rerun AI Review"
                      : "Rerun Review"
                }
                onApplySuggestedTarget={!isDryRun && summary ? handleApplySuggestedTarget : undefined}
                onUnapplySuggestedTarget={!isDryRun && summary ? handleUnapplySuggestedTarget : undefined}
                applyingSuggestionKey={applyingSuggestionKey}
                appliedSuggestionRows={appliedSuggestionRows}
              />

              <div className="sticky top-0 z-30 border-b bg-background/95 p-6 backdrop-blur-sm shadow-sm">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="font-medium text-lg">Chart of Accounts Review</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Accounts are shown as section titles with their charges underneath.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2 rounded-md border bg-background p-1">
                      <Button
                        type="button"
                        variant={reviewFilterKind === "all" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setReviewFilterKind("all")}
                      >
                        All
                      </Button>
                      <Button
                        type="button"
                        variant={reviewFilterKind === "ai" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setReviewFilterKind("ai")}
                      >
                        AI Review
                      </Button>
                      <Button
                        type="button"
                        variant={reviewFilterKind === "ai_changed" ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setReviewFilterKind("ai_changed")}
                      >
                        AI Changed
                      </Button>
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
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant={activeReviewFinder === "quickbooks_rule" ? "default" : "outline"}
                      size="sm"
                      disabled={qbRuleWorkbookRows.length === 0}
                      onClick={() => toggleReviewFinder("quickbooks_rule", qbRuleWorkbookRows)}
                    >
                      QB Rules
                    </Button>
                    <Button
                      type="button"
                      variant={activeReviewFinder === "xgboost" ? "default" : "outline"}
                      size="sm"
                      disabled={xgboostWorkbookRows.length === 0}
                      onClick={() => toggleReviewFinder("xgboost", xgboostWorkbookRows)}
                    >
                      XGBoost
                    </Button>
                    <Button
                      type="button"
                      variant={activeReviewFinder === "split_lookup" ? "default" : "outline"}
                      size="sm"
                      disabled={splitLookupWorkbookRows.length === 0}
                      onClick={() => toggleReviewFinder("split_lookup", splitLookupWorkbookRows)}
                    >
                      Split Lookup
                    </Button>
                    <Button
                      type="button"
                      variant={activeReviewFinder === "ai" ? "default" : "outline"}
                      size="sm"
                      disabled={aiReviewWorkbookRows.length === 0}
                      onClick={() => toggleReviewFinder("ai", aiReviewWorkbookRows)}
                    >
                      AI Review
                    </Button>
                    <Button
                      type="button"
                      variant={activeReviewFinder === "ai_changed" ? "default" : "outline"}
                      size="sm"
                      disabled={aiChangedWorkbookRows.length === 0}
                      onClick={() => toggleReviewFinder("ai_changed", aiChangedWorkbookRows)}
                    >
                      AI Changed
                    </Button>
                    <Button
                      type="button"
                      variant={activeReviewFinder === "human_review" ? "default" : "outline"}
                      size="sm"
                      disabled={humanReviewWorkbookRows.length === 0}
                      onClick={() => toggleReviewFinder("human_review", humanReviewWorkbookRows)}
                    >
                      Human Review
                    </Button>
                  </div>
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
                        aiReviewRunState={aiReviewRunState}
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

          <Card id="save-import" className="scroll-mt-6">
            <CardContent className="p-6">
              <h2 className="text-lg font-medium">Save Import</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isDryRun
                  ? "This preview is not staged. Saving will parse this file again and write the saved GL import to the database."
                  : "Review the account groups above, then save to make this import available on the company GL dashboard."}
              </p>
              {saveImportBlockers.length > 0 ? (
                <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-400/40 dark:bg-amber-950/40 dark:text-amber-100">
                  <div className="font-medium">Save Import is disabled</div>
                  <div className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                    Fix these items before saving.
                  </div>
                  <div className="mt-3 space-y-2">
                    {saveImportBlockers.map((blocker) => (
                      <div
                        key={blocker.key}
                        className="flex flex-wrap items-start justify-between gap-3 rounded-md border border-amber-200/80 bg-white/70 p-3 dark:border-amber-400/30 dark:bg-background/40"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-medium">{blocker.title}</div>
                          <div className="mt-1 text-xs text-amber-800 dark:text-amber-200">
                            {blocker.detail}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0 border-amber-300 bg-white text-amber-900 hover:bg-amber-100 dark:border-amber-400/40 dark:bg-background dark:text-amber-100"
                          onClick={() => handleSaveImportBlockerAction(blocker)}
                        >
                          {blocker.actionLabel}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
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
                    saveImportBlockers.length > 0
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
          aiReviewRunState={aiReviewRunState}
          onClose={() => setShowWorkbookPreview(false)}
        />
      )}
      {activeReviewFinder && (
        <ReviewFinderPanel
          kind={activeReviewFinder}
          rows={activeReviewFinderRows}
          differenceStatRows={workbookRows}
          focusedReviewRowId={focusedReviewRowId}
          aiReviewRunState={aiReviewRunState}
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

function ReviewFinderPanel({
  kind,
  rows,
  differenceStatRows,
  focusedReviewRowId,
  aiReviewRunState,
  onGoTo,
  onClose,
}: {
  kind: ReviewFinderKind;
  rows: WorkbookPreviewRow[];
  differenceStatRows?: WorkbookPreviewRow[];
  focusedReviewRowId: string | null;
  aiReviewRunState: AiReviewRunState;
  onGoTo: (row: WorkbookPreviewRow) => void;
  onClose: () => void;
}) {
  const title = reviewFinderTitle(kind);
  const emptyText = reviewFinderEmptyText(kind);
  const [position, setPosition] = useState({ x: 0, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const [aiFinderFilter, setAiFinderFilter] = useState<"all" | "suggested">("suggested");
  const [differenceFinderFilter, setDifferenceFinderFilter] =
    useState<DifferenceFinderFilter>("all");
  const differenceFinderStats = useMemo(
    () => buildDifferenceFinderStats(
      rows,
      differenceStatRows ?? rows,
      aiReviewRunState
    ),
    [aiReviewRunState, differenceStatRows, rows]
  );
  const filteredRows = useMemo(() => {
    if (kind === "ai") {
      if (aiFinderFilter === "all") return rows;
      return rows.filter(hasSuggestedTargetForReviewFinder);
    }
    if (kind === "differences" && differenceFinderFilter !== "all") {
      return rows.filter((row) =>
        rowMatchesDifferenceFinderFilter(
          row,
          differenceFinderFilter,
          aiReviewRunState
        )
      );
    }
    return rows;
  }, [aiFinderFilter, aiReviewRunState, differenceFinderFilter, kind, rows]);

  useEffect(() => {
    const width = Math.min(460, window.innerWidth - 32);
    setPosition({
      x: Math.max(16, window.innerWidth - width - 16),
      y: 80,
    });
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    function handleMove(event: PointerEvent) {
      const panelWidth = Math.min(460, window.innerWidth - 32);
      const panelHeight = Math.min(620, window.innerHeight - 96);
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

  return (
    <>
      {isDragging ? (
        <div
          className="fixed inset-0 z-40 cursor-move select-none"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onPointerMove={(event) => event.preventDefault()}
          onPointerUp={(event) => event.stopPropagation()}
        />
      ) : null}
      <div
        className="fixed z-50 flex max-h-[min(620px,calc(100vh-6rem))] w-[min(460px,calc(100vw-2rem))] flex-col overflow-hidden rounded-md border bg-background shadow-2xl"
        style={{ left: position.x, top: position.y }}
      >
      <div
        className="flex cursor-move touch-none select-none items-start justify-between gap-3 border-b bg-muted/60 px-4 py-3"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.stopPropagation();
          event.currentTarget.setPointerCapture(event.pointerId);
          const rect = event.currentTarget.parentElement?.getBoundingClientRect();
          dragOffset.current = {
            x: event.clientX - (rect?.left ?? position.x),
            y: event.clientY - (rect?.top ?? position.y),
          };
          setIsDragging(true);
        }}
      >
        <div className="min-w-0">
          <div className="text-sm font-medium">{title}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {filteredRows.length.toLocaleString("en-US")} {reviewFinderCountLabel(kind)}
            {kind === "ai" ? ` (${aiFinderFilter === "suggested" ? "suggested only" : "all"})` : ""}
            {kind === "differences" && differenceFinderFilter !== "all"
              ? ` (${differenceFinderFilterLabel(differenceFinderFilter)})`
              : ""}
          </div>
        </div>
        <div className="flex items-center gap-2" onPointerDown={(event) => event.stopPropagation()}>
          {kind === "ai" ? (
            <div className="inline-flex rounded-md border bg-background p-1">
              <Button
                type="button"
                size="sm"
                variant={aiFinderFilter === "all" ? "default" : "ghost"}
                onClick={() => setAiFinderFilter("all")}
              >
                All
              </Button>
              <Button
                type="button"
                size="sm"
                variant={aiFinderFilter === "suggested" ? "default" : "ghost"}
                onClick={() => setAiFinderFilter("suggested")}
              >
                Suggested only
              </Button>
            </div>
          ) : null}
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
      </div>

      {kind === "differences" ? (
        <div
          className="flex flex-wrap gap-1 border-b bg-background px-3 py-2"
          onPointerDown={(event) => event.stopPropagation()}
        >
          {DIFFERENCE_FINDER_FILTERS.map((filter) => (
            <Button
              key={filter.value}
              type="button"
              size="sm"
              variant={
                differenceFinderFilter === filter.value ? "default" : "outline"
              }
              className="h-auto min-h-8 min-w-[74px] flex-col gap-0 px-2 py-1 text-xs leading-tight"
              onClick={() => setDifferenceFinderFilter(filter.value)}
              title={`${filter.label}: ${formatDifferenceFinderStat(differenceFinderStats[filter.value])}`}
            >
              <span>{filter.label}</span>
              <span className="text-[10px] font-normal opacity-80">
                {formatDifferenceFinderStat(differenceFinderStats[filter.value])}
              </span>
            </Button>
          ))}
        </div>
      ) : null}

      {filteredRows.length === 0 ? (
        <div className="p-4 text-sm text-muted-foreground">
          {emptyText}
        </div>
      ) : (
        <div className="overflow-auto p-2">
          {filteredRows.map((row, index) => {
            const rowId = previewRowDomId(row.account, row.txn);
            const isFocused = focusedReviewRowId === rowId;
            const label = row.txn.name || row.txn.memo || row.txn.transaction_type || "Transaction";
            const marker = formatReviewFinderMarker(kind, row, aiReviewRunState);
            const status = formatReviewFinderStatus(row, aiReviewRunState);
            const suggested = formatReviewSuggestedTarget(
              row.suggestion ?? undefined,
              row.txn.account_review,
              aiReviewRunState
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
                    <div className="text-sm font-medium">
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
                <div className={`mt-1 truncate text-xs ${isFocused ? "text-accent-foreground/80" : "text-muted-foreground group-hover:text-accent-foreground/80"}`}>
                  Status: {status}
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
    </>
  );
}

function reviewFinderTitle(kind: ReviewFinderKind) {
  if (kind === "quickbooks_rule") return "QB Rules finder";
  if (kind === "split_lookup") return "Split account finder";
  if (kind === "ai") return "AI Review finder";
  if (kind === "ai_changed") return "AI Changed finder";
  if (kind === "human_review") return "Human review finder";
  if (kind === "differences") return "Differences finder";
  return "XGBoost finder";
}

function reviewFinderCountLabel(kind: ReviewFinderKind) {
  if (kind === "ai_changed") return "changed transactions";
  if (kind === "differences") return "differing transactions";
  if (kind === "split_lookup") return "split account matches";
  return "reviewed transactions";
}

function reviewFinderEmptyText(kind: ReviewFinderKind) {
  if (kind === "quickbooks_rule") {
    return "No QuickBooks rule-reviewed transactions are available in this preview.";
  }
  if (kind === "ai") {
    return "No AI-reviewed transactions are available in this preview.";
  }
  if (kind === "ai_changed") {
    return "No AI-changed transactions are available in this preview.";
  }
  if (kind === "split_lookup") {
    return "No split account lookup-reviewed transactions are available in this preview.";
  }
  if (kind === "human_review") {
    return "No Human review transactions are available in this preview.";
  }
  if (kind === "differences") {
    return "No transactions with differing current and suggested targets are available in this preview.";
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
  aiReviewRunState,
}: {
  account: ImportPreviewAccount;
  isFiltered: boolean;
  onFilter: () => void;
  suggestionByTransaction: Map<string, GLAccountSuggestion>;
  focusedReviewRowId?: string | null;
  aiReviewRunState: AiReviewRunState;
}) {
  const transactions = account.transactions ?? [];
  const closingBalance = getPreviewAccountClosingBalance(account);
  const isCreditCardAccount = isCreditCardAccountType(account.account_type);

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
          {isCreditCardAccount && (
            <Badge variant="secondary" className="bg-sky-100 text-sky-700 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-200 dark:hover:bg-sky-950/40">
              Credit card
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
        <Table containerClassName="max-h-[420px]" className="[&_td]:whitespace-normal [&_td]:break-words [&_td]:min-w-[120px]">
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
                const suggestedTargetTitle = formatReviewSuggestedTarget(suggestion, previewReview, aiReviewRunState);
                const missingSuggestedTargetLabel = formatMissingSuggestedTargetLabel(previewReview, aiReviewRunState);
                const rowTitle = formatAccountReviewTransactionTitle(txn, suggestion, previewReview, aiReviewRunState);
                const rowDomId = previewRowDomId(account, txn);
                const rowIsFocused = focusedReviewRowId === rowDomId;

                return (
                <TableRow
                  id={rowDomId}
                  key={txn.entry_id}
                  className={rowIsFocused ? "bg-accent ring-2 ring-inset ring-ring" : undefined}
                  title={rowTitle}
                >
                  <TableCell className="" title={formatReviewText(txn.entry_date)}>{txn.entry_date || "-"}</TableCell>
                  <TableCell className="" title={formatReviewText(txn.transaction_type)}>{txn.transaction_type || "-"}</TableCell>
                  <TableCell className="" title={formatReviewText(txn.transaction_number)}>{txn.transaction_number || "-"}</TableCell>
                  <TableCell className="" title={formatReviewText(txn.name)}>{txn.name || "-"}</TableCell>
                  <TableCell className="max-w-[200px]" title={txn.memo || ""}>{txn.memo || "-"}</TableCell>
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
                      <SuggestedAccountValue suggestion={suggestion} aiReviewRunState={aiReviewRunState} />
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
                        <span className="text-muted-foreground">{missingSuggestedTargetLabel}</span>
                        <ConfidenceValue review={previewReview} className="mt-1" />
                      </div>
                    ) : (
                      <span className="text-muted-foreground">{missingSuggestedTargetLabel}</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
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
                      aiReviewRunState={aiReviewRunState}
                    />
                    {txn.split_account_number ? `${txn.split_account_number} · ${txn.split_account_name || ""}` : "-"}
                  </TableCell>
                  <TableCell className="text-right" title={formatOptionalMoney(txn.debit)}>{txn.debit ? formatMoney(txn.debit) : "-"}</TableCell>
                  <TableCell className="text-right" title={formatOptionalMoney(txn.credit)}>{txn.credit ? formatMoney(txn.credit) : "-"}</TableCell>
                  <TableCell className="text-right" title={formatOptionalMoney(txn.balance_after)}>{txn.balance_after == null ? "-" : formatMoney(txn.balance_after)}</TableCell>
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
  return Math.max(1, Math.ceil(rowCount / AI_ROWS_PER_REQUEST));
}

function isBankOrCreditCardAccountType(accountType: string | null | undefined) {
  const normalized = String(accountType || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  return normalized === "bank" || normalized === "creditcard";
}

function isCreditCardAccountType(accountType: string | null | undefined) {
  const normalized = String(accountType || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  return normalized === "creditcard";
}

function isBankOrCreditCardAccountLabel(accountName: string | null | undefined) {
  return /\b(bank|checking|savings|cash|credit card|boa|amex|american express|capital one|us bank|vystar)\b/i.test(
    String(accountName || "")
  );
}

function isBankAccountNumberRange(accountNumber: string | null | undefined) {
  const digits = String(accountNumber || "").replace(/\D+/g, "");
  if (!digits) return false;
  const code = Number(digits);
  return Number.isFinite(code) && code >= 1000 && code <= 1099;
}

function isWorkbookBankOrCreditCardRow(row: WorkbookPreviewRow) {
  if (row.account.account_type) {
    return isBankOrCreditCardAccountType(row.account.account_type);
  }
  return Boolean(
    row.txn.is_bank_line ||
      isBankOrCreditCardAccountLabel(row.account.account_name) ||
      isBankAccountNumberRange(row.account.account_number)
  );
}

function formatAccountReviewProgress(progress: AccountReviewProgress, jobId?: string | null) {
  if (progress.total === 100) {
    const suffix = jobId ? ` (job ${jobId})` : "";
    if (progress.current >= 100) return `AI review complete${suffix}`;
    return `AI review ${progress.current.toLocaleString("en-US")}% complete${suffix}`;
  }
  if (progress.current >= progress.total) {
    return `Finalizing AI review after ${progress.total.toLocaleString("en-US")} chunk${progress.total === 1 ? "" : "s"}...`;
  }
  return `AI chunk ${progress.current.toLocaleString("en-US")} of ${progress.total.toLocaleString("en-US")}`;
}

function applySuggestionKey(suggestion: Pick<GLAccountSuggestion, "row_number" | "target_field">) {
  return `${suggestion.row_number}-${suggestion.target_field || "split_account"}`;
}

function countChangedSuggestions(suggestions: GLAccountSuggestion[]) {
  return suggestions.filter(isChangedSuggestion).length;
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

function normalizeRowNumbers(values: Array<number | string | null | undefined>) {
  return Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0)
        .map((value) => Math.trunc(value))
    )
  ).sort((a, b) => a - b);
}

function getAiReviewChunkRowNumbers(chunk: AiReviewChunk) {
  if (chunk.row_numbers?.length) {
    return normalizeRowNumbers(chunk.row_numbers);
  }

  const start = Number(chunk.start_row);
  const end = Number(chunk.end_row);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return [];
  }

  return Array.from(
    { length: Math.max(0, Math.trunc(end) - Math.trunc(start) + 1) },
    (_, index) => Math.trunc(start) + index
  );
}

function getAiReviewMissingRowNumbers(
  aiReview: GLAccountSuggestionsResponse["ai_review"]
) {
  if (!aiReview) return [];

  const explicitFailedRows = normalizeRowNumbers(aiReview.failed_row_numbers ?? []);
  if (explicitFailedRows.length > 0) return explicitFailedRows;

  const failedRows = [
    ...(aiReview.chunks ?? [])
      .filter((chunk) => chunk.status === "failed" || Boolean(chunk.error))
      .flatMap(getAiReviewChunkRowNumbers),
    ...(aiReview.escalation?.chunks ?? [])
      .filter((chunk) => chunk.status === "failed" || Boolean(chunk.error))
      .flatMap(getAiReviewChunkRowNumbers),
  ];
  return normalizeRowNumbers(failedRows);
}

function mergeAiRetryAccountSuggestions(
  previous: GLAccountSuggestionsResponse,
  retry: GLAccountSuggestionsResponse,
  retryRowNumbers: number[]
): GLAccountSuggestionsResponse {
  const retryRows = new Set(normalizeRowNumbers(retryRowNumbers));
  if (retryRows.size === 0) return retry;

  const retrySuggestionByRow = new Map<number, GLAccountSuggestion>();
  for (const suggestion of retry.suggestions ?? []) {
    if (retryRows.has(suggestion.row_number)) {
      retrySuggestionByRow.set(suggestion.row_number, suggestion);
    }
  }

  const mergedSuggestions: GLAccountSuggestion[] = [];
  const seenRows = new Set<number>();
  for (const suggestion of previous.suggestions ?? []) {
    const retrySuggestion = retryRows.has(suggestion.row_number)
      ? retrySuggestionByRow.get(suggestion.row_number)
      : null;
    const nextSuggestion = retrySuggestion ?? suggestion;
    mergedSuggestions.push(nextSuggestion);
    seenRows.add(nextSuggestion.row_number);
  }
  for (const suggestion of retry.suggestions ?? []) {
    if (retryRows.has(suggestion.row_number) && !seenRows.has(suggestion.row_number)) {
      mergedSuggestions.push(suggestion);
      seenRows.add(suggestion.row_number);
    }
  }

  const previousAi = previous.ai_review;
  const retryAi = retry.ai_review;
  const aiReview = previousAi && retryAi
    ? mergeAiRetryReviewMetadata(previousAi, retryAi, retryRows)
    : retryAi ?? previousAi ?? null;

  return {
    ...retry,
    suggestions: mergedSuggestions,
    suggestion_count: mergedSuggestions.length,
    changed_suggestion_count: countChangedSuggestions(mergedSuggestions),
    manual_review_count: mergedSuggestions.filter((suggestion) => suggestion.requires_manual_review).length,
    ai_review: aiReview,
  };
}

function mergeAiRetryReviewMetadata(
  previousAi: AiReview,
  retryAi: AiReview,
  retryRows: Set<number>
): AiReview {
  const keptPreviousChunks = (previousAi.chunks ?? []).filter((chunk) => {
    const rowNumbers = getAiReviewChunkRowNumbers(chunk);
    return !rowNumbers.some((rowNumber) => retryRows.has(rowNumber));
  });
  const chunks = [...keptPreviousChunks, ...(retryAi.chunks ?? [])].sort(
    (left, right) => (left.start_row ?? 0) - (right.start_row ?? 0)
  );

  const reviewedRowNumbers = normalizeRowNumbers(
    chunks
      .filter((chunk) => chunk.status === "completed")
      .flatMap(getAiReviewChunkRowNumbers)
  );
  const failedRowNumbers = normalizeRowNumbers(
    chunks
      .filter((chunk) => chunk.status === "failed" || Boolean(chunk.error))
      .flatMap(getAiReviewChunkRowNumbers)
  );
  const requestedRowNumbers = normalizeRowNumbers([
    ...(previousAi.requested_row_numbers ?? []),
    ...(retryAi.requested_row_numbers ?? []),
    ...retryRows,
  ]);

  const aiSuggestionByRow = new Map<number, AiReview["suggestions"][number]>();
  for (const suggestion of previousAi.suggestions ?? []) {
    if (!retryRows.has(suggestion.row_number)) {
      aiSuggestionByRow.set(suggestion.row_number, suggestion);
    }
  }
  for (const suggestion of retryAi.suggestions ?? []) {
    aiSuggestionByRow.set(suggestion.row_number, suggestion);
  }
  const aiSuggestions = [...aiSuggestionByRow.values()].sort(
    (left, right) => left.row_number - right.row_number
  );

  const failedChunkCount = chunks.filter(
    (chunk) => chunk.status === "failed" || Boolean(chunk.error)
  ).length;

  return {
    ...previousAi,
    ...retryAi,
    running: false,
    status: failedChunkCount > 0 ? "completed_with_errors" : "completed",
    error: failedChunkCount > 0
      ? retryAi.error || previousAi.error || "One or more AI review chunks failed."
      : null,
    chunks,
    requested_row_numbers: requestedRowNumbers,
    requested_row_count: requestedRowNumbers.length,
    reviewed_row_numbers: reviewedRowNumbers,
    reviewed_row_count: reviewedRowNumbers.length,
    failed_row_numbers: failedRowNumbers,
    submitted_chunk_count: chunks.length,
    completed_chunk_count: chunks.filter((chunk) => chunk.status === "completed").length,
    failed_chunk_count: failedChunkCount,
    suggestions: aiSuggestions,
    suggestion_count: aiSuggestions.length,
    retry_row_numbers: retryAi.retry_row_numbers ?? [...retryRows],
  };
}

function getAiReviewRunState(
  response: GLAccountSuggestionsResponse | null,
  isLoading: boolean,
  useAiReview: boolean
): AiReviewRunState {
  if (!useAiReview) return "disabled";
  if (isLoading) return "running";
  if (!response) return "not_run";

  const aiReview = response.ai_review;
  if (!aiReview || !aiReview.enabled) return "not_run";

  const completedChunks = aiReview.completed_chunk_count ?? 0;
  const failedChunks = aiReview.failed_chunk_count ?? 0;
  const hasChunkError = (aiReview.chunks ?? []).some((chunk) => Boolean(chunk.error));
  const hasEscalationError = Boolean(aiReview.escalation?.error) ||
    (aiReview.escalation?.chunks ?? []).some((chunk) => Boolean(chunk.error));
  const reviewedRows = aiReview.reviewed_row_count > 0 ||
    (aiReview.reviewed_row_numbers?.length ?? 0) > 0 ||
    (aiReview.suggestions?.length ?? 0) > 0 ||
    completedChunks > 0;

  if (!aiReview.available) return reviewedRows ? "incomplete" : "not_run";
  if (aiReview.error || failedChunks > 0 || hasChunkError || hasEscalationError) {
    return reviewedRows ? "incomplete" : "not_run";
  }

  const requestedRows = aiReview.requested_row_count ??
    aiReview.total_transaction_count ??
    response.transaction_count;
  if (requestedRows > 0 && !reviewedRows) return "not_run";
  if (requestedRows > 0 && (aiReview.reviewed_row_count ?? 0) < requestedRows) {
    return reviewedRows ? "incomplete" : "not_run";
  }

  return "completed";
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

  console.info("[GL Upload] AI review notice.", {
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
  console.error("[GL Upload] AI review request failed.", {
    ...context,
    tokenOrQuotaLimitLikely: isTokenOrQuotaLimitMessage(message),
    message,
    error,
  });
}

function getGeminiReviewIssueMessages(response: GLAccountSuggestionsResponse) {
  const aiReview = response.ai_review;
  if (!aiReview) return ["AI review metadata was missing from the response"];

  const issues: string[] = [];
  if (!aiReview.available) {
    issues.push("AI review was unavailable");
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
    issues.push(`AI escalation: ${aiReview.escalation.error}`);
  }

  for (const chunk of aiReview.escalation?.chunks ?? []) {
    if (chunk.error) {
      issues.push(`Escalation rows ${chunk.start_row}-${chunk.end_row}: ${chunk.error}`);
    }
  }

  return issues;
}

function formatGeminiReviewIssueNotice(issues: string[]) {
  const firstIssue = issues[0] ?? "Unknown AI review failure";
  const quotaHint = issues.some(isTokenOrQuotaLimitMessage)
    ? " This looks like a token, quota, or rate-limit issue."
    : "";
  return `AI review did not finish: ${firstIssue}${quotaHint} The GL upload was still staged.`;
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
  aiReviewRunState,
  onRerun,
  canRerun = false,
  rerunLabel = "Rerun Review",
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
  aiReviewRunState: AiReviewRunState;
  onRerun?: () => void;
  canRerun?: boolean;
  rerunLabel?: string;
  onApplySuggestedTarget?: (suggestion: GLAccountSuggestion) => void;
  onUnapplySuggestedTarget?: (suggestion: GLAccountSuggestion) => void;
  applyingSuggestionKey?: string | null;
  appliedSuggestionRows?: Set<number>;
}) {
  const previewRows = useMemo(() => sortAccountSuggestionRows(suggestions), [suggestions]);
  const modelLoaded = response?.xgboost_model_status?.model_loaded;
  const aiReview = response?.ai_review;
  const missingAiReviewRowCount = getAiReviewMissingRowNumbers(aiReview).length;
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
    ? `AI reviewed ${aiReview.suggestion_count.toLocaleString("en-US")}/${aiReview.reviewed_row_count.toLocaleString("en-US")}${
        aiReview.escalation
          ? ` + escalation ${aiReview.escalation.reviewed_row_count.toLocaleString("en-US")}`
          : ""
      }`
    : null;
  if (!response && !isLoading && !error && !onRerun) {
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
              : isLoading
                ? "Reviewing imported rows against the shared chart of accounts"
                : "Review imported rows against the shared chart of accounts"}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {onRerun && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRerun}
              disabled={!canRerun || isLoading}
            >
              <RotateCcw className="h-4 w-4" />
              {isLoading ? "Reviewing..." : rerunLabel}
            </Button>
          )}
          {!isLoading && isAiReviewPendingState(aiReviewRunState) && (
            <Badge variant={aiReviewRunState === "incomplete" ? "destructive" : "secondary"}>
              {formatAiReviewPendingLabel(aiReviewRunState)}
            </Badge>
          )}
          {!isLoading && missingAiReviewRowCount > 0 && (
            <Badge variant="secondary">
              {missingAiReviewRowCount.toLocaleString("en-US")} missing AI rows
            </Badge>
          )}
          <Badge variant={modelLoaded ? "outline" : "secondary"}>
            {modelLoaded ? "XGBoost loaded" : "XGBoost unavailable · AI can still run"}
          </Badge>
          {aiReview?.max_rows != null && (
            <Badge variant="secondary">
              AI test cap: {aiReview.max_rows.toLocaleString("en-US")} rows
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
          AI review did not finish: {aiReview.error}
        </div>
      )}

      {aiReview?.scope_note && (
        <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-400/40 dark:bg-blue-950/40 dark:text-blue-200">
          {aiReview.scope_note}
        </div>
      )}

      {geminiReviewedRowsLabel && (
        <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-400/40 dark:bg-blue-950/40 dark:text-blue-200">
          <div className="font-medium">AI test rows reviewed</div>
          <div className="mt-1 font-mono text-xs">{geminiReviewedRowsLabel}</div>
        </div>
      )}

      {aiReview?.test_forced_manual_review_enabled && forcedManualReviewRowNumber && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-400/40 dark:bg-red-950/40 dark:text-red-200">
          <div className="font-medium">AI suggested manual review</div>
          <div className="mt-1">
            Test row {forcedManualReviewRowNumber} was forced to Manual review so this path can be tested.
          </div>
        </div>
      )}

      {aiReview?.test_empty_current_target_suggestion_enabled && emptyCurrentTargetRowNumber && (
        <div className="mb-3 rounded-md border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800 dark:border-violet-400/40 dark:bg-violet-950/40 dark:text-violet-200">
          <div className="font-medium">AI suggested an account from memo with blank transaction Name</div>
          <div className="mt-1">
            Test row {emptyCurrentTargetRowNumber} has a blank transaction Name/payee and an empty current target. AI suggests {emptyCurrentTargetSuggestionLabel} from the memo/account context, but still requires manual review.
          </div>
          {emptyCurrentTargetMemo && (
            <div className="mt-1 font-mono text-xs" title={emptyCurrentTargetMemo}>
              Memo: {emptyCurrentTargetMemo}
            </div>
          )}
        </div>
      )}

      {aiReview && !aiReview.error && aiReview.reviewed_row_count === 0 && (
        <div className="mb-3 rounded-md border border-muted bg-muted/30 p-3 text-sm text-muted-foreground">
          AI had no parsed rows to review.
        </div>
      )}

      {isLoading && (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          {progressLabel ?? "Reviewing account suggestions..."}
        </div>
      )}

      {!isLoading && !error && response && suggestions.length === 0 && (
        <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          {isAiReviewPendingState(aiReviewRunState)
            ? `${formatAiReviewPendingLabel(aiReviewRunState)}. ${
                missingAiReviewRowCount > 0
                  ? "Run Missing AI Batch to retry only the missing rows."
                  : "Rerun AI Review to check for corrections."
              }`
            : "No account corrections were flagged."}
        </div>
      )}

      {!isLoading && previewRows.length > 0 && (
        <Table containerClassName="max-h-[520px] rounded-md border" className="[&_td]:whitespace-normal [&_td]:break-words [&_td]:min-w-[120px]">
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
                const suggestedTargetTitle = formatSuggestionLabel(suggestion, aiReviewRunState);
                const rowTitle = formatAccountSuggestionTitle(suggestion, aiReviewRunState);
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
                    isChangedSuggestion(suggestion) &&
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
                  <TableCell className="font-medium" title={`Row ${suggestion.row_number}`}>
                    <div>{suggestion.row_number}</div>
                    {wasGeminiReviewed && (
                      <Badge variant="outline" className="mt-1 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-400/40 dark:bg-blue-950/40 dark:text-blue-200">
                        AI test
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
                    <div className="" title={transactionTitle}>
                      {suggestion.name || suggestion.memo || suggestion.transaction_type || "-"}
                    </div>
                    <div className="text-xs text-muted-foreground" title={transactionTitle}>
                      {suggestion.date || "-"} · {suggestion.transaction_type || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[360px]" title={descriptionTitle}>
                    <div
                      className="text-sm"
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
                  <TableCell className="text-right font-medium" title={formatMoney(suggestion.amount)}>
                    {formatMoney(suggestion.amount)}
                  </TableCell>
                  <TableCell className="max-w-[240px]" title={currentTargetTitle}>
                    {currentTargetTitle}
                  </TableCell>
                  <TableCell className="max-w-[260px]" title={suggestedTargetTitle}>
                    <div className="" title={suggestedTargetTitle}>
                      {suggestedTargetTitle}
                    </div>
                    {wasAiSuggestedManualReview && (
                      <div className="mt-1 text-xs font-medium text-red-700 dark:text-red-300">
                        AI suggested manual review
                      </div>
                    )}
                    {wasEmptyTargetManualSuggestion && (
                      <div className="mt-1 text-xs font-medium text-violet-700 dark:text-violet-300">
                        AI used memo/account context; manual review required
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
  aiReviewRunState,
  onClose,
}: {
  open: boolean;
  filename: string;
  rows: WorkbookPreviewRow[];
  aiReviewRunState: AiReviewRunState;
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
            <p className="text-sm font-medium">{filename}</p>
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

      <Table containerClassName="overflow-auto" className="[&_td]:whitespace-normal [&_td]:break-words [&_td]:min-w-[120px]">
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
                  row.txn.account_review,
                  aiReviewRunState
                )}
              >
                <TableCell className="">{row.txn.entry_date || "-"}</TableCell>
                <TableCell className="max-w-[220px]">
                  {formatAccountLabel(row.account)}
                </TableCell>
                <TableCell className="">{row.txn.transaction_type || "-"}</TableCell>
                <TableCell className="max-w-[220px]" title={row.txn.name || ""}>
                  {row.txn.name || "-"}
                </TableCell>
                <TableCell className="max-w-[260px]" title={row.txn.memo || ""}>
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
                    <SuggestedAccountValue suggestion={row.suggestion} aiReviewRunState={aiReviewRunState} />
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
                      <span className="text-muted-foreground">
                        {formatMissingSuggestedTargetLabel(row.txn.account_review, aiReviewRunState)}
                      </span>
                      <ConfidenceValue review={row.txn.account_review} className="mt-1" />
                    </div>
                  ) : (
                    <span className="text-muted-foreground">
                      {formatMissingSuggestedTargetLabel(null, aiReviewRunState)}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {formatMoney(row.txn.amount)}
                </TableCell>
                <TableCell className="text-right">
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
  aiReviewRunState,
}: {
  suggestion: GLAccountSuggestion | null;
  fallbackNumber: string | null;
  fallbackName: string | null;
  aiReviewRunState: AiReviewRunState;
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
          <SuggestedAccountValue suggestion={suggestion} aiReviewRunState={aiReviewRunState} />
        ) : (
          <span className="text-muted-foreground">{formatMissingSuggestedTargetLabel(null, aiReviewRunState)}</span>
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
      className={`min-w-0 ${muted ? "text-muted-foreground" : "text-foreground"}`}
      title={formatSuggestionAccount(number, name)}
    >
      {formatSuggestionAccount(number, name)}
    </span>
  );
}

function SuggestedAccountValue({
  suggestion,
  aiReviewRunState,
}: {
  suggestion: GLAccountSuggestion;
  aiReviewRunState: AiReviewRunState;
}) {
  const suggestedNumber = getVisibleSuggestedTargetNumber(suggestion);
  const suggestedName = getVisibleSuggestedTargetName(suggestion);
  const noChangeLabel = formatNoChangeSuggestionLabel(suggestion, aiReviewRunState);

  if (shouldShowAiPendingForSuggestion(suggestion, aiReviewRunState)) {
    return (
      <div className="min-w-0">
        <span className="font-medium text-violet-700 dark:text-violet-300">
          {formatAiReviewPendingLabel(aiReviewRunState)}
        </span>
        <ConfidenceValue suggestion={suggestion} className="mt-1" />
      </div>
    );
  }
  if (isAiFallbackSuggestion(suggestion) && !suggestedNumber) {
    return (
      <div className="min-w-0">
        <span className="font-medium text-violet-700 dark:text-violet-300">AI review required</span>
        <ConfidenceValue suggestion={suggestion} className="mt-1" />
      </div>
    );
  }
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
        <span className="text-muted-foreground">{noChangeLabel}</span>
        <ConfidenceValue suggestion={suggestion} className="mt-1" />
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <span
        className="block min-w-0 font-medium text-blue-700 dark:text-blue-300"
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
  const hasAiFallbackReview = isAiFallbackSuggestion(suggestion);
  const hasSplitLookupReview = isSplitLookupSuggestion(suggestion);
  const hasBankTransferReview = isBankTransferSuggestion(suggestion);
  const hasPlainSuggestion = Boolean(
    isMarkedSuggestedChange(suggestion) &&
      !hasXgboostSuggestion &&
      !isGeminiSuggestion(suggestion) &&
      !hasSplitLookupReview &&
      !hasBankTransferReview
  );

  if (
    suggestion.requires_manual_review &&
    isGeminiSuggestion(suggestion) &&
    suggestion.rule === "gemini_ai_review_manual"
  ) {
    return <Badge variant="destructive">AI manual review</Badge>;
  }
  if (suggestion.requires_manual_review && hasGeminiSuggestion) {
    return <Badge className="bg-violet-600 text-white hover:bg-violet-600 dark:bg-violet-500 dark:text-violet-950 dark:hover:bg-violet-500">AI manual suggestion</Badge>;
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
  if (hasAiFallbackReview) {
    return <Badge className="bg-violet-600 text-white hover:bg-violet-600 dark:bg-violet-500 dark:text-violet-950 dark:hover:bg-violet-500">AI review</Badge>;
  }
  if (hasSplitLookupReview) {
    if (isOneToOneSplitLookupSuggestion(suggestion)) return null;
    return <Badge className="bg-cyan-600 text-white hover:bg-cyan-600 dark:bg-cyan-500 dark:text-cyan-950 dark:hover:bg-cyan-500">Split Lookup</Badge>;
  }
  if (hasBankTransferReview) {
    return <Badge className="bg-amber-600 text-white hover:bg-amber-600 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-500">Bank transfer</Badge>;
  }
  if (suggestion.requires_manual_review) {
    return <Badge variant="destructive">Review</Badge>;
  }
  if (isGeminiSuggestion(suggestion)) {
    return <Badge className="bg-violet-600 text-white hover:bg-violet-600 dark:bg-violet-500 dark:text-violet-950 dark:hover:bg-violet-500">AI</Badge>;
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

function isChangedSuggestion(suggestion: GLAccountSuggestion) {
  const suggestedCode = getVisibleSuggestedTargetNumber(suggestion)?.trim();
  const currentCode = (suggestion.current_target_account_number ?? "").trim();
  return Boolean(
    suggestedCode &&
      suggestedCode !== "MANUAL_REVIEW" &&
      suggestedCode !== currentCode
  );
}

function PreviewReviewBadge({ review }: { review: ImportPreviewAccountReview }) {
  if (review.source === "bank_transfer") {
    return <Badge className="bg-amber-600 text-white hover:bg-amber-600 dark:bg-amber-500 dark:text-amber-950 dark:hover:bg-amber-500">Bank transfer</Badge>;
  }
  if (review.source === "xgboost") {
    return <Badge className="bg-blue-600 text-white hover:bg-blue-600 dark:bg-blue-500 dark:text-blue-950 dark:hover:bg-blue-500">XGBoost</Badge>;
  }
  if (review.source === "account_split_lookup") {
    if (isOneToOneSplitLookupReview(review)) return null;
    return <Badge className="bg-cyan-600 text-white hover:bg-cyan-600 dark:bg-cyan-500 dark:text-cyan-950 dark:hover:bg-cyan-500">Split Lookup</Badge>;
  }
  if (review.requires_human_review) {
    return <Badge variant="destructive">Human review</Badge>;
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
    isWorkbookBankOrCreditCardRow(row) &&
    ((row.suggestion ? isXgboostSuggestion(row.suggestion) : false) ||
      row.txn.account_review?.source === "xgboost")
  );
}

function isWorkbookQuickBooksRuleReviewRow(row: WorkbookPreviewRow) {
  return (
    isWorkbookBankOrCreditCardRow(row) &&
    row.txn.account_review?.source === "quickbooks_rule"
  );
}

function isWorkbookSplitLookupRow(row: WorkbookPreviewRow) {
  return (
    isWorkbookBankOrCreditCardRow(row) &&
    (row.txn.account_review?.source === "account_split_lookup" ||
      row.suggestion?.review_source === "account_split_lookup")
  );
}

function isWorkbookBankTransferRow(row: WorkbookPreviewRow) {
  return Boolean(
    isWorkbookBankOrCreditCardRow(row) &&
      ((row.suggestion && isBankTransferSuggestion(row.suggestion)) ||
        row.txn.account_review?.source === "bank_transfer")
  );
}

function isWorkbookDifferenceRow(row: WorkbookPreviewRow) {
  return isWorkbookBankOrCreditCardRow(row) && hasSuggestedTargetForReviewFinder(row);
}

const DIFFERENCE_FINDER_STATUS_ORDER: Record<string, number> = {
  "1-to-1 mapping": 0,
  "Bank transfer": 1,
  "QB Rule": 2,
  "Split Lookup": 3,
  XGBoost: 4,
  "XGBoost suggested": 5,
  "AI manual suggestion": 6,
  "AI manual review": 7,
  AI: 8,
  "AI review": 9,
  "AI running": 10,
  "AI incomplete": 11,
  "AI not run": 12,
  "Human review": 13,
  "Manual review": 14,
  Suggested: 15,
  Checked: 16,
  Review: 17,
};

const DIFFERENCE_FINDER_FILTERS: Array<{
  value: DifferenceFinderFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "quickbooks_rule", label: "QB" },
  { value: "bank_transfer", label: "Transfer" },
  { value: "split_lookup", label: "1-to-1" },
  { value: "xgboost", label: "XGBoost" },
  { value: "ai", label: "AI" },
  { value: "ai_changed", label: "AI changed" },
  { value: "human_review", label: "Human" },
];

function differenceFinderFilterLabel(filter: DifferenceFinderFilter) {
  return (
    DIFFERENCE_FINDER_FILTERS.find((item) => item.value === filter)?.label ??
    "All"
  );
}

function buildDifferenceFinderStats(
  differenceRows: WorkbookPreviewRow[],
  comparisonRows: WorkbookPreviewRow[],
  aiReviewRunState: AiReviewRunState
) {
  return Object.fromEntries(
    DIFFERENCE_FINDER_FILTERS.map((filter) => {
      const count =
        filter.value === "all"
          ? differenceRows.length
          : differenceRows.filter((row) =>
              rowMatchesDifferenceFinderFilter(
                row,
                filter.value,
                aiReviewRunState
              )
            ).length;
      const total = comparisonRows.filter((row) =>
        rowMatchesDifferenceFinderTotalFilter(
          row,
          filter.value,
          aiReviewRunState
        )
      ).length;
      return [filter.value, { count, total }];
    })
  ) as Record<DifferenceFinderFilter, { count: number; total: number }>;
}

function formatDifferenceFinderStat(stat?: { count: number; total: number }) {
  const count = stat?.count ?? 0;
  const total = stat?.total ?? 0;
  const percent = total > 0 ? Math.round((count / total) * 100) : 0;
  return `${count.toLocaleString("en-US")}/${total.toLocaleString("en-US")} ${percent}%`;
}

function rowMatchesDifferenceFinderFilter(
  row: WorkbookPreviewRow,
  filter: DifferenceFinderFilter,
  aiReviewRunState: AiReviewRunState
) {
  if (filter === "all") return true;
  if (filter === "quickbooks_rule") return isWorkbookQuickBooksRuleReviewRow(row);
  if (filter === "bank_transfer") return isWorkbookBankTransferRow(row);
  if (filter === "split_lookup") return isWorkbookSplitLookupRow(row);
  if (filter === "xgboost") return isWorkbookXgboostReviewRow(row);
  if (filter === "ai") return isWorkbookAiReviewRow(row);
  if (filter === "ai_changed") return isWorkbookAiChangedReviewRow(row);
  if (filter === "human_review") return isWorkbookHumanReviewRow(row);
  return formatReviewFinderStatus(row, aiReviewRunState) === filter;
}

function rowMatchesDifferenceFinderTotalFilter(
  row: WorkbookPreviewRow,
  filter: DifferenceFinderFilter,
  aiReviewRunState: AiReviewRunState
) {
  if (filter === "all") {
    return isWorkbookDifferenceFinderComparisonRow(row, aiReviewRunState);
  }
  if (filter === "ai_changed") return isWorkbookAiReviewRow(row);
  return rowMatchesDifferenceFinderFilter(row, filter, aiReviewRunState);
}

function isWorkbookDifferenceFinderComparisonRow(
  row: WorkbookPreviewRow,
  aiReviewRunState: AiReviewRunState
) {
  return (
    isWorkbookBankOrCreditCardRow(row) &&
    (hasSuggestedTargetForReviewFinder(row) ||
      isWorkbookQuickBooksRuleReviewRow(row) ||
      isWorkbookBankTransferRow(row) ||
      isWorkbookSplitLookupRow(row) ||
      isWorkbookXgboostReviewRow(row) ||
      isWorkbookAiReviewRow(row) ||
      isWorkbookHumanReviewRow(row) ||
      formatReviewFinderStatus(row, aiReviewRunState) !== "Checked")
  );
}

function sortDifferenceFinderRows(rows: WorkbookPreviewRow[]) {
  return [...rows].sort((left, right) => {
    const leftStatus = formatReviewFinderStatus(left);
    const rightStatus = formatReviewFinderStatus(right);
    const statusCompare =
      differenceFinderStatusRank(leftStatus) -
      differenceFinderStatusRank(rightStatus);
    if (statusCompare !== 0) return statusCompare;

    const statusTextCompare = compareFinderText(leftStatus, rightStatus);
    if (statusTextCompare !== 0) return statusTextCompare;

    const accountCompare = compareFinderText(
      formatAccountLabel(left.account),
      formatAccountLabel(right.account)
    );
    if (accountCompare !== 0) return accountCompare;

    const dateCompare = compareFinderText(
      left.txn.entry_date,
      right.txn.entry_date
    );
    if (dateCompare !== 0) return dateCompare;

    return Number(left.txn.entry_id ?? 0) - Number(right.txn.entry_id ?? 0);
  });
}

function differenceFinderStatusRank(status: string) {
  return DIFFERENCE_FINDER_STATUS_ORDER[status] ?? 50;
}

function sortAccountSuggestionRows(rows: GLAccountSuggestion[]) {
  return [...rows].sort((left, right) => {
    const priorityCompare =
      accountSuggestionReviewPriority(left) -
      accountSuggestionReviewPriority(right);
    if (priorityCompare !== 0) return priorityCompare;
    return Number(left.row_number ?? 0) - Number(right.row_number ?? 0);
  });
}

function accountSuggestionReviewPriority(suggestion: GLAccountSuggestion) {
  if (isBankTransferSuggestion(suggestion)) return 0;
  if (isOneToOneSplitLookupSuggestion(suggestion)) return 1;
  if (
    suggestion.rule === "quickbooks_rule" ||
    suggestion.review_source === "quickbooks_rule"
  ) {
    return 2;
  }
  if (isXgboostSuggestion(suggestion)) return 3;
  if (
    isGeminiSuggestion(suggestion) ||
    isAiFallbackSuggestion(suggestion) ||
    suggestion.ai_provider
  ) {
    return 4;
  }
  if (isHumanReviewSuggestion(suggestion)) return 5;
  return 6;
}

function compareFinderText(
  left: string | number | null | undefined,
  right: string | number | null | undefined
) {
  return String(left ?? "").localeCompare(String(right ?? ""), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function formatReviewFinderStatus(
  row: WorkbookPreviewRow,
  aiReviewRunState: AiReviewRunState = "completed"
) {
  const suggestion = row.suggestion ?? undefined;
  const review = row.txn.account_review ?? undefined;

  if (suggestion) {
    if (isOneToOneSplitLookupSuggestion(suggestion)) return "1-to-1 mapping";
    if (suggestion.rule === "quickbooks_rule" || suggestion.review_source === "quickbooks_rule") return "QB Rule";
    if (isBankTransferSuggestion(suggestion)) return "Bank transfer";
    if (isSplitLookupSuggestion(suggestion)) return suggestion.review_label || "Split Lookup";
    if (isXgboostSuggestion(suggestion)) return shouldUseXgboostFallbackSuggestion(suggestion) ? "XGBoost suggested" : "XGBoost";
    if (suggestion.requires_manual_review && isGeminiSuggestion(suggestion) && getVisibleSuggestedTargetNumber(suggestion)) {
      return "AI manual suggestion";
    }
    if (suggestion.requires_manual_review && isGeminiSuggestion(suggestion)) return "AI manual review";
    if (isAiFallbackSuggestion(suggestion)) {
      return isAiReviewPendingState(aiReviewRunState)
        ? formatAiReviewPendingLabel(aiReviewRunState)
        : "AI review";
    }
    if (isGeminiSuggestion(suggestion)) return "AI";
    if (isHumanReviewSuggestion(suggestion)) return "Manual review";
    if (suggestion.review_label) return suggestion.review_label;
    return formatSuggestionStatus(suggestion);
  }

  if (review) {
    if (isOneToOneSplitLookupReview(review)) return "1-to-1 mapping";
    if (review.source === "bank_transfer") return "Bank transfer";
    if (review.source === "quickbooks_rule") return "QB Rule";
    if (review.source === "account_split_lookup") return "Split Lookup";
    if (review.source === "xgboost") return "XGBoost";
    if (review.requires_human_review) return "Human review";
    if (review.requires_ai_review) {
      return isAiReviewPendingState(aiReviewRunState)
        ? formatAiReviewPendingLabel(aiReviewRunState)
        : "AI review";
    }
    if (review.categorized) return "Checked";
  }

  return "Review";
}

function hasSuggestedTargetForReviewFinder(row: WorkbookPreviewRow) {
  if (row.suggestion) {
    const suggestedCode = getVisibleSuggestedTargetNumber(row.suggestion)?.trim();
    const suggestedName = getVisibleSuggestedTargetName(row.suggestion)?.trim();
    const currentCode = (row.suggestion.current_target_account_number ?? "").trim();
    const currentName = (row.suggestion.current_target_account_name ?? "").trim();

    if (!suggestedCode && !suggestedName) return false;
    if (suggestedCode === "MANUAL_REVIEW" || suggestedName === "MANUAL_REVIEW") return false;
    if (suggestedCode && currentCode && suggestedCode === currentCode) return false;
    if (!suggestedCode && suggestedName && currentName && suggestedName === currentName) return false;
    return true;
  }

  const review = row.txn.account_review;
  const suggestedCode = review?.suggested_account_number?.trim();
  const suggestedName = review?.suggested_account_name?.trim();
  const currentCode = (review?.current_target_account_number ?? "").trim();
  const currentName = (review?.current_target_account_name ?? "").trim();

  if (!suggestedCode && !suggestedName) return false;
  if (suggestedCode === "MANUAL_REVIEW" || suggestedName === "MANUAL_REVIEW") return false;
  if (suggestedCode && currentCode && suggestedCode === currentCode) return false;
  if (!suggestedCode && suggestedName && currentName && suggestedName === currentName) return false;
  return true;
}

function isWorkbookAiReviewRow(row: WorkbookPreviewRow) {
  return Boolean(
    isWorkbookBankOrCreditCardRow(row) &&
      ((row.suggestion &&
        (isGeminiSuggestion(row.suggestion) ||
          isAiFallbackSuggestion(row.suggestion) ||
          row.suggestion.ai_provider)) ||
        row.txn.account_review?.requires_ai_review ||
        row.txn.account_review?.source === "gemini" ||
        row.txn.account_review?.source === "ai")
  );
}

function isWorkbookAiChangedReviewRow(row: WorkbookPreviewRow) {
  if (row.suggestion) {
    return isWorkbookAiReviewRow(row) && isChangedSuggestion(row.suggestion);
  }

  const review = row.txn.account_review;
  const suggestedCode = review?.suggested_account_number?.trim();
  const currentCode = (review?.current_target_account_number ?? "").trim();
  return Boolean(
    review &&
      isWorkbookAiReviewRow(row) &&
      suggestedCode &&
      suggestedCode !== "MANUAL_REVIEW" &&
      suggestedCode !== currentCode
  );
}

function isWorkbookHumanReviewRow(row: WorkbookPreviewRow) {
  return Boolean(
    isWorkbookBankOrCreditCardRow(row) &&
      (row.txn.account_review?.requires_human_review ||
        row.txn.account_review?.source === "manual_review" ||
        (row.suggestion ? isHumanReviewSuggestion(row.suggestion) : false))
  );
}

function formatReviewFinderMarker(
  kind: ReviewFinderKind,
  row: WorkbookPreviewRow,
  aiReviewRunState: AiReviewRunState = "completed"
) {
  const review = row.txn.account_review;
  if (kind === "ai_changed" || kind === "differences") {
    const current = formatReviewCurrentTarget(
      row.txn,
      row.suggestion ?? undefined,
      review
    );
    const suggested = formatReviewSuggestedTarget(
      row.suggestion ?? undefined,
      review,
      aiReviewRunState
    );
    const prefix = kind === "differences" ? "Change" : "AI changed";
    return `${prefix}: ${current} -> ${suggested}`;
  }
  if (kind === "quickbooks_rule" && review?.source === "quickbooks_rule") {
    return `review_source: ${review.source} | review_status: ${review.status}`;
  }
  if (kind === "split_lookup") {
    if (row.suggestion && isSplitLookupSuggestion(row.suggestion)) {
      return formatReviewMarker(row.suggestion, null);
    }
    if (review?.source === "account_split_lookup") {
      return `review_source: ${review.source} | review_status: ${review.status}`;
    }
  }
  if (kind === "ai") {
    if (
      row.suggestion &&
      (isGeminiSuggestion(row.suggestion) ||
        isAiFallbackSuggestion(row.suggestion) ||
        row.suggestion.ai_provider)
    ) {
      return formatReviewMarker(row.suggestion, null);
    }
    if (review && review.source !== "not_bank_transaction") {
      return `review_source: ${review.source} | review_status: ${review.status}`;
    }
  }
  if (kind === "xgboost" && review?.source === "xgboost") {
    return `review_source: ${review.source} | review_status: ${review.status}`;
  }
  if (kind === "human_review" && review?.requires_human_review) {
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

function isAiReviewPendingState(aiReviewRunState: AiReviewRunState) {
  return aiReviewRunState === "running" || aiReviewRunState === "not_run" || aiReviewRunState === "incomplete";
}

function formatAiReviewPendingLabel(aiReviewRunState: AiReviewRunState) {
  if (aiReviewRunState === "running") return "AI running";
  if (aiReviewRunState === "incomplete") return "AI incomplete";
  return "AI not run";
}

function isAiReviewedSuggestion(suggestion: GLAccountSuggestion) {
  const source = String(suggestion.review_source ?? "").toLowerCase();
  return (
    source === "ai" ||
    source === "gemini" ||
    suggestion.rule.startsWith("ai_") ||
    suggestion.rule.startsWith("gemini_ai_") ||
    Boolean(suggestion.ai_provider)
  );
}

function shouldShowAiPendingForSuggestion(
  suggestion: GLAccountSuggestion,
  aiReviewRunState: AiReviewRunState
) {
  if (!isAiReviewPendingState(aiReviewRunState)) return false;
  if (isAiReviewedSuggestion(suggestion)) return false;
  return (
    isAiFallbackSuggestion(suggestion) ||
    suggestion.rule === "needs_ai_review" ||
    suggestion.rule === "keep_current" ||
    suggestion.review_status === "needs_ai_review"
  );
}

function formatNoChangeSuggestionLabel(
  suggestion: GLAccountSuggestion,
  aiReviewRunState: AiReviewRunState = "completed"
) {
  return shouldShowAiPendingForSuggestion(suggestion, aiReviewRunState)
    ? formatAiReviewPendingLabel(aiReviewRunState)
    : "No change";
}

function formatMissingSuggestedTargetLabel(
  review?: ImportPreviewAccountReview | null,
  aiReviewRunState: AiReviewRunState = "completed"
) {
  if (review?.requires_ai_review) {
    return isAiReviewPendingState(aiReviewRunState)
      ? formatAiReviewPendingLabel(aiReviewRunState)
      : "AI review required";
  }
  if (!review && isAiReviewPendingState(aiReviewRunState)) {
    return formatAiReviewPendingLabel(aiReviewRunState);
  }
  return "No change";
}

function formatSuggestionLabel(
  suggestion: GLAccountSuggestion,
  aiReviewRunState: AiReviewRunState = "completed"
) {
  const suggestedNumber = getVisibleSuggestedTargetNumber(suggestion);
  const suggestedName = getVisibleSuggestedTargetName(suggestion);

  if (shouldShowAiPendingForSuggestion(suggestion, aiReviewRunState)) {
    return formatAiReviewPendingLabel(aiReviewRunState);
  }
  if (isAiFallbackSuggestion(suggestion) && !suggestedNumber) {
    return "AI review required";
  }
  if (suggestion.requires_manual_review && !suggestedNumber) {
    return "Manual review";
  }
  if (isNoChangeSuggestion(suggestion)) {
    return formatNoChangeSuggestionLabel(suggestion, aiReviewRunState);
  }
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
  review?: ImportPreviewAccountReview | null,
  aiReviewRunState: AiReviewRunState = "completed"
) {
  if (suggestion) return formatSuggestionLabel(suggestion, aiReviewRunState);
  if (review?.suggested_account_number || review?.suggested_account_name) {
    return formatSuggestionAccount(review.suggested_account_number, review.suggested_account_name);
  }
  return formatMissingSuggestedTargetLabel(review, aiReviewRunState);
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
    return "AI suggested manual review";
  }
  if (suggestion.requires_manual_review && hasGeminiSuggestion) {
    return "AI suggested an account; manual review required";
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
  if (isAiFallbackSuggestion(suggestion)) return "AI review required";
  if (isSplitLookupSuggestion(suggestion)) return "Split account lookup";
  if (isBankTransferSuggestion(suggestion)) return "Bank transfer";
  if (suggestion.requires_manual_review) return "Manual review required";
  if (isGeminiSuggestion(suggestion)) return "AI";
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

function isAiFallbackSuggestion(suggestion: GLAccountSuggestion) {
  return (
    suggestion.review_source === "ai_fallback" ||
    suggestion.review_status === "needs_ai_review" ||
    suggestion.rule === "amazon_ai_review" ||
    suggestion.rule === "aliexpress_ai_review"
  );
}

function isSplitLookupSuggestion(suggestion: GLAccountSuggestion) {
  return suggestion.review_source === "account_split_lookup";
}

function isBankTransferSuggestion(suggestion: GLAccountSuggestion) {
  return (
    suggestion.review_source === "bank_transfer" ||
    suggestion.rule === "bank_transfer_counterparty" ||
    suggestion.rule === "bank_transfer_paired" ||
    suggestion.rule === "bank_transfer_manual_review" ||
    String(suggestion.review_status ?? "").startsWith("bank_transfer_")
  );
}

function isOneToOneSplitLookupSuggestion(suggestion: GLAccountSuggestion) {
  if (!isSplitLookupSuggestion(suggestion)) return false;
  if (hasOneToOneMarker(suggestion.review_status, suggestion.review_label, suggestion.rule, suggestion.reason)) {
    return true;
  }
  return accountsReferToSameTarget(
    suggestion.current_target_account_number,
    suggestion.current_target_account_name,
    getVisibleSuggestedTargetNumber(suggestion),
    getVisibleSuggestedTargetName(suggestion)
  );
}

function isOneToOneSplitLookupReview(review: ImportPreviewAccountReview) {
  if (review.source !== "account_split_lookup") return false;
  if (hasOneToOneMarker(review.status, review.reason)) return true;
  return accountsReferToSameTarget(
    review.current_target_account_number,
    review.current_target_account_name,
    review.suggested_account_number,
    review.suggested_account_name
  );
}

function hasOneToOneMarker(...values: Array<string | null | undefined>) {
  return values.some((value) => /1\s*[-:]?\s*to\s*[-:]?\s*1|one[-_\s]?to[-_\s]?one/i.test(value ?? ""));
}

function accountsReferToSameTarget(
  currentNumber: string | null | undefined,
  currentName: string | null | undefined,
  suggestedNumber: string | null | undefined,
  suggestedName: string | null | undefined
) {
  const currentCode = normalizeAccountPart(currentNumber);
  const suggestedCode = normalizeAccountPart(suggestedNumber);
  if (currentCode && suggestedCode) return currentCode === suggestedCode;

  const currentLabel = normalizeAccountPart(currentName);
  const suggestedLabel = normalizeAccountPart(suggestedName);
  return Boolean(currentLabel && suggestedLabel && currentLabel === suggestedLabel);
}

function normalizeAccountPart(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function isHumanReviewSuggestion(suggestion: GLAccountSuggestion) {
  if (
    isXgboostSuggestion(suggestion) ||
    isGeminiSuggestion(suggestion) ||
    isAiFallbackSuggestion(suggestion) ||
    isBankTransferSuggestion(suggestion)
  ) {
    return false;
  }
  return (
    suggestion.review_source === "manual" ||
    suggestion.review_status === "manual_review" ||
    Boolean(suggestion.requires_manual_review && !getVisibleSuggestedTargetNumber(suggestion))
  );
}

function formatPreviewReviewStatus(review: ImportPreviewAccountReview) {
  if (review.requires_human_review) return "Human review required";
  if (review.requires_ai_review) return "AI review required";
  if (review.source === "bank_transfer") return "Bank transfer";
  if (review.source === "quickbooks_rule") return "QuickBooks rule";
  if (review.source === "account_split_lookup") return "Split account lookup";
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
  if (isSplitLookupSuggestion(suggestion)) return "account_split_lookup";
  if (isBankTransferSuggestion(suggestion)) return "bank_transfer";
  if (isGeminiSuggestion(suggestion)) return "AI";
  if (isAiFallbackSuggestion(suggestion)) return "ai_fallback";
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
  if (isAiFallbackSuggestion(suggestion)) return "needs_ai_review";
  if (isBankTransferSuggestion(suggestion)) {
    return isMarkedSuggestedChange(suggestion)
      ? "bank_transfer_suggested"
      : "bank_transfer_review";
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

function formatAccountSuggestionTitle(
  suggestion: GLAccountSuggestion,
  aiReviewRunState: AiReviewRunState = "completed"
) {
  const lines = [
    `Row: ${suggestion.row_number}`,
    formatSuggestionTransactionTitle(suggestion),
    `Amount: ${formatMoney(suggestion.amount)}`,
    `Current target: ${formatSuggestionAccount(
      suggestion.current_target_account_number,
      suggestion.current_target_account_name
    )}`,
    `Suggested target: ${formatSuggestionLabel(suggestion, aiReviewRunState)}`,
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
  review?: ImportPreviewAccountReview | null,
  aiReviewRunState: AiReviewRunState = "completed"
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
    `Suggested target: ${formatReviewSuggestedTarget(suggestion, review, aiReviewRunState)}`,
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
