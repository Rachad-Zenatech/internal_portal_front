// src/pages/GeneralLedgerUpload.tsx

import { useEffect, useMemo, useState } from "react";
import {
  GLService,
  type CompanyBook,
  type ImportPreview,
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
  const [error, setError] = useState<string | null>(null);

  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    date: 180,
    account: 180,
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

  useEffect(() => {
    loadSetup();
  }, []);

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

  async function handleParse() {
    if (!bookId || !file) return;

    setIsParsing(true);
    setError(null);
    setSummary(null);
    setPreview(null);

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
            <section className="rounded-lg border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-medium">Review Parsed GL</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Showing the first {preview.rows.length} of{" "}
                    {preview.totals.line_count} parsed lines.
                  </p>
                </div>

                <div className="flex gap-6 text-right text-sm">
                  <div>
                    <p className="text-xs uppercase text-gray-500">Debits</p>
                    <p className="font-semibold">
                      {formatMoney(preview.totals.debits)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-gray-500">Credits</p>
                    <p className="font-semibold">
                      {formatMoney(preview.totals.credits)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs uppercase text-gray-500">Balance</p>
                    <p
                      className={`font-semibold ${
                        Math.abs(
                          preview.totals.debits - preview.totals.credits
                        ) < 0.005
                          ? "text-green-700"
                          : "text-red-700"
                      }`}
                    >
                      {formatMoney(
                        preview.totals.debits - preview.totals.credits
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-lg border">
                <table className="table-fixed text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
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
                    {preview.rows.map((row, index) => (
                      <tr
                        key={index}
                        className="border-b align-top last:border-b-0"
                      >
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
            </section>
          )}

          <section className="rounded-lg border bg-white p-4 shadow-sm">
            <h2 className="text-lg font-medium">Save Import</h2>
            <p className="mt-1 text-sm text-gray-500">
              Review the parsed rows above, then save to make this import
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