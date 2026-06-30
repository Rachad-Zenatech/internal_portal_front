// src/pages/GeneralLedgerUpload.tsx

import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import type {
  ApplySuggestedTargetResponse,
  GLAccountSuggestion,
  GLAccountSuggestionsResponse,
  ImportPreview,
  ImportPreviewAccount,
  ImportPreviewAccountReview,
  ImportPreviewAccountTransaction,
  ManualGlEntryRequest,
} from "@/types/gl";
import {
  useBooks,
  useParseImport,
  useImportPreview,
  useGLAccountSuggestions,
  useDeleteImport,
  useAddManualEntry,
  useApplySuggestedTarget,
  useUnapplySuggestedTarget,
  useSaveImport,
} from "@/hooks/useGL";

import { Card, CardContent } from "@/components/ui/card";
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
  source_file_id: number;
  accounts_resolved: number;
  gl_entries: number;
  gl_entry_lines: number;
  bank_lines: number;
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

type AccountReviewProgress = {
  current: number;
  total: number;
};

type AccountReviewLogContext = {
  filename: string;
  companyName: string;
  formatCode: string;
  sourceFileId: number;
  useGemini: boolean;
};

const GEMINI_ROWS_PER_REQUEST = 50;
const GEMINI_CONCURRENCY_LIMIT = 3;
// Temporary testing flag: set to null to let Gemini AI review all selected rows.
const GEMINI_AI_TEST_REVIEW_MAX_ROWS: number | null = 25;
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
  const [bookId, setBookId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [useGeminiReview, setUseGeminiReview] = useState(true);

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
  const [appliedSuggestionChanges, setAppliedSuggestionChanges] = useState<
    Map<string, ApplySuggestedTargetResponse["applied_change"]>
  >(() => new Map());
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const parseRunIdRef = useRef(0);
  const glFileInputRef = useRef<HTMLInputElement | null>(null);

  // Queries & Mutations
  const { data: books = [], isLoading: isLoadingBooks, error: booksError } = useBooks();
  
  const sourceFileId = summary?.source_file_id ?? null;
  const companyIdForPreview = summary?.company_id ?? null;
  
  const { data: previewData, isLoading: isPreviewLoading } = useImportPreview(sourceFileId, companyIdForPreview);
  
  const parseImportMutation = useParseImport();
  const accountSuggestionsMutation = useGLAccountSuggestions();
  const deleteImportMutation = useDeleteImport();
  const addManualEntryMutation = useAddManualEntry();
  const applySuggestedTargetMutation = useApplySuggestedTarget();
  const unapplySuggestedTargetMutation = useUnapplySuggestedTarget();
  const saveImportMutation = useSaveImport();

  const [localPreview, setLocalPreview] = useState<ImportPreview | null>(null);

  useEffect(() => {
    if (previewData) {
      setLocalPreview(previewData);
      setShowWorkbookPreview(true);
    }
  }, [previewData]);

  // Handle URL Param selection
  useEffect(() => {
    const companyParam = new URLSearchParams(window.location.search).get("company_id");
    const requestedCompanyId = companyParam ? Number(companyParam) : null;
    if (requestedCompanyId && books.length > 0 && !bookId) {
      const requestedBook =
        books.find((book) => book.company_id === requestedCompanyId && book.is_default) ??
        books.find((book) => book.company_id === requestedCompanyId);
      if (requestedBook) {
        setBookId(requestedBook.book_id);
      }
    }
  }, [books, bookId]);

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

  const reviewDifference = preview ? preview.totals.debits - preview.totals.credits : 0;
  const reconciliationChecks = preview?.reconciliation?.checks ?? [];
  const hasReconciliationMismatch = reconciliationChecks.some((check) => check.status !== "match");
  const reviewReady = Boolean(preview) && Boolean(preview?.reconciliation?.is_balanced) && !hasReconciliationMismatch;
  const isReviewingAccounts = accountSuggestionsMutation.isPending;
  const accountReviewProgressLabel = accountReviewProgress
    ? formatAccountReviewProgress(accountReviewProgress)
    : null;
  const hasAccountReviewProgress = accountReviewProgress !== null;
  
  const previewAccounts = preview?.accounts ?? [];
  const visibleReviewAccounts = useMemo(() => {
    if (!preview) return [];
    if (accountFilter === "all") return preview.accounts ?? [];
    return (preview.accounts ?? []).filter((account) => account.account_key === accountFilter);
  }, [accountFilter, preview]);

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
    setAppliedSuggestionChanges(new Map());
    setSuggestionError(null);
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
    setAppliedSuggestionChanges(new Map());
    setSuggestionError(null);

    try {
      const data = await parseImportMutation.mutateAsync({
        companyBookId: currentBook.book_id,
        file: currentFile,
      });
      if (parseRunIdRef.current !== parseRunId) return;

      setSummary(data.summary);
      void reviewAccountSuggestions({
        file: currentFile,
        formatCode: currentBook.format_code,
        parseRunId,
        rowCount: data.summary.gl_entry_lines,
        context: {
          filename: currentFile.name,
          companyName: currentBook.company_name,
          formatCode: currentBook.format_code,
          sourceFileId: data.summary.source_file_id,
          useGemini: useGeminiReview,
        },
      });
      // useImportPreview will fetch preview automatically since sourceFileId is set
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse GL file");
      setAccountReviewProgress(null);
    }
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
      const review = await accountSuggestionsMutation.mutateAsync({
        file,
        formatCode,
        includeAll: true,
        useAi: context.useGemini,
        aiProvider: "gemini",
        aiModel: GEMINI_AI_TEST_REVIEW_MODEL,
        aiRowsPerRequest: GEMINI_ROWS_PER_REQUEST,
        aiConcurrencyLimit: GEMINI_CONCURRENCY_LIMIT,
        aiUseGoogleSearch: GEMINI_USE_GOOGLE_SEARCH,
        aiReviewAll: true,
        aiMaxRows: GEMINI_AI_TEST_REVIEW_MAX_ROWS,
        aiEnableEscalation: GEMINI_ENABLE_ESCALATION,
        aiEscalationConfidence: 0.85,
        applyAiSuggestions: true,
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
    if (staged) {
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
      setAppliedSuggestionChanges(new Map());
      setSuggestionError(null);
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
    if (!summary) return;
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
    if (!summary) return;
    const suggestedAccountNumber = suggestion.suggested_target_account_number?.trim();
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
    if (!summary) return;
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
    if (!selectedBook || !summary) return;
    setError(null);

    try {
      await saveImportMutation.mutateAsync({
        companyId: selectedBook.company_id,
        sourceFileId: summary.source_file_id,
      });
      window.location.assign(`/general-ledger/company/${selectedBook.company_id}?period=q1&year=2026`);
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
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error || booksError?.message}
        </section>
      )}

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
                  setAppliedSuggestionChanges(new Map());
                  setSuggestionError(null);
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
                <Label htmlFor="gemini-review">Gemini AI test review</Label>
              </div>
              <Button
                id="gemini-review"
                type="button"
                variant={useGeminiReview ? "default" : "outline"}
                size="sm"
                onClick={() => setUseGeminiReview((enabled) => !enabled)}
              >
                {useGeminiReview ? "On" : "Off"}
              </Button>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              disabled={!selectedBook || !file || parseImportMutation.isPending || isReviewingAccounts}
              onClick={handleParse}
            >
              {parseImportMutation.isPending
                ? "Parsing..."
                : accountSuggestionsMutation.isPending
                  ? accountReviewProgressLabel ?? (useGeminiReview ? "Reviewing with Gemini..." : "Reviewing...")
                  : "Parse & Preview"}
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
            <Card className="overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4 bg-muted/20">
                <div>
                  <h2 className="text-lg font-medium">Import Review</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {preview.rows.length} of {preview.totals.line_count} rows shown
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowWorkbookPreview(true)}
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    Workbook
                  </Button>
                  <Badge variant={reviewReady ? "default" : "destructive"} className={reviewReady ? "bg-green-600" : ""}>
                    {reviewReady ? "Ready for save" : "Needs review"}
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
                  />
                  <ReviewStat
                    label="XGBoost"
                    value={preview.account_review_summary.xgboost_count.toLocaleString("en-US")}
                  />
                  <ReviewStat
                    label="AI Review"
                    value={preview.account_review_summary.ai_review_count.toLocaleString("en-US")}
                    tone={preview.account_review_summary.ai_review_count > 0 ? "warning" : "default"}
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
                    <Badge variant={preview.reconciliation.is_balanced ? "default" : "destructive"} className={preview.reconciliation.is_balanced ? "bg-green-600" : ""}>
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
                              <Badge variant={check.status === "match" ? "outline" : "destructive"} className={check.status === "match" ? "border-green-600 text-green-700 bg-green-50" : ""}>
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

              <AccountSuggestionReview
                suggestions={suggestions}
                response={accountSuggestions}
                isLoading={accountSuggestionsMutation.isPending}
                progressLabel={accountReviewProgressLabel}
                error={suggestionError}
                onApplySuggestedTarget={summary ? handleApplySuggestedTarget : undefined}
                onUnapplySuggestedTarget={summary ? handleUnapplySuggestedTarget : undefined}
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
                  <Button variant="outline" onClick={() => setShowManualEntry(!showManualEntry)}>
                    {showManualEntry ? "Hide" : "Manual Add"}
                  </Button>
                </div>

                {showManualEntry && (
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
                Review the account groups above, then save to make this import available on the company GL dashboard.
              </p>
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="outline"
                  disabled={
                    deleteImportMutation.isPending ||
                    saveImportMutation.isPending ||
                    applySuggestedTargetMutation.isPending ||
                    unapplySuggestedTargetMutation.isPending
                  }
                  onClick={handleCancel}
                >
                  {deleteImportMutation.isPending ? "Discarding..." : "Cancel"}
                </Button>
                <Button
                  disabled={
                    saveImportMutation.isPending ||
                    isReviewingAccounts ||
                    applySuggestedTargetMutation.isPending ||
                    unapplySuggestedTargetMutation.isPending ||
                    !reviewReady
                  }
                  onClick={handleSave}
                >
                  {saveImportMutation.isPending ? "Saving..." : "Save Import"}
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

function ReviewStat({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "ok" | "warning" }) {
  const toneClass = tone === "ok" ? "text-green-600" : tone === "warning" ? "text-red-600" : "";
  return (
    <div className="p-4">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function ReviewAccountGroup({
  account,
  isFiltered,
  onFilter,
  suggestionByTransaction,
}: {
  account: ImportPreviewAccount;
  isFiltered: boolean;
  onFilter: () => void;
  suggestionByTransaction: Map<string, GLAccountSuggestion>;
}) {
  const transactions = account.transactions ?? [];
  const closingBalance = getPreviewAccountClosingBalance(account);

  return (
    <div className="overflow-hidden rounded-md border bg-card text-card-foreground shadow-sm">
      <div className={`flex flex-col gap-3 border-b p-4 md:flex-row md:items-start md:justify-between ${isFiltered ? "bg-blue-50/50" : "bg-muted/40"}`}>
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
            <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
              {account.bank_lines.toLocaleString("en-US")} bank
            </Badge>
          )}
          <span className="font-semibold text-muted-foreground">Debit {formatMoney(account.debits)}</span>
          <span className="font-semibold text-muted-foreground">Credit {formatMoney(account.credits)}</span>
          <span className={`font-semibold ${Math.abs(account.net_amount) < 0.005 ? "text-muted-foreground" : account.net_amount > 0 ? "text-green-600" : "text-red-600"}`}>
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
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="bg-blue-50/40 font-medium">
                <TableCell colSpan={9} className="text-right text-muted-foreground">Beginning Balance</TableCell>
                <TableCell className="text-right">{formatOptionalMoney(account.beginning_balance)}</TableCell>
                <TableCell />
              </TableRow>

              {transactions.map((txn) => {
                const suggestion = suggestionByTransaction.get(
                  suggestionKeyFromPreview(account, txn)
                );
                const previewReview = txn.account_review;
                const showPreviewReview =
                  !suggestion &&
                  previewReview &&
                  previewReview.source !== "not_bank_transaction";
                const currentTargetTitle = formatReviewCurrentTarget(txn, suggestion, previewReview);
                const suggestedTargetTitle = formatReviewSuggestedTarget(suggestion, previewReview);
                const rowTitle = formatAccountReviewTransactionTitle(txn, suggestion, previewReview);

                return (
                <TableRow key={txn.entry_id} title={rowTitle}>
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
                      <AccountValue
                        number={previewReview.suggested_account_number}
                        name={previewReview.suggested_account_name}
                      />
                    ) : (
                      <span className="text-muted-foreground">No change</span>
                    )}
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
                  <TableCell className="text-right" title={formatReviewStatus(suggestion, previewReview, txn.is_bank_line)}>
                    <div className="flex justify-end gap-1">
                      {suggestion && <SuggestionBadge suggestion={suggestion} />}
                      {showPreviewReview && <PreviewReviewBadge review={previewReview} />}
                      {txn.is_bank_line && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">Bank</Badge>
                      )}
                      {!suggestion && !showPreviewReview && !txn.is_bank_line ? "-" : null}
                    </div>
                  </TableCell>
                </TableRow>
                );
              })}
              
              <TableRow className="border-t-2 bg-muted/40 font-semibold">
                <TableCell colSpan={9} className="text-right text-muted-foreground">Closing Balance</TableCell>
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
    const suggestedCode = suggestion.suggested_target_account_number;
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
            <Sparkles className="h-4 w-4 text-blue-600" />
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
        <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {error}
        </div>
      )}

      {aiReview?.error && (
        <div className="mb-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Gemini review did not finish: {aiReview.error}
        </div>
      )}

      {aiReview?.scope_note && (
        <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          {aiReview.scope_note}
        </div>
      )}

      {geminiReviewedRowsLabel && (
        <div className="mb-3 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          <div className="font-medium">Gemini AI test rows reviewed</div>
          <div className="mt-1 font-mono text-xs">{geminiReviewedRowsLabel}</div>
        </div>
      )}

      {aiReview?.test_forced_manual_review_enabled && forcedManualReviewRowNumber && (
        <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <div className="font-medium">Gemini AI suggested manual review</div>
          <div className="mt-1">
            Test row {forcedManualReviewRowNumber} was forced to Manual review so this path can be tested.
          </div>
        </div>
      )}

      {aiReview?.test_empty_current_target_suggestion_enabled && emptyCurrentTargetRowNumber && (
        <div className="mb-3 rounded-md border border-violet-200 bg-violet-50 p-3 text-sm text-violet-800">
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
                const canApplySuggestedTarget = Boolean(
                  onApplySuggestedTarget &&
                    suggestion.suggested_target_account_number &&
                    suggestion.suggested_target_account_number !== "MANUAL_REVIEW" &&
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
                      <Badge variant="outline" className="mt-1 border-blue-200 bg-blue-50 text-blue-700">
                        Gemini AI test
                      </Badge>
                    )}
                    {wasAiSuggestedManualReview && (
                      <Badge variant="outline" className="mt-1 border-red-200 bg-red-50 text-red-700">
                        AI manual review
                      </Badge>
                    )}
                    {wasEmptyTargetManualSuggestion && (
                      <Badge variant="outline" className="mt-1 border-violet-200 bg-violet-50 text-violet-700">
                        Blank Name + memo
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
                      <div className="mt-1 text-xs font-medium text-red-700">
                        Gemini AI suggested manual review
                      </div>
                    )}
                    {wasEmptyTargetManualSuggestion && (
                      <div className="mt-1 text-xs font-medium text-violet-700">
                        Gemini AI used memo/account context; manual review required
                      </div>
                    )}
                    {suggestion.ai_provider && (
                      <div className="mt-1 text-xs text-muted-foreground" title={formatAiReviewTitle(suggestion)}>
                        {suggestion.ai_provider} {formatPercent(suggestion.ai_confidence ?? 0)}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-right" title={formatPercent(suggestion.confidence)}>
                    {formatPercent(suggestion.confidence)}
                  </TableCell>
                  <TableCell className="text-right" title={formatSuggestionStatus(suggestion)}>
                    <SuggestionBadge suggestion={suggestion} />
                    {isApplied && (
                      <Badge variant="outline" className="mt-1 border-green-600 bg-green-50 text-green-700">
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
              <TableHead className="text-right">Review</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.slice(0, 500).map((row) => (
              <TableRow key={`${row.account.account_key}-${row.txn.entry_id}`}>
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
                      row.txn.split_account_number
                    }
                    name={
                      row.suggestion?.current_target_account_name ??
                      row.txn.split_account_name
                    }
                    muted={!row.suggestion}
                  />
                </TableCell>
                <TableCell className="min-w-[220px] max-w-[280px]">
                  {row.suggestion ? (
                    <SuggestedAccountValue suggestion={row.suggestion} />
                  ) : (
                    <span className="text-muted-foreground">No change</span>
                  )}
                </TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  {formatMoney(row.txn.amount)}
                </TableCell>
                <TableCell className="text-right">
                  {row.suggestion ? <SuggestionBadge suggestion={row.suggestion} /> : "-"}
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
  if (suggestion.requires_manual_review && !suggestion.suggested_target_account_number) {
    return <span className="font-medium text-red-700">Manual review</span>;
  }
  if (isNoChangeSuggestion(suggestion)) {
    return <span className="text-muted-foreground">No change</span>;
  }

  return (
    <span
      className="min-w-0 truncate font-medium text-blue-700"
      title={formatSuggestionAccount(
        suggestion.suggested_target_account_number,
        suggestion.suggested_target_account_name
      )}
    >
      {formatSuggestionAccount(
        suggestion.suggested_target_account_number,
        suggestion.suggested_target_account_name
      )}
    </span>
  );
}

function SuggestionBadge({ suggestion }: { suggestion: GLAccountSuggestion }) {
  const hasGeminiSuggestion =
    suggestion.ai_provider === "gemini" && Boolean(suggestion.suggested_target_account_number);

  if (
    suggestion.requires_manual_review &&
    suggestion.ai_provider === "gemini" &&
    suggestion.rule === "gemini_ai_review_manual"
  ) {
    return <Badge variant="destructive">Gemini manual review</Badge>;
  }
  if (suggestion.requires_manual_review && hasGeminiSuggestion) {
    return <Badge className="bg-violet-600 hover:bg-violet-600">Gemini manual suggestion</Badge>;
  }
  if (suggestion.requires_manual_review) {
    return <Badge variant="destructive">Review</Badge>;
  }
  if (suggestion.rule === "gemini_ai_fallback" || suggestion.ai_provider === "gemini") {
    return <Badge className="bg-violet-600 hover:bg-violet-600">Gemini</Badge>;
  }
  if (suggestion.suggested_target_account_number) {
    return <Badge className="bg-blue-600 hover:bg-blue-600">Suggested</Badge>;
  }
  return <Badge variant="outline">Checked</Badge>;
}

function isNoChangeSuggestion(suggestion: GLAccountSuggestion) {
  return (
    suggestion.rule === "keep_current" ||
    suggestion.rule === "gemini_ai_no_change" ||
    Boolean(
      suggestion.suggested_target_account_number &&
        suggestion.current_target_account_number &&
        suggestion.suggested_target_account_number === suggestion.current_target_account_number
    )
  );
}

function PreviewReviewBadge({ review }: { review: ImportPreviewAccountReview }) {
  if (review.requires_human_review) {
    return <Badge variant="destructive">Review</Badge>;
  }
  if (review.requires_ai_review) {
    return <Badge className="bg-violet-600 hover:bg-violet-600">AI review</Badge>;
  }
  if (review.source === "quickbooks_rule") {
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">QB Rule</Badge>;
  }
  if (review.source === "xgboost") {
    return <Badge className="bg-blue-600 hover:bg-blue-600">XGBoost</Badge>;
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

function formatSuggestionAccount(number: string | null, name: string | null) {
  if (number && name) return `${number} · ${name}`;
  return number || name || "-";
}

function formatSuggestionLabel(suggestion: GLAccountSuggestion) {
  if (suggestion.requires_manual_review && !suggestion.suggested_target_account_number) {
    return "Manual review";
  }
  if (isNoChangeSuggestion(suggestion)) return "No change";
  return formatSuggestionAccount(
    suggestion.suggested_target_account_number,
    suggestion.suggested_target_account_name
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
    suggestion.ai_provider === "gemini" && Boolean(suggestion.suggested_target_account_number);

  if (
    suggestion.requires_manual_review &&
    suggestion.ai_provider === "gemini" &&
    suggestion.rule === "gemini_ai_review_manual"
  ) {
    return "Gemini AI suggested manual review";
  }
  if (suggestion.requires_manual_review && hasGeminiSuggestion) {
    return "Gemini AI suggested an account; manual review required";
  }
  if (suggestion.requires_manual_review) return "Manual review required";
  if (suggestion.rule === "gemini_ai_fallback" || suggestion.ai_provider === "gemini") return "Gemini";
  if (suggestion.suggested_target_account_number) return "Suggested";
  return "Checked";
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
  review?: ImportPreviewAccountReview | null,
  isBankLine = false
) {
  const statuses: string[] = [];
  if (suggestion) statuses.push(formatSuggestionStatus(suggestion));
  if (review && review.source !== "not_bank_transaction") {
    statuses.push(formatPreviewReviewStatus(review));
  }
  if (isBankLine) statuses.push("Bank transaction");
  return statuses.length > 0 ? statuses.join("; ") : "-";
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
    `Status: ${formatReviewStatus(suggestion, review, txn.is_bank_line)}`,
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

function formatPercent(value: number | null | undefined) {
  if (value == null) return "-";
  return `${Math.round(value * 100)}%`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
