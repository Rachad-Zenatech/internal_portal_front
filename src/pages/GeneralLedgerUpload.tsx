// src/pages/GeneralLedgerUpload.tsx

import { useEffect, useMemo, useRef, useState } from "react";
import type {
  GLAccountSuggestion,
  GLAccountSuggestionsResponse,
  ImportPreview,
  ImportPreviewAccount,
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
  useSaveImport,
} from "@/hooks/useGL";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileSpreadsheet, Move, Sparkles, X } from "lucide-react";

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

  const [summary, setSummary] = useState<ParseSummary | null>(null);
  const [accountFilter, setAccountFilter] = useState("all");
  const [manualEntry, setManualEntry] = useState<ManualEntryForm>(emptyManualEntry);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showWorkbookPreview, setShowWorkbookPreview] = useState(false);
  const [accountSuggestions, setAccountSuggestions] =
    useState<GLAccountSuggestionsResponse | null>(null);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Queries & Mutations
  const { data: books = [], isLoading: isLoadingBooks, error: booksError } = useBooks();
  
  const sourceFileId = summary?.source_file_id ?? null;
  const companyIdForPreview = summary?.company_id ?? null;
  
  const { data: previewData, isLoading: isPreviewLoading } = useImportPreview(sourceFileId, companyIdForPreview);
  
  const parseImportMutation = useParseImport();
  const accountSuggestionsMutation = useGLAccountSuggestions();
  const deleteImportMutation = useDeleteImport();
  const addManualEntryMutation = useAddManualEntry();
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
      const requestedBook = books.find((book) => book.company_id === requestedCompanyId);
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
  const suggestions = accountSuggestions?.suggestions ?? [];
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
  
  const previewAccounts = preview?.accounts ?? [];
  const visibleReviewAccounts = useMemo(() => {
    if (!preview) return [];
    if (accountFilter === "all") return preview.accounts ?? [];
    return (preview.accounts ?? []).filter((account) => account.account_key === accountFilter);
  }, [accountFilter, preview]);

  async function handleParse() {
    if (!bookId || !file) return;

    setError(null);
    setSummary(null);
    setLocalPreview(null);
    setAccountFilter("all");
    setManualEntry(emptyManualEntry);
    setShowManualEntry(false);
    setShowWorkbookPreview(false);
    setAccountSuggestions(null);
    setSuggestionError(null);

    try {
      const data = await parseImportMutation.mutateAsync({ companyBookId: bookId, file });
      setSummary(data.summary);
      if (selectedBook) {
        try {
          const review = await accountSuggestionsMutation.mutateAsync({
            file,
            formatCode: selectedBook.format_code,
          });
          setAccountSuggestions(review);
        } catch (suggestionErr) {
          setSuggestionError(
            suggestionErr instanceof Error
              ? suggestionErr.message
              : "Failed to review account suggestions"
          );
        }
      }
      // useImportPreview will fetch preview automatically since sourceFileId is set
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse GL file");
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
                value={bookId ? String(bookId) : undefined}
                disabled={isLoadingBooks}
                onValueChange={(val) => {
                  discardStaged(summary);
                  setBookId(Number(val));
                  setSummary(null);
                  setLocalPreview(null);
                  setAccountFilter("all");
                  setManualEntry(emptyManualEntry);
                  setShowManualEntry(false);
                  setShowWorkbookPreview(false);
                  setAccountSuggestions(null);
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
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>GL File</Label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => {
                  discardStaged(summary);
                  setFile(e.target.files?.[0] ?? null);
                  setSummary(null);
                  setLocalPreview(null);
                  setAccountFilter("all");
                  setManualEntry(emptyManualEntry);
                  setShowManualEntry(false);
                  setShowWorkbookPreview(false);
                  setAccountSuggestions(null);
                  setSuggestionError(null);
                }}
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              disabled={!bookId || !file || parseImportMutation.isPending || isReviewingAccounts}
              onClick={handleParse}
            >
              {parseImportMutation.isPending
                ? "Parsing..."
                : accountSuggestionsMutation.isPending
                  ? "Reviewing..."
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
                error={suggestionError}
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
                  disabled={deleteImportMutation.isPending || saveImportMutation.isPending}
                  onClick={handleCancel}
                >
                  {deleteImportMutation.isPending ? "Discarding..." : "Cancel"}
                </Button>
                <Button
                  disabled={saveImportMutation.isPending || isReviewingAccounts || !reviewReady}
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
        <div className="max-h-[420px] overflow-auto">
          <Table>
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

                return (
                <TableRow key={txn.entry_id}>
                  <TableCell className="whitespace-nowrap">{txn.entry_date || "-"}</TableCell>
                  <TableCell className="whitespace-nowrap">{txn.transaction_type || "-"}</TableCell>
                  <TableCell className="whitespace-nowrap">{txn.transaction_number || "-"}</TableCell>
                  <TableCell className="whitespace-nowrap">{txn.name || "-"}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={txn.memo || ""}>{txn.memo || "-"}</TableCell>
                  <TableCell className="min-w-[220px] max-w-[260px]">
                    <AccountValue
                      number={
                        suggestion?.current_target_account_number ??
                        txn.split_account_number
                      }
                      name={
                        suggestion?.current_target_account_name ??
                        txn.split_account_name
                      }
                      muted={!suggestion}
                    />
                  </TableCell>
                  <TableCell className="min-w-[220px] max-w-[280px]">
                    {suggestion ? (
                      <SuggestedAccountValue suggestion={suggestion} />
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
                  <TableCell className="text-right whitespace-nowrap">{txn.debit ? formatMoney(txn.debit) : "-"}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{txn.credit ? formatMoney(txn.credit) : "-"}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">{txn.balance_after == null ? "-" : formatMoney(txn.balance_after)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {suggestion && <SuggestionBadge suggestion={suggestion} />}
                      {txn.is_bank_line && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">Bank</Badge>
                      )}
                      {!suggestion && !txn.is_bank_line ? "-" : null}
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
        </div>
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
  error,
}: {
  suggestions: GLAccountSuggestion[];
  response: GLAccountSuggestionsResponse | null;
  isLoading: boolean;
  error: string | null;
}) {
  const previewRows = suggestions;
  const modelLoaded = response?.xgboost_model_status?.model_loaded;

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
              ? `${response.suggestion_count.toLocaleString("en-US")} flagged rows from ${response.transaction_count.toLocaleString("en-US")} parsed transactions`
              : "Reviewing imported rows against the shared chart of accounts"}
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Badge variant={modelLoaded ? "outline" : "secondary"}>
            {modelLoaded ? "XGBoost loaded" : "AI review fallback"}
          </Badge>
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

      {isLoading && (
        <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
          Reviewing account suggestions...
        </div>
      )}

      {!isLoading && !error && response && suggestions.length === 0 && (
        <div className="rounded-md border p-6 text-center text-sm text-muted-foreground">
          No account corrections were flagged.
        </div>
      )}

      {!isLoading && previewRows.length > 0 && (
        <div className="max-h-[520px] overflow-auto rounded-md border">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Row</TableHead>
                <TableHead>Transaction</TableHead>
                <TableHead>Current Target</TableHead>
                <TableHead>Suggested Target</TableHead>
                <TableHead className="text-right">Confidence</TableHead>
                <TableHead className="text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {previewRows.map((suggestion) => (
                <TableRow key={`${suggestion.row_number}-${suggestion.target_field}`}>
                  <TableCell className="whitespace-nowrap font-medium">
                    {suggestion.row_number}
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <div className="truncate" title={suggestion.name || suggestion.memo || ""}>
                      {suggestion.name || suggestion.memo || suggestion.transaction_type || "-"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {suggestion.date || "-"} · {formatMoney(suggestion.amount)}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[240px] truncate">
                    {formatSuggestionAccount(
                      suggestion.current_target_account_number,
                      suggestion.current_target_account_name
                    )}
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate">
                    {formatSuggestionAccount(
                      suggestion.suggested_target_account_number,
                      suggestion.suggested_target_account_name
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercent(suggestion.confidence)}
                  </TableCell>
                  <TableCell className="text-right">
                    <SuggestionBadge suggestion={suggestion} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
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

      <div className="overflow-auto">
        <Table>
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
  if (suggestion.requires_manual_review) {
    return <Badge variant="destructive">Review</Badge>;
  }
  if (suggestion.suggested_target_account_number) {
    return <Badge className="bg-blue-600 hover:bg-blue-600">Suggested</Badge>;
  }
  return <Badge variant="outline">Checked</Badge>;
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

function formatPercent(value: number | null | undefined) {
  if (value == null) return "-";
  return `${Math.round(value * 100)}%`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}
