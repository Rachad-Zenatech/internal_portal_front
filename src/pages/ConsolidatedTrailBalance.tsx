// src/pages/ConsolidatedTrailBalance.tsx

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download } from "lucide-react";
import type {
  ConsolidatedCompany,
  MissingInBooksExportRow,
  ReconcilingItem,
} from "@/types/gl";
import { useConsolidated, useDownloadMissingInBooksExport } from "@/hooks/useGL";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const QUARTERS = [1, 2, 3, 4];
const EMPTY_COMPANIES: ConsolidatedCompany[] = [];

type View = string;

type EditableMissingInBooksRow = MissingInBooksExportRow & {
  id: string;
  amountText: string;
};

function money(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function compareCompanies(a: ConsolidatedCompany, b: ConsolidatedCompany) {
  return (
    a.company_name.localeCompare(b.company_name, undefined, {
      sensitivity: "base",
    }) ||
    (a.entity ?? "").localeCompare(b.entity ?? "", undefined, {
      sensitivity: "base",
    }) ||
    a.company_id - b.company_id
  );
}

function compareReconcilingItems(a: ReconcilingItem, b: ReconcilingItem) {
  return (
    (a.date ?? "").localeCompare(b.date ?? "") ||
    a.description.localeCompare(b.description, undefined, {
      sensitivity: "base",
    }) ||
    a.amount - b.amount
  );
}

export default function ConsolidatedTrialBalance() {
  const [year, setYear] = useState(2026);
  const [quarter, setQuarter] = useState(1);
  const [view, setView] = useState<View>("all");

  const { data, isLoading, error } = useConsolidated(year, quarter);

  const companies = data?.companies ?? EMPTY_COMPANIES;

  const entities = useMemo(() => {
    const set = new Set<string>();
    companies.forEach((c) => {
      if (c.entity) set.add(c.entity);
    });
    return Array.from(set).sort();
  }, [companies]);

  const selected = useMemo(() => {
    if (view === "all") return companies;
    if (view.startsWith("entity:")) {
      const entity = view.slice("entity:".length);
      return companies.filter((c) => c.entity === entity);
    }
    if (view.startsWith("company:")) {
      const id = Number(view.slice("company:".length));
      return companies.filter((c) => c.company_id === id);
    }
    return companies;
  }, [companies, view]);

  const summary = useMemo(() => {
    const bookBalance = selected.reduce((s, c) => s + c.book_balance, 0);
    const bankBalance = selected.reduce((s, c) => s + c.bank_balance, 0);
    const inBankNotInBooks = selected.flatMap((c) => c.in_bank_not_in_books);
    const inBooksNotInBank = selected.flatMap((c) => c.in_books_not_in_bank);
    const inBankTotal = inBankNotInBooks.reduce((s, i) => s + i.amount, 0);
    const inBooksTotal = inBooksNotInBank.reduce((s, i) => s + i.amount, 0);

    const adjustedBook = bookBalance + inBankTotal;
    const adjustedBank = bankBalance - inBooksTotal;

    return {
      bookBalance,
      bankBalance,
      difference: bankBalance - bookBalance,
      inBankNotInBooks,
      inBooksNotInBank,
      inBankTotal,
      inBooksTotal,
      adjustedBook,
      adjustedBank,
      tiesOut: Math.abs(adjustedBank - adjustedBook) < 0.01,
    };
  }, [selected]);

  return (
    <div className="space-y-6 pt-4 pb-8 max-w-[1600px] mx-auto">
      <div>
        <h2 className="text-xl font-semibold">Book vs Bank Proof</h2>
        <p className="text-sm text-muted-foreground mt-1">
          GL (book) vs bank across all companies — view by entity or a single
          company, with reconciliation proof.
        </p>
      </div>

      <Card className="p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-2">
            <Label>View</Label>
            <Select value={view} onValueChange={setView}>
              <SelectTrigger>
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies (consolidated)</SelectItem>
                {entities.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>By Entity</SelectLabel>
                    {entities.map((ent) => (
                      <SelectItem key={ent} value={`entity:${ent}`}>
                        Entity: {ent}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                <SelectGroup>
                  <SelectLabel>By Company</SelectLabel>
                  {companies.map((c) => (
                    <SelectItem key={c.company_id} value={`company:${c.company_id}`}>
                      {c.company_name} {c.entity ? `(${c.entity})` : ""}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Quarter</Label>
            <Select value={String(quarter)} onValueChange={(v) => setQuarter(Number(v))}>
              <SelectTrigger>
                <SelectValue placeholder="Select Quarter" />
              </SelectTrigger>
              <SelectContent>
                {QUARTERS.map((q) => (
                  <SelectItem key={q} value={String(q)}>
                    Q{q}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Year</Label>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </div>
        </div>
      </Card>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error.message || "Failed to load consolidated reconciliation"}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
          Loading consolidated trial balance...
        </div>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="border-b bg-muted/30 p-4">
              <h2 className="text-lg font-semibold">
                Book vs Bank — {data?.period_label ?? `Q${quarter} ${year}`}
              </h2>
            </div>

            <Table>
              <TableHeader className="bg-muted/10">
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead className="text-right">Book Balance</TableHead>
                  <TableHead className="text-right">Bank Balance</TableHead>
                  <TableHead className="text-right">Difference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selected.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground p-6">
                      No data for this selection.
                    </TableCell>
                  </TableRow>
                ) : (
                  selected.map((c: ConsolidatedCompany) => (
                    <TableRow key={c.company_id}>
                      <TableCell className="font-medium">{c.company_name}</TableCell>
                      <TableCell>{c.entity ?? "-"}</TableCell>
                      <TableCell className="text-right">{money(c.book_balance)}</TableCell>
                      <TableCell className="text-right">{money(c.bank_balance)}</TableCell>
                      <TableCell className="text-right">{money(c.difference)}</TableCell>
                    </TableRow>
                  ))
                )}
                <TableRow className="bg-muted/20 font-bold">
                  <TableCell colSpan={2}>Totals</TableCell>
                  <TableCell className="text-right">{money(summary.bookBalance)}</TableCell>
                  <TableCell className="text-right">{money(summary.bankBalance)}</TableCell>
                  <TableCell className="text-right">{money(summary.difference)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>

          <Card className="overflow-hidden">
            <div className="border-b bg-muted/30 p-4">
              <h2 className="text-lg font-semibold">Reconciliation Proof</h2>
            </div>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell>Ending Book Balance</TableCell>
                  <TableCell className="text-right font-medium">{money(summary.bookBalance)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>+ In bank, not yet in books</TableCell>
                  <TableCell className="text-right">{money(summary.inBankTotal)}</TableCell>
                </TableRow>
                <TableRow className="bg-muted/10 font-semibold">
                  <TableCell>Adjusted Book Balance</TableCell>
                  <TableCell className="text-right">{money(summary.adjustedBook)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Ending Bank Balance</TableCell>
                  <TableCell className="text-right font-medium">{money(summary.bankBalance)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>− In books, not in bank</TableCell>
                  <TableCell className="text-right">{money(summary.inBooksTotal)}</TableCell>
                </TableRow>
                <TableRow className="bg-muted/10 font-semibold">
                  <TableCell>Adjusted Bank Balance</TableCell>
                  <TableCell className="text-right">{money(summary.adjustedBank)}</TableCell>
                </TableRow>
                <TableRow className={summary.tiesOut ? "bg-green-50/50" : "bg-red-50/50"}>
                  <TableCell className={`font-bold ${summary.tiesOut ? "text-green-700" : "text-red-700"}`}>
                    {summary.tiesOut ? "✓ Reconciled" : "✗ Out of balance"}
                  </TableCell>
                  <TableCell className={`text-right font-bold ${summary.tiesOut ? "text-green-700" : "text-red-700"}`}>
                    {money(summary.adjustedBank - summary.adjustedBook)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2 items-start">
            <ReconcilingTable
              title="In Bank, Missing in Books"
              subtitle="Cleared the bank — not yet recorded in the GL."
              companies={selected}
              getItems={(c) => c.in_bank_not_in_books}
              exportMissingInBooks={{ year, quarter }}
            />
            <ReconcilingTable
              title="In Books, Missing in Bank"
              subtitle="Recorded in the GL — not yet cleared (outstanding)."
              companies={selected}
              getItems={(c) => c.in_books_not_in_bank}
            />
          </div>
        </>
      )}
    </div>
  );
}

function ReconcilingTable({
  title,
  subtitle,
  companies,
  getItems,
  exportMissingInBooks,
}: {
  title: string;
  subtitle: string;
  companies: ConsolidatedCompany[];
  getItems: (c: ConsolidatedCompany) => ReconcilingItem[];
  exportMissingInBooks?: { year: number; quarter: number };
}) {
  const groups = companies
    .map((c) => ({
      company: c,
      items: [...getItems(c)].sort(compareReconcilingItems),
    }))
    .filter((g) => g.items.length > 0)
    .sort((a, b) => compareCompanies(a.company, b.company));

  const grandTotal = groups.reduce((s, g) => s + g.items.reduce((ss, i) => ss + i.amount, 0), 0);
  const grandCount = groups.reduce((s, g) => s + g.items.length, 0);

  const [collapsedCompanyIds, setCollapsedCompanyIds] = useState<Set<number>>(() => new Set());
  const [preview, setPreview] = useState<{ company: ConsolidatedCompany; rows: EditableMissingInBooksRow[]; } | null>(null);
  
  const downloadMutation = useDownloadMissingInBooksExport();

  const toggleCompany = (companyId: number) => {
    setCollapsedCompanyIds((current) => {
      const next = new Set(current);
      if (next.has(companyId)) next.delete(companyId);
      else next.add(companyId);
      return next;
    });
  };

  const openPreview = (company: ConsolidatedCompany, items: ReconcilingItem[]) => {
    setPreview({
      company,
      rows: items.map((item, index) => ({
        id: `${company.company_id}-${index}-${item.date ?? "no-date"}`,
        date: item.date,
        description: item.description,
        amount: item.amount,
        amountText: String(item.amount),
        kind: item.kind ?? null,
      })),
    });
  };

  const updatePreviewRow = (id: string, patch: Partial<EditableMissingInBooksRow>) => {
    setPreview((current) =>
      current
        ? { ...current, rows: current.rows.map((row) => (row.id === id ? { ...row, ...patch } : row)) }
        : current
    );
  };

  const addPreviewRow = () => {
    setPreview((current) =>
      current
        ? {
            ...current,
            rows: [
              ...current.rows,
              {
                id: `manual-${Date.now()}`,
                date: null,
                description: "",
                amount: 0,
                amountText: "0.00",
                kind: "manual",
              },
            ],
          }
        : current
    );
  };

  const removePreviewRow = (id: string) => {
    setPreview((current) => (current ? { ...current, rows: current.rows.filter((row) => row.id !== id) } : current));
  };

  const generatePreviewExport = async () => {
    if (!preview || !exportMissingInBooks) return;

    const items = preview.rows.map((row) => ({
      date: row.date || null,
      description: row.description.trim() || "Missing bank transaction",
      amount: Number(row.amountText || 0),
      kind: row.kind,
    }));

    try {
      const download = await downloadMutation.mutateAsync({
        companyId: preview.company.company_id,
        year: exportMissingInBooks.year,
        quarter: exportMissingInBooks.quarter,
        items,
      });
      const url = URL.createObjectURL(download.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = download.filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setPreview(null);
    } catch (err) {
      // the mutation handles its own error states
    }
  };

  const previewTotal = preview?.rows.reduce((sum, row) => sum + Number(row.amountText || 0), 0) ?? 0;

  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-muted/30 p-4">
        <h3 className="flex items-center gap-1.5 font-semibold text-lg">
          <HighlightedMissingTitle title={title} />
        </h3>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
      <Table>
        <TableHeader className="bg-muted/10">
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.length === 0 ? (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-muted-foreground p-6">
                Nothing outstanding.
              </TableCell>
            </TableRow>
          ) : (
            groups.map(({ company, items }) => {
              const companyTotal = items.reduce((s, i) => s + i.amount, 0);
              const isCollapsed = collapsedCompanyIds.has(company.company_id);
              const ToggleIcon = isCollapsed ? ChevronRight : ChevronDown;

              return (
                <Fragment key={company.company_id}>
                  <TableRow className="bg-muted/20 hover:bg-muted/30">
                    <TableCell colSpan={3} className="p-0">
                      <div className="flex flex-col p-2 space-y-2">
                        <button
                          type="button"
                          aria-expanded={!isCollapsed}
                          onClick={() => toggleCompany(company.company_id)}
                          className="flex w-full items-center justify-between text-left font-medium"
                        >
                          <span className="flex items-center gap-2">
                            <ToggleIcon className="h-4 w-4 text-muted-foreground" />
                            {company.company_name}
                            {company.entity && <span className="text-xs text-muted-foreground">({company.entity})</span>}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {items.length} | {money(companyTotal)}
                          </span>
                        </button>

                        {exportMissingInBooks && !isCollapsed && (
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full flex gap-2 justify-center"
                            onClick={() => openPreview(company, items)}
                          >
                            <Download className="h-4 w-4" />
                            Preview & Export Register Workbook
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>

                  {!isCollapsed &&
                    items.map((i, idx) => (
                      <TableRow key={`${company.company_id}-${idx}`}>
                        <TableCell className="text-muted-foreground">{i.date ?? "-"}</TableCell>
                        <TableCell>{i.description}</TableCell>
                        <TableCell className="text-right font-medium">{money(i.amount)}</TableCell>
                      </TableRow>
                    ))}
                </Fragment>
              );
            })
          )}

          <TableRow className="bg-muted/10 font-bold">
            <TableCell colSpan={2}>Total ({grandCount})</TableCell>
            <TableCell className="text-right">{money(grandTotal)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-5xl flex flex-col max-h-[90vh] shadow-2xl">
            <div className="border-b p-6 flex flex-col md:flex-row md:justify-between items-start">
              <div>
                <h3 className="text-xl font-bold">Preview In Bank, Missing in Books</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review and edit rows for {preview.company.company_name}.
                  These changes only apply to the generated Register workbook and CSV.
                </p>
              </div>
              <div className="text-sm font-semibold mt-4 md:mt-0 bg-muted px-3 py-1.5 rounded-md">
                {preview.rows.length} rows | {money(previewTotal)}
              </div>
            </div>

            {downloadMutation.error && (
              <div className="border-b border-red-200 bg-red-50 p-4 text-sm text-red-700">
                {downloadMutation.error.message || "Failed to generate export"}
              </div>
            )}

            <div className="overflow-auto flex-1 p-4">
              <Table>
                <TableHeader className="bg-muted/50 sticky top-0 z-10">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Input type="date" value={row.date ?? ""} onChange={(e) => updatePreviewRow(row.id, { date: e.target.value || null })} />
                      </TableCell>
                      <TableCell>
                        <Input value={row.description} onChange={(e) => updatePreviewRow(row.id, { description: e.target.value })} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" step="0.01" value={row.amountText} onChange={(e) => updatePreviewRow(row.id, { amountText: e.target.value })} className="text-right" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="destructive" size="sm" onClick={() => removePreviewRow(row.id)}>Remove</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="border-t p-4 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-4">
              <Button variant="outline" onClick={addPreviewRow}>Add Row</Button>
              <div className="flex gap-2">
                <Button variant="ghost" disabled={downloadMutation.isPending} onClick={() => setPreview(null)}>Cancel</Button>
                <Button disabled={downloadMutation.isPending} onClick={generatePreviewExport}>
                  {downloadMutation.isPending ? "Generating..." : "Generate Export"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </Card>
  );
}

function HighlightedMissingTitle({ title }: { title: string }) {
  const missingIndex = title.indexOf("Missing");
  if (missingIndex === -1) return title;
  return (
    <>
      <span>{title.slice(0, missingIndex)}</span>
      <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-red-700">
        {title.slice(missingIndex)}
      </span>
    </>
  );
}
