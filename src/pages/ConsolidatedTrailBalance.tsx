// src/pages/ConsolidatedTrailBalance.tsx

import { Fragment, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download, Check, X, Search, Info, ChevronsLeft, ChevronLeft, ChevronsRight } from "lucide-react";
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
  const [tableSearch, setTableSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const searched = useMemo(() => {
    if (!tableSearch.trim()) return selected;
    const lower = tableSearch.toLowerCase();
    return selected.filter((c) => 
      c.company_name.toLowerCase().includes(lower) || 
      (c.entity && c.entity.toLowerCase().includes(lower))
    );
  }, [selected, tableSearch]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return searched.slice(start, start + pageSize);
  }, [searched, page, pageSize]);

  const totalPages = Math.ceil(searched.length / pageSize) || 1;

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
    <div className="w-full space-y-6 pt-2 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      
      {/* Alert Banner */}
      <div className={`flex flex-col xl:flex-row items-start xl:items-center justify-between p-6 rounded-2xl border ${summary.tiesOut ? 'bg-green-50/50 border-green-200' : 'bg-red-50/80 border-red-200'} shadow-sm`}>
        <div className="flex items-center gap-5">
          <div className={`flex-shrink-0 flex items-center justify-center w-14 h-14 rounded-full ${summary.tiesOut ? 'bg-green-600 text-white shadow-md shadow-green-600/20' : 'bg-red-600 text-white shadow-md shadow-red-600/20'}`}>
            {summary.tiesOut ? <Check className="w-7 h-7" /> : <X className="w-7 h-7" />}
          </div>
          <div>
            <h3 className={`text-xl font-bold ${summary.tiesOut ? 'text-green-700' : 'text-red-700'}`}>
              {summary.tiesOut ? 'Balanced' : 'Out of balance'}
            </h3>
            <p className="text-sm text-slate-600 mt-1">
              {summary.tiesOut ? 'Book and bank balances tie out' : 'Book and bank balances do not match'}
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap xl:flex-nowrap gap-x-12 gap-y-4 mt-6 xl:mt-0 w-full xl:w-auto xl:justify-end">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-500 dark:text-zinc-400 mb-1">{summary.tiesOut ? 'Difference' : 'Out of Balance Amount'}</span>
            <span className={`text-3xl font-extrabold tracking-tight ${summary.tiesOut ? 'text-green-700' : 'text-red-600'}`}>
              {summary.tiesOut ? '$0.00' : `${summary.difference < 0 ? '-' : ''}$${money(Math.abs(summary.difference))}`}
            </span>
          </div>
          <div className="w-px h-12 bg-slate-200 hidden xl:block self-center"></div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-500 dark:text-zinc-400 mb-1">Adjusted Book Balance</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-zinc-50 tracking-tight">${money(summary.adjustedBook)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-slate-500 dark:text-zinc-400 mb-1">Adjusted Bank Balance</span>
            <span className="text-2xl font-bold text-slate-900 dark:text-zinc-50 tracking-tight">${money(summary.adjustedBank)}</span>
          </div>
        </div>
      </div>

      <Card className="p-4 shadow-sm rounded-2xl border-slate-200 dark:border-zinc-800">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="space-y-1.5 flex-1 w-full">
            <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">View</Label>
            <Select value={view} onValueChange={setView}>
              <SelectTrigger className="w-full h-11 bg-slate-50/50 dark:bg-zinc-800/50">
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

          <div className="space-y-1.5 w-full md:w-48">
            <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Quarter</Label>
            <Select value={String(quarter)} onValueChange={(v) => setQuarter(Number(v))}>
              <SelectTrigger className="h-11 bg-slate-50/50 dark:bg-zinc-800/50">
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

          <div className="space-y-1.5 w-full md:w-32">
            <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300 uppercase tracking-wider">Year</Label>
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="h-11 bg-slate-50/50 dark:bg-zinc-800/50"
            />
          </div>
          
          <Button className="h-11 px-8 bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm w-full md:w-auto">
            Apply Filters
          </Button>
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
          <div className="grid xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 flex flex-col h-full">
              <Card className="flex-1 flex flex-col overflow-hidden shadow-sm rounded-2xl border-slate-200 dark:border-zinc-800">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border-b border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 gap-4">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-50">
                    Book vs Bank — {data?.period_label ?? `Q${quarter} ${year}`}
                  </h2>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input 
                      placeholder="Search company or entity..." 
                      className="pl-9 bg-slate-50 border-slate-200 dark:border-zinc-800 h-9 text-sm"
                      value={tableSearch}
                      onChange={(e) => {
                        setTableSearch(e.target.value);
                        setPage(1);
                      }}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow>
                        <TableHead className="font-semibold text-slate-900 dark:text-zinc-50">Company</TableHead>
                        <TableHead className="font-semibold text-slate-900 dark:text-zinc-50">Entity</TableHead>
                        <TableHead className="text-right font-semibold text-slate-900 dark:text-zinc-50">Book Balance</TableHead>
                        <TableHead className="text-right font-semibold text-slate-900 dark:text-zinc-50">Bank Balance</TableHead>
                        <TableHead className="text-right font-semibold text-slate-900 dark:text-zinc-50">Difference</TableHead>
                        <TableHead className="text-center font-semibold text-slate-900 dark:text-zinc-50">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginated.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-slate-500 dark:text-zinc-400 p-8">
                            No data for this selection.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginated.map((c: ConsolidatedCompany) => {
                          const isBalanced = Math.abs(c.difference) < 0.01;
                          return (
                            <TableRow key={c.company_id} className="hover:bg-slate-50/50 dark:bg-zinc-800/50">
                              <TableCell className="font-medium text-slate-900 dark:text-zinc-50">{c.company_name}</TableCell>
                              <TableCell className="text-slate-600">{c.entity ?? "-"}</TableCell>
                              <TableCell className="text-right font-medium">{money(c.book_balance)}</TableCell>
                              <TableCell className="text-right font-medium">{money(c.bank_balance)}</TableCell>
                              <TableCell className="text-right font-medium">{money(c.difference)}</TableCell>
                              <TableCell className="text-center">
                                <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${isBalanced ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {isBalanced ? 'Balanced' : 'Out of balance'}
                                </span>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                      <TableRow className="bg-slate-50/50 dark:bg-zinc-800/50 hover:bg-slate-50/50 dark:bg-zinc-800/50">
                        <TableCell colSpan={2} className="font-bold text-slate-900 dark:text-zinc-50">Total (All Companies)</TableCell>
                        <TableCell className="text-right font-bold text-slate-900 dark:text-zinc-50">{money(summary.bookBalance)}</TableCell>
                        <TableCell className="text-right font-bold text-slate-900 dark:text-zinc-50">{money(summary.bankBalance)}</TableCell>
                        <TableCell className="text-right font-bold text-slate-900 dark:text-zinc-50">{money(summary.difference)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                
                <div className="flex flex-col lg:flex-row items-center justify-center p-4 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 gap-8">
                  <div className="text-sm text-slate-500 dark:text-zinc-400 text-center">
                    {searched.length} total company(s).
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-6 justify-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-900 dark:text-zinc-50">Rows per page</span>
                      <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                        <SelectTrigger className="h-8 w-[70px] border-slate-200 dark:border-zinc-800 text-sm shadow-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="text-sm font-medium text-slate-900 dark:text-zinc-50 whitespace-nowrap">
                      Page {page} of {totalPages}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-slate-500 dark:text-zinc-400 shadow-sm"
                        onClick={() => setPage(1)}
                        disabled={page === 1}
                      >
                        <ChevronsLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-slate-500 dark:text-zinc-400 shadow-sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-slate-500 dark:text-zinc-400 shadow-sm"
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-slate-500 dark:text-zinc-400 shadow-sm"
                        onClick={() => setPage(totalPages)}
                        disabled={page === totalPages}
                      >
                        <ChevronsRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
            
            <div className="xl:col-span-1 flex flex-col h-fit sticky top-6">
              <Card className="flex-1 flex flex-col overflow-hidden shadow-sm rounded-2xl border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                <div className="p-5 border-b border-slate-100 dark:border-zinc-800 bg-slate-50/50 dark:bg-zinc-800/50">
                  <h2 className="text-lg font-bold text-slate-900 dark:text-zinc-50">Reconciliation Proof</h2>
                  <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Mathematical verification of balances.</p>
                </div>
                <div className="p-6 flex flex-col gap-6">
                  {/* Book Section */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-500 dark:text-zinc-400">Ending Book Balance</span>
                      <span className="font-bold text-slate-900 dark:text-zinc-50">{summary.bookBalance < 0 ? '-' : ''}${money(Math.abs(summary.bookBalance))}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
                        <div className="w-5 h-5 rounded bg-green-100 text-green-700 flex items-center justify-center font-bold text-xs">+</div>
                        In bank, not yet in books
                      </div>
                      <span className="font-semibold text-green-600">${money(Math.abs(summary.inBankTotal))}</span>
                    </div>
                    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center">
                      <span className="text-sm font-bold text-blue-700">Adjusted Book Balance</span>
                      <span className="font-bold text-blue-700">{summary.adjustedBook < 0 ? '-' : ''}${money(Math.abs(summary.adjustedBook))}</span>
                    </div>
                  </div>
                  
                  <div className="h-px bg-slate-200 w-full relative">
                    <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white dark:bg-zinc-900 px-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">VS</div>
                  </div>

                  {/* Bank Section */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-500 dark:text-zinc-400">Ending Bank Balance</span>
                      <span className="font-bold text-slate-900 dark:text-zinc-50">{summary.bankBalance < 0 ? '-' : ''}${money(Math.abs(summary.bankBalance))}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2 text-slate-500 dark:text-zinc-400">
                        <div className="w-5 h-5 rounded bg-red-100 text-red-700 flex items-center justify-center font-bold text-xs">−</div>
                        In books, not in bank
                      </div>
                      <span className="font-semibold text-red-600">-${money(Math.abs(summary.inBooksTotal))}</span>
                    </div>
                    <div className="pt-3 border-t border-slate-100 dark:border-zinc-800 flex justify-between items-center">
                      <span className="text-sm font-bold text-blue-700">Adjusted Bank Balance</span>
                      <span className="font-bold text-blue-700">{summary.adjustedBank < 0 ? '-' : ''}${money(Math.abs(summary.adjustedBank))}</span>
                    </div>
                  </div>
                  
                  {/* Status Section */}
                  <div className={`mt-2 p-4 rounded-xl flex flex-col 2xl:flex-row items-start 2xl:items-center justify-between gap-4 ${summary.tiesOut ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                    <div className={`flex items-center gap-3 font-bold ${summary.tiesOut ? "text-green-700" : "text-red-700"}`}>
                      {summary.tiesOut ? (
                        <div className="w-10 h-10 shrink-0 rounded-full bg-green-100 flex items-center justify-center"><Check className="w-5 h-5" /></div>
                      ) : (
                        <div className="w-10 h-10 shrink-0 rounded-full bg-red-100 flex items-center justify-center"><X className="w-5 h-5" /></div>
                      )}
                      <div>
                        <div className="text-base leading-none">{summary.tiesOut ? "Reconciled" : "Out of balance"}</div>
                        {!summary.tiesOut && <div className="text-xs font-medium opacity-80 mt-1">Balances don't tie out</div>}
                      </div>
                    </div>
                    <div className={`text-2xl font-black tracking-tight ${summary.tiesOut ? "text-green-700" : "text-red-700"}`}>
                      {summary.adjustedBank - summary.adjustedBook < 0 ? '-' : ''}${money(Math.abs(summary.adjustedBank - summary.adjustedBook))}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2 items-start mt-8">
            <ReconcilingTable
              title="In Bank, Missing in Books"
              subtitle="Cleared the bank — not yet recorded in the GL."
              companies={searched}
              getItems={(c) => c.in_bank_not_in_books}
              exportMissingInBooks={{ year, quarter }}
            />
            <ReconcilingTable
              title="In Books, Missing in Bank"
              subtitle="Recorded in the GL — not yet cleared (outstanding)."
              companies={searched}
              getItems={(c) => c.in_books_not_in_bank}
            />
          </div>

          <div className="mt-8 bg-blue-50/80 border border-blue-200 rounded-2xl p-6 flex items-start gap-4 shadow-sm">
            <div className="bg-blue-600 text-white rounded-full p-1.5 flex-shrink-0 mt-0.5">
              <Info className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-blue-900 font-bold text-base mb-1">Reconciliation Tip</h4>
              <p className="text-blue-800 text-sm">
                Review items in "Missing in Books" and "Missing in Bank" and take the required actions to achieve a zero out of balance.
              </p>
            </div>
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

  const [expandedCompanyIds, setExpandedCompanyIds] = useState<Set<number>>(() => new Set());
  const [preview, setPreview] = useState<{ company: ConsolidatedCompany; rows: EditableMissingInBooksRow[]; } | null>(null);
  
  const downloadMutation = useDownloadMissingInBooksExport();

  const toggleCompany = (companyId: number) => {
    setExpandedCompanyIds((current) => {
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
    } catch {
      // the mutation handles its own error states
    }
  };

  const previewTotal = preview?.rows.reduce((sum, row) => sum + Number(row.amountText || 0), 0) ?? 0;

  return (
    <Card className="overflow-hidden shadow-sm rounded-2xl border-slate-200 dark:border-zinc-800 flex flex-col h-full bg-white dark:bg-zinc-900">
      <div className="border-b border-slate-100 dark:border-zinc-800 p-5">
        <h3 className="flex items-center gap-1.5 font-bold text-xl text-slate-900 dark:text-zinc-50">
          <HighlightedMissingTitle title={title} />
        </h3>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">{subtitle}</p>
      </div>
      <div className="overflow-x-auto flex-1">
        <Table>
          <TableBody>
            {groups.length === 0 ? (
              <TableRow>
                <TableCell className="text-center text-slate-500 dark:text-zinc-400 p-8">
                  Nothing outstanding.
                </TableCell>
              </TableRow>
            ) : (
              groups.map(({ company, items }) => {
                const companyTotal = items.reduce((s, i) => s + i.amount, 0);
                const isCollapsed = !expandedCompanyIds.has(company.company_id);
                const ToggleIcon = isCollapsed ? ChevronRight : ChevronDown;

                return (
                  <Fragment key={company.company_id}>
                    <TableRow className="hover:bg-slate-50 border-b border-slate-100 dark:border-zinc-800">
                      <TableCell colSpan={3} className="p-0">
                        <div className="flex flex-col p-4 space-y-4">
                          <button
                            type="button"
                            aria-expanded={!isCollapsed}
                            onClick={() => toggleCompany(company.company_id)}
                            className="flex w-full items-center justify-between text-left font-bold text-sm text-slate-900 dark:text-zinc-50"
                          >
                            <span className="flex items-center gap-2">
                              <ToggleIcon className="h-4 w-4 text-slate-500 dark:text-zinc-400" />
                              {company.company_name}
                              {company.entity && <span className="text-xs font-normal text-slate-500 dark:text-zinc-400">({company.entity})</span>}
                            </span>
                            <span className="flex items-center gap-6 text-xs">
                              <span className="text-slate-500 dark:text-zinc-400 font-normal">{items.length} items</span>
                              <span className={`font-bold text-sm ${companyTotal < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {companyTotal < 0 ? '-' : ''}${money(Math.abs(companyTotal))}
                              </span>
                            </span>
                          </button>

                          {exportMissingInBooks && !isCollapsed && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-fit self-start px-6 flex gap-2 justify-center border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 bg-white dark:bg-zinc-900 hover:bg-slate-50 shadow-sm rounded-lg h-9"
                              onClick={() => openPreview(company, items)}
                            >
                              <Download className="h-4 w-4" />
                              Preview & Export Register Workbook
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {!isCollapsed && (
                      <TableRow className="bg-slate-50/50 dark:bg-zinc-800/50 p-0 border-b border-slate-100 dark:border-zinc-800">
                        <TableCell className="p-0">
                          <Table className="w-full">
                            <TableHeader>
                              <TableRow className="hover:bg-transparent border-b border-slate-100 dark:border-zinc-800">
                                <TableHead className="py-3 px-6 text-slate-900 dark:text-zinc-50 font-bold text-xs h-auto">Date</TableHead>
                                <TableHead className="py-3 px-6 text-slate-900 dark:text-zinc-50 font-bold text-xs h-auto w-full">Description</TableHead>
                                <TableHead className="py-3 px-6 text-slate-900 dark:text-zinc-50 font-bold text-xs h-auto text-right">Amount</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {items.map((i, idx) => (
                                <TableRow key={`${company.company_id}-${idx}`} className="hover:bg-white dark:bg-zinc-900 border-b border-slate-100 dark:border-zinc-800/50">
                                  <TableCell className="text-slate-600 py-3 px-6 text-xs whitespace-nowrap align-top">{i.date ?? "-"}</TableCell>
                                  <TableCell className="text-slate-900 dark:text-zinc-50 py-3 px-6 text-xs whitespace-normal break-words min-w-[200px] align-top">{i.description}</TableCell>
                                  <TableCell className={`text-right font-medium py-3 px-6 text-xs whitespace-nowrap align-top ${i.amount < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    {i.amount < 0 ? '-' : ''}${money(Math.abs(i.amount))}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      
      {/* Remove the grand total footer to match design exactly (they only had it per company or in the main grid) */}

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
