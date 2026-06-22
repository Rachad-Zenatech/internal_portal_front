// src/pages/GeneralLedgerUpload.tsx

import { useEffect, useMemo, useState } from "react";
import {
  GLService,
  type CompanyBook,
  type ImportPreview,
  type ImportPreviewAccount,
  type ManualGlEntryRequest,
} from "../services/glService";

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
  const [books, setBooks] = useState<CompanyBook[]>([]);
  const [bookId, setBookId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);

  const [summary, setSummary] = useState<ParseSummary | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isLoadingSetup, setIsLoadingSetup] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [isAddingManual, setIsAddingManual] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [accountFilter, setAccountFilter] = useState("all");
  const [manualEntry, setManualEntry] =
    useState<ManualEntryForm>(emptyManualEntry);
  const [error, setError] = useState<string | null>(null);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    id: 120,
    date: 180,
    account: 180,
    number: 160,
    type: 180,
    name: 180,
    memo: 180,
    debit: 180,
    credit: 180,
  });

  const selectedBook = useMemo(
    () => books.find((book) => book.book_id === bookId) ?? null,
    [books, bookId]
  );
  const reviewDifference = preview
    ? preview.totals.debits - preview.totals.credits
    : 0;
  const reconciliationChecks = preview?.reconciliation?.checks ?? [];
  const hasReconciliationMismatch = reconciliationChecks.some(
    (check) => check.status !== "match"
  );
  const reviewReady =
    Boolean(preview) &&
    Boolean(preview?.reconciliation?.is_balanced) &&
    !hasReconciliationMismatch;
  const previewAccounts = preview?.accounts ?? [];
  const visibleReviewAccounts = useMemo(() => {
    if (!preview) return [];
    if (accountFilter === "all") return preview.accounts ?? [];
    return (preview.accounts ?? []).filter(
      (account) => account.account_key === accountFilter
    );
  }, [accountFilter, preview]);
  const filteredPreviewRows = useMemo(() => {
    if (!preview) return [];
    if (accountFilter === "all") return preview.rows;
    return preview.rows.filter(
      (row) => (row.account_number ?? "unmapped") === accountFilter
    );
  }, [accountFilter, preview]);

  function resizeColumn(column: string, startX: number, startWidth: number) {
    function onMouseMove(event: MouseEvent) {
      const nextWidth = Math.max(120, startWidth + event.clientX - startX);

      setColumnWidths((current) => ({
        ...current,
        [column]: nextWidth,
      }));
    }

    function onMouseUp() {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  }

  async function loadSetup() {
    setIsLoadingSetup(true);
    setError(null);

    try {
      const booksData = await GLService.getBooks();
      setBooks(booksData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load setup data");
    } finally {
      setIsLoadingSetup(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSetup();
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  async function handleParse() {
    if (!bookId || !file) return;

    setIsParsing(true);
    setError(null);
    setSummary(null);
    setPreview(null);
    setAccountFilter("all");
    setManualEntry(emptyManualEntry);
    setShowManualEntry(false);

    try {
      const data = await GLService.parseImport({
        companyBookId: bookId,
        file,
      });

      setSummary(data.summary);

      const previewData = await GLService.getImportPreview({
        sourceFileId: data.summary.source_file_id,
        companyId: data.summary.company_id,
      });

      setPreview(previewData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse GL file");
    } finally {
      setIsParsing(false);
    }
  }

  function discardStaged(staged: ParseSummary | null) {
    if (staged) {
      GLService.deleteImport({
        companyId: staged.company_id,
        sourceFileId: staged.source_file_id,
      }).catch(() => {});
    }
  }

  async function handleCancel() {
    if (!summary) return;

    setIsDiscarding(true);
    setError(null);

    try {
      await GLService.deleteImport({
        companyId: summary.company_id,
        sourceFileId: summary.source_file_id,
      });
    } catch {
      // Non-fatal.
    } finally {
      setIsDiscarding(false);
      setSummary(null);
      setPreview(null);
      setAccountFilter("all");
      setManualEntry(emptyManualEntry);
      setShowManualEntry(false);
    }
  }

  function updateManualEntry<K extends keyof ManualEntryForm>(
    key: K,
    value: ManualEntryForm[K]
  ) {
    setManualEntry((current) => ({ ...current, [key]: value }));
  }

  function optionalNumber(value: string) {
    const cleaned = value.trim();
    return cleaned ? Number(cleaned) : undefined;
  }

  async function handleManualAdd() {
    if (!summary) return;

    setIsAddingManual(true);
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

      const response = await GLService.addManualEntry({
        sourceFileId: summary.source_file_id,
        entry,
      });

      setPreview(response.preview);
      setSummary((current) =>
        current
          ? {
              ...current,
              gl_entries: response.preview.totals.unique_gl_ids,
              gl_entry_lines: response.preview.totals.line_count,
              bank_lines:
                current.bank_lines + (response.manual_entry.is_bank_line ? 1 : 0),
            }
          : current
      );
      setManualEntry(emptyManualEntry);
      setShowManualEntry(false);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to add manual GL entry"
      );
    } finally {
      setIsAddingManual(false);
    }
  }

  async function handleSave() {
    if (!selectedBook || !summary) return;

    setIsSaving(true);
    setError(null);

    try {
      await GLService.saveImport({
        companyId: selectedBook.company_id,
        sourceFileId: summary.source_file_id,
      });

      window.location.assign(
        `/general-ledger/company/${selectedBook.company_id}?period=q1&year=2026`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save import");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="space-y-6 p-6">
      <header>
        <button
          className="mb-2 text-sm text-gray-500"
          onClick={() => window.location.assign("/general-ledger")}
        >
          ← Back to General Ledger Dashboard
        </button>

        <h1 className="text-2xl font-semibold">Upload General Ledger</h1>
        <p className="text-sm text-gray-500">
          Select a company/book, then upload the GL file. The parser format is
          configured automatically.
        </p>
      </header>

      {error && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </section>
      )}

      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm font-medium">Company / Book</span>

            <select
              className="w-full rounded-md border px-3 py-2"
              value={bookId ?? ""}
              disabled={isLoadingSetup}
              onChange={(e) => {
                discardStaged(summary);
                setBookId(e.target.value ? Number(e.target.value) : null);
                setSummary(null);
                setPreview(null);
                setAccountFilter("all");
                setManualEntry(emptyManualEntry);
                setShowManualEntry(false);
              }}
            >
              <option value="">
                {isLoadingSetup ? "Loading books..." : "Select company / book"}
              </option>

              {books.map((book) => (
                <option key={book.book_id} value={book.book_id}>
                  {book.book_name} — {book.format_name}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium">GL File</span>
            <input
              className="w-full rounded-md border px-3 py-2"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                discardStaged(summary);
                setFile(e.target.files?.[0] ?? null);
                setSummary(null);
                setPreview(null);
                setAccountFilter("all");
                setManualEntry(emptyManualEntry);
                setShowManualEntry(false);
              }}
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
            disabled={!bookId || !file || isParsing}
            onClick={handleParse}
          >
            {isParsing ? "Parsing..." : "Parse & Preview"}
          </button>
        </div>
      </section>

      {selectedBook && (
        <section className="rounded-lg border bg-gray-50 p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Info label="Selected Company" value={selectedBook.company_name} />
            <Info label="Book" value={selectedBook.book_name} />
            <Info label="Parser Format" value={selectedBook.format_name} />
          </div>
        </section>
      )}

      {summary && (
        <>
          <section className="grid gap-4 md:grid-cols-4">
            <Metric label="Entries Parsed" value={summary.gl_entries} />
            <Metric label="Lines Parsed" value={summary.gl_entry_lines} />
            <Metric label="Accounts Resolved" value={summary.accounts_resolved} />
            <Metric label="Bank Lines" value={summary.bank_lines} />
          </section>

          {preview && (
            <section className="overflow-hidden rounded-lg border bg-white shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b p-4">
                <div>
                  <h2 className="text-lg font-medium">Import Review</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {preview.rows.length} of {preview.totals.line_count} rows
                    shown
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    reviewReady
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {reviewReady ? "Ready for save" : "Needs review"}
                </span>
              </div>

              <div className="grid border-b bg-gray-50 md:grid-cols-5 md:divide-x">
                <ReviewStat
                  label="Rows"
                  value={preview.totals.line_count.toLocaleString("en-US")}
                />
                <ReviewStat
                  label="Unique GL IDs"
                  value={preview.totals.unique_gl_ids.toLocaleString("en-US")}
                />
                <ReviewStat
                  label="Total Debit"
                  value={formatMoney(preview.totals.debits)}
                />
                <ReviewStat
                  label="Total Credit"
                  value={formatMoney(preview.totals.credits)}
                />
                <ReviewStat
                  label="Balance"
                  value={formatMoney(reviewDifference)}
                  tone={Math.abs(reviewDifference) < 0.005 ? "ok" : "warning"}
                />
              </div>

              {preview.reconciliation && (
                <div className="border-b p-4">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium">Completeness Checks</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        {preview.reconciliation.explanation}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        preview.reconciliation.is_balanced
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {preview.reconciliation.is_balanced ? "Balanced" : "Review"}
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-md border">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                          <th className="px-3 py-2 font-medium">Check</th>
                          <th className="px-3 py-2 text-right font-medium">
                            Source
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            Review
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            Difference
                          </th>
                          <th className="px-3 py-2 text-right font-medium">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {reconciliationChecks.map((check) => (
                          <tr key={check.check} className="border-b last:border-b-0">
                            <td className="px-3 py-2 font-medium">
                              {check.check}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatCheckValue(check.check, check.source)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatCheckValue(check.check, check.export)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              {formatCheckValue(check.check, check.difference)}
                            </td>
                            <td className="px-3 py-2 text-right">
                              <span
                                className={`rounded-full px-2 py-1 text-xs ${
                                  check.status === "match"
                                    ? "bg-green-100 text-green-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {check.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="border-b p-4">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="font-medium">Chart of Accounts Review</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Accounts are shown as section titles with their charges
                      underneath.
                    </p>
                  </div>

                  <select
                    className="rounded-md border bg-white px-3 py-2 text-sm"
                    value={accountFilter}
                    onChange={(event) => setAccountFilter(event.target.value)}
                  >
                    <option value="all">All accounts</option>
                    {previewAccounts.map((account) => (
                      <option
                        key={account.account_key}
                        value={account.account_key}
                      >
                        {formatAccountLabel(account)}
                      </option>
                    ))}
                  </select>
                </div>

                {visibleReviewAccounts.length === 0 ? (
                  <div className="rounded-md border p-6 text-center text-sm text-gray-500">
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
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="border-b bg-gray-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-medium">Manual Missing Entry</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Stage a missed debit or credit before save.
                    </p>
                  </div>
                  <button
                    className="rounded-md border bg-white px-3 py-2 text-sm"
                    onClick={() => setShowManualEntry((value) => !value)}
                  >
                    {showManualEntry ? "Hide" : "Manual Add"}
                  </button>
                </div>

                {showManualEntry && (
                  <div className="mt-4 grid gap-3 md:grid-cols-4">
                    <ManualField
                      label="Account #"
                      value={manualEntry.ledger_account_code}
                      onChange={(value) =>
                        updateManualEntry("ledger_account_code", value)
                      }
                    />
                    <ManualField
                      label="Account Name"
                      value={manualEntry.ledger_account_name}
                      onChange={(value) =>
                        updateManualEntry("ledger_account_name", value)
                      }
                    />
                    <ManualField
                      label="Split #"
                      value={manualEntry.split_account_code}
                      onChange={(value) =>
                        updateManualEntry("split_account_code", value)
                      }
                    />
                    <ManualField
                      label="Split Name"
                      value={manualEntry.split_account_name}
                      onChange={(value) =>
                        updateManualEntry("split_account_name", value)
                      }
                    />
                    <ManualField
                      label="Date"
                      type="date"
                      value={manualEntry.transaction_date}
                      onChange={(value) =>
                        updateManualEntry("transaction_date", value)
                      }
                    />
                    <ManualField
                      label="Type"
                      value={manualEntry.transaction_type}
                      onChange={(value) =>
                        updateManualEntry("transaction_type", value)
                      }
                    />
                    <ManualField
                      label="Num"
                      value={manualEntry.transaction_number}
                      onChange={(value) =>
                        updateManualEntry("transaction_number", value)
                      }
                    />
                    <ManualField
                      label="Name"
                      value={manualEntry.name}
                      onChange={(value) => updateManualEntry("name", value)}
                    />
                    <ManualField
                      label="Memo"
                      value={manualEntry.memo}
                      onChange={(value) => updateManualEntry("memo", value)}
                    />
                    <ManualField
                      label="Debit"
                      type="number"
                      value={manualEntry.debit}
                      onChange={(value) => updateManualEntry("debit", value)}
                    />
                    <ManualField
                      label="Credit"
                      type="number"
                      value={manualEntry.credit}
                      onChange={(value) => updateManualEntry("credit", value)}
                    />
                    <div className="flex items-end justify-end">
                      <button
                        className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
                        disabled={
                          isAddingManual ||
                          !manualEntry.ledger_account_code.trim() ||
                          (!manualEntry.debit.trim() && !manualEntry.credit.trim())
                        }
                        onClick={handleManualAdd}
                      >
                        {isAddingManual ? "Adding..." : "Add Row"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden">
                <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="font-medium">Parsed Rows</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Showing {filteredPreviewRows.length} of{" "}
                      {preview.rows.length} preview rows
                      {accountFilter === "all" ? "" : " for selected account"}
                    </p>
                  </div>

                  {accountFilter !== "all" && (
                    <button
                      className="rounded-md border px-3 py-2 text-sm"
                      onClick={() => setAccountFilter("all")}
                    >
                      Clear account filter
                    </button>
                  )}
                </div>

                <div className="overflow-x-auto rounded-lg border">
                <table className="table-fixed text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <ResizableTh
                        width={columnWidths.id}
                        onResize={(e) =>
                          resizeColumn("id", e.clientX, columnWidths.id)
                        }
                      >
                        GL ID
                      </ResizableTh>

                      <ResizableTh
                        width={columnWidths.date}
                        onResize={(e) =>
                          resizeColumn("date", e.clientX, columnWidths.date)
                        }
                      >
                        Date
                      </ResizableTh>

                      <ResizableTh
                        width={columnWidths.account}
                        onResize={(e) =>
                          resizeColumn(
                            "account",
                            e.clientX,
                            columnWidths.account
                          )
                        }
                      >
                        Account
                      </ResizableTh>

                      <ResizableTh
                        width={columnWidths.number}
                        onResize={(e) =>
                          resizeColumn("number", e.clientX, columnWidths.number)
                        }
                      >
                        Num
                      </ResizableTh>

                      <ResizableTh
                        width={columnWidths.type}
                        onResize={(e) =>
                          resizeColumn("type", e.clientX, columnWidths.type)
                        }
                      >
                        Type
                      </ResizableTh>

                      <ResizableTh
                        width={columnWidths.name}
                        onResize={(e) =>
                          resizeColumn("name", e.clientX, columnWidths.name)
                        }
                      >
                        Name
                      </ResizableTh>

                      <ResizableTh
                        width={columnWidths.memo}
                        onResize={(e) =>
                          resizeColumn("memo", e.clientX, columnWidths.memo)
                        }
                      >
                        Memo
                      </ResizableTh>

                      <ResizableTh
                        width={columnWidths.debit}
                        align="right"
                        onResize={(e) =>
                          resizeColumn("debit", e.clientX, columnWidths.debit)
                        }
                      >
                        Debit
                      </ResizableTh>

                      <ResizableTh
                        width={columnWidths.credit}
                        align="right"
                        onResize={(e) =>
                          resizeColumn(
                            "credit",
                            e.clientX,
                            columnWidths.credit
                          )
                        }
                      >
                        Credit
                      </ResizableTh>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredPreviewRows.map((row, index) => (
                      <tr
                        key={index}
                        className="border-b align-top last:border-b-0"
                      >
                        <ResizableTd width={columnWidths.id}>
                          {row.gl_id || "-"}
                        </ResizableTd>

                        <ResizableTd width={columnWidths.date}>
                          {row.date || "-"}
                        </ResizableTd>

                        <ResizableTd width={columnWidths.account}>
                          {row.account_number
                            ? `${row.account_number} · ${
                                row.account_name || ""
                              }`
                            : "-"}
                        </ResizableTd>

                        <ResizableTd width={columnWidths.number}>
                          {row.transaction_number || "-"}
                        </ResizableTd>

                        <ResizableTd width={columnWidths.type}>
                          {row.type || "-"}
                        </ResizableTd>

                        <ResizableTd width={columnWidths.name}>
                          {row.name || "-"}
                        </ResizableTd>

                        <ResizableTd width={columnWidths.memo} wrap>
                          {row.memo || "-"}
                        </ResizableTd>

                        <ResizableTd width={columnWidths.debit} align="right">
                          {row.debit ? formatMoney(row.debit) : "-"}
                        </ResizableTd>

                        <ResizableTd width={columnWidths.credit} align="right">
                          {row.credit ? formatMoney(row.credit) : "-"}
                        </ResizableTd>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </section>
          )}

          <section className="rounded-lg border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-medium">Save Import</h2>
            <p className="mt-1 text-sm text-gray-500">
              Review the account groups above, then save to make this import
              available on the company GL dashboard.
            </p>

            <div className="mt-4 flex justify-end gap-3">
              <button
                className="rounded-md border px-4 py-2 disabled:opacity-50"
                disabled={isDiscarding || isSaving}
                onClick={handleCancel}
              >
                {isDiscarding ? "Discarding..." : "Cancel"}
              </button>

              <button
                className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
                disabled={isSaving}
                onClick={handleSave}
              >
                {isSaving ? "Saving..." : "Save Import"}
              </button>
            </div>
          </section>
        </>
      )}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}

function ReviewStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "ok" | "warning";
}) {
  const toneClass =
    tone === "ok"
      ? "text-green-700"
      : tone === "warning"
        ? "text-red-700"
        : "text-gray-900";

  return (
    <div className="p-4">
      <p className="text-xs uppercase text-gray-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

function ReviewAccountGroup({
  account,
  isFiltered,
  onFilter,
}: {
  account: ImportPreviewAccount;
  isFiltered: boolean;
  onFilter: () => void;
}) {
  const transactions = account.transactions ?? [];
  const closingBalance = getPreviewAccountClosingBalance(account);

  return (
    <div className="overflow-hidden rounded-md border">
      <div
        className={`flex flex-col gap-3 border-b p-3 md:flex-row md:items-start md:justify-between ${
          isFiltered ? "bg-blue-50" : "bg-gray-50"
        }`}
      >
        <div>
          <h4 className="font-medium">{formatAccountLabel(account)}</h4>
          <p className="mt-1 text-xs text-gray-500">
            {account.account_type || "Unknown account type"} ·{" "}
            {formatDateRange(account)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded-full bg-white px-2 py-1 text-xs text-gray-600">
            {account.line_count.toLocaleString("en-US")} lines
          </span>
          {account.bank_lines > 0 && (
            <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
              {account.bank_lines.toLocaleString("en-US")} bank
            </span>
          )}
          <span className="font-semibold">
            Debit {formatMoney(account.debits)}
          </span>
          <span className="font-semibold">
            Credit {formatMoney(account.credits)}
          </span>
          <span
            className={`font-semibold ${
              Math.abs(account.net_amount) < 0.005
                ? "text-gray-600"
                : account.net_amount > 0
                  ? "text-green-700"
                  : "text-red-700"
            }`}
          >
            Net {formatMoney(account.net_amount)}
          </span>
          <ReviewBalanceStat
            label="Beginning"
            value={account.beginning_balance}
          />
          <ReviewBalanceStat label="Closing" value={closingBalance} />
          {!isFiltered && (
            <button className="rounded-md border bg-white px-2 py-1 text-xs" onClick={onFilter}>
              Focus
            </button>
          )}
        </div>
      </div>

      {transactions.length === 0 ? (
        <div className="p-4 text-sm text-gray-500">No charges found.</div>
      ) : (
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="sticky top-0 z-10 border-b bg-gray-50 text-left text-xs uppercase text-gray-500">
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 font-medium">Num</th>
                <th className="px-3 py-2 font-medium">Name</th>
                <th className="px-3 py-2 font-medium">Memo</th>
                <th className="px-3 py-2 font-medium">Split Account</th>
                <th className="px-3 py-2 text-right font-medium">Debit</th>
                <th className="px-3 py-2 text-right font-medium">Credit</th>
                <th className="px-3 py-2 text-right font-medium">Balance</th>
                <th className="px-3 py-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b bg-blue-50/60 font-medium text-gray-700">
                <td colSpan={8} className="px-3 py-2 text-right">
                  Beginning Balance
                </td>
                <td className="px-3 py-2 text-right">
                  {formatOptionalMoney(account.beginning_balance)}
                </td>
                <td />
              </tr>

              {transactions.map((txn) => (
                <tr key={txn.entry_id} className="border-b align-top last:border-b-0">
                  <td className="whitespace-nowrap px-3 py-2">
                    {txn.entry_date || "-"}
                  </td>
                  <td className="px-3 py-2">{txn.transaction_type || "-"}</td>
                  <td className="px-3 py-2">{txn.transaction_number || "-"}</td>
                  <td className="px-3 py-2">{txn.name || "-"}</td>
                  <td className="min-w-[220px] whitespace-normal break-words px-3 py-2">
                    {txn.memo || "-"}
                  </td>
                  <td className="min-w-[180px] px-3 py-2">
                    {txn.split_account_number
                      ? `${txn.split_account_number} · ${
                          txn.split_account_name || ""
                        }`
                      : "-"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {txn.debit ? formatMoney(txn.debit) : "-"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {txn.credit ? formatMoney(txn.credit) : "-"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {txn.balance_after == null
                      ? "-"
                      : formatMoney(txn.balance_after)}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {txn.is_bank_line ? (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                        Bank
                      </span>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
                <td colSpan={8} className="px-3 py-2 text-right text-gray-600">
                  Closing Balance
                </td>
                <td className="px-3 py-2 text-right text-gray-900">
                  {formatMoney(closingBalance)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function ReviewBalanceStat({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  return (
    <span className="rounded-md bg-white px-2 py-1 text-right text-xs text-gray-600">
      {label}:{" "}
      <span className="font-semibold text-gray-900">
        {formatOptionalMoney(value)}
      </span>
    </span>
  );
}

function ManualField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "number";
}) {
  return (
    <label className="space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <input
        className="w-full rounded-md border px-3 py-2"
        type={type}
        step={type === "number" ? "0.01" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function ResizableTh({
  children,
  width,
  align = "left",
  onResize,
}: {
  children: React.ReactNode;
  width: number;
  align?: "left" | "right";
  onResize: (event: React.MouseEvent<HTMLDivElement>) => void;
}) {
  return (
    <th
      className="relative border-r px-3 py-2 font-medium text-gray-600 last:border-r-0"
      style={{
        width,
        minWidth: width,
        maxWidth: width,
      }}
    >
      <div className={align === "right" ? "text-right" : "text-left"}>
        {children}
      </div>

      <div
        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-gray-400"
        onMouseDown={onResize}
      />
    </th>
  );
}

function ResizableTd({
  children,
  width,
  align = "left",
  wrap = false,
}: {
  children: React.ReactNode;
  width: number;
  align?: "left" | "right";
  wrap?: boolean;
}) {
  return (
    <td
      className={`border-r px-3 py-2 last:border-r-0 ${
        align === "right" ? "text-right" : "text-left"
      } ${wrap ? "whitespace-normal break-words" : "truncate whitespace-nowrap"}`}
      style={{
        width,
        minWidth: width,
        maxWidth: width,
      }}
    >
      {children}
    </td>
  );
}

function formatMoney(value: number) {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
  if (account.account_number) {
    return `${account.account_number} - ${account.account_name}`;
  }
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
  const lastWithBalance = [...(account.transactions ?? [])]
    .reverse()
    .find((txn) => txn.balance_after != null);

  if (lastWithBalance?.balance_after != null) {
    return lastWithBalance.balance_after;
  }

  if (account.beginning_balance != null) {
    return account.beginning_balance + account.net_amount;
  }

  return account.net_amount;
}
