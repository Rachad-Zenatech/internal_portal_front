import { useEffect, useState, useMemo } from "react";
import { useCompanyCards, useTrialBalance } from "@/hooks/useGL";
import type { TrialBalanceRow } from "@/types/gl";
import ConsolidatedTrialBalance from "./ConsolidatedTrailBalance";

import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Wallet, BarChart2, Users, Search, ArrowUpDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

// Types
const PERIODS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december", "q1", "q2", "q3", "q4", "year", "custom"] as const;
type PeriodType = (typeof PERIODS)[number];
type TrialBalanceSortColumn = keyof TrialBalanceRow | "balance";
const EMPTY_TRIAL_BALANCE_ROWS: TrialBalanceRow[] = [];

// Helper functions
function formatMoney(value: number, showParenthesesForNegative = true) {
  if (value === 0) return "-";
  const absValue = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (value < 0 && showParenthesesForNegative) {
    return `(${absValue})`;
  } else if (value < 0) {
    return `-${absValue}`;
  }
  return absValue;
}

function getAccountTypeColor(type: string | null | undefined) {
  if (!type) return "bg-slate-100 text-slate-700 dark:text-zinc-300";
  const t = type.toLowerCase();
  if (t.includes('bank') || t.includes('cash')) return "bg-green-100 text-green-700 hover:bg-green-200";
  if (t.includes('receivable')) return "bg-purple-100 text-purple-700 hover:bg-purple-200";
  if (t.includes('payable')) return "bg-red-100 text-red-700 hover:bg-red-200";
  if (t.includes('asset')) return "bg-blue-100 text-blue-700 hover:bg-blue-200";
  if (t.includes('equity')) return "bg-emerald-100 text-emerald-700 hover:bg-emerald-200";
  if (t.includes('income') || t.includes('revenue')) return "bg-teal-100 text-teal-700 hover:bg-teal-200";
  if (t.includes('expense')) return "bg-orange-100 text-orange-700 hover:bg-orange-200";
  if (t.includes('liability')) return "bg-rose-100 text-rose-700 hover:bg-rose-200";
  return "bg-slate-100 text-slate-700 dark:text-zinc-300 hover:bg-slate-200";
}

function getTrialBalanceSortValue(row: TrialBalanceRow, column: TrialBalanceSortColumn) {
  if (column === "balance") return row.debit - row.credit;
  return row[column];
}

export default function TrialBalance() {
  const [period, setPeriod] = useState<PeriodType>("year");
  const [year, setYear] = useState<number>(2026);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"trial" | "consolidated">("trial");

  // Datatable state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState("");
  
  // Sort state
  const [sortCol, setSortCol] = useState<TrialBalanceSortColumn>("account_number");
  const [sortDesc, setSortDesc] = useState(false);

  const handleSort = (col: TrialBalanceSortColumn) => {
    if (sortCol === col) {
      setSortDesc(!sortDesc);
    } else {
      setSortCol(col);
      setSortDesc(false);
    }
  };

  const { data: cards = [], isLoading: loadingCards, error: cardsError } = useCompanyCards(period, year);

  const companies = useMemo(() => {
    const seen = new Map<number, { company_id: number; company_name: string }>();
    for (const card of cards) {
      if (!seen.has(card.company_id)) {
        seen.set(card.company_id, {
          company_id: card.company_id,
          company_name: card.company_name,
        });
      }
    }
    return Array.from(seen.values());
  }, [cards]);

  useEffect(() => {
    if (companies.length > 0 && companyId === null) {
      setCompanyId(companies[0].company_id);
    }
  }, [companies, companyId]);

  const { data: trialBalance, isLoading: loadingTB, error: tbError } = useTrialBalance(companyId, period, year);
  const trialBalanceRows = trialBalance?.rows ?? EMPTY_TRIAL_BALANCE_ROWS;

  // Derived state for the datatable
  const { filteredRows, totalPages } = useMemo(() => {
    if (!trialBalanceRows.length) return { filteredRows: [], totalPages: 1 };
    
    let rows = [...trialBalanceRows];
    
    // Search
    if (search) {
      const lowerSearch = search.toLowerCase();
      rows = rows.filter(r => 
        String(r.account_number).toLowerCase().includes(lowerSearch) ||
        String(r.account_name).toLowerCase().includes(lowerSearch)
      );
    }

    // Sort
    rows.sort((a, b) => {
      const valA = getTrialBalanceSortValue(a, sortCol);
      const valB = getTrialBalanceSortValue(b, sortCol);

      if (typeof valA === "number" && typeof valB === "number") {
        return sortDesc ? valB - valA : valA - valB;
      }

      const textA = String(valA ?? "");
      const textB = String(valB ?? "");
      return sortDesc ? textB.localeCompare(textA) : textA.localeCompare(textB);
    });
    
    // Pagination
    const totalPages = Math.ceil(rows.length / pageSize);
    const startIdx = (page - 1) * pageSize;
    const paginated = rows.slice(startIdx, startIdx + pageSize);
    
    return { filteredRows: paginated, totalPages: Math.max(1, totalPages) };
  }, [trialBalanceRows, search, sortCol, sortDesc, page, pageSize]);

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">Trial Balance</h1>
          <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
            View the trial balance and consolidated statements for your companies.
          </p>
        </div>
      </header>

      <div className="flex mb-6 gap-2">
        <button
          onClick={() => setActiveTab('trial')}
          className={`relative px-6 py-3 text-sm font-semibold transition-colors duration-200 focus:outline-none
            ${activeTab === 'trial'
              ? 'text-primary after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Trial Balance
        </button>
        <button
          onClick={() => setActiveTab('consolidated')}
          className={`relative px-6 py-3 text-sm font-semibold transition-colors duration-200 focus:outline-none
            ${activeTab === 'consolidated'
              ? 'text-primary after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Consolidated
        </button>
      </div>

      {activeTab === 'trial' && (
        <div className="space-y-6 mt-0 outline-none transition-all duration-300 animate-in fade-in-30 slide-in-from-bottom-2">
          
          {/* TOP FILTER CARD */}
          <Card className="p-4 flex flex-col md:flex-row items-end gap-6 border-slate-200 dark:border-zinc-800 shadow-sm rounded-xl bg-white dark:bg-zinc-900">
            <div className="space-y-1.5 w-full md:w-auto md:flex-1">
              <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Company</Label>
              <Select value={companyId ? String(companyId) : undefined} onValueChange={(val) => setCompanyId(Number(val))} disabled={loadingCards}>
                <SelectTrigger className="h-10 bg-slate-50/50 dark:bg-zinc-800/50">
                  <SelectValue placeholder={loadingCards ? "Loading..." : "Select Company"} />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((item) => (
                    <SelectItem key={item.company_id} value={String(item.company_id)}>
                      {item.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 w-full md:w-64">
              <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Period</Label>
              <Select value={period} onValueChange={(val) => setPeriod(val as PeriodType)}>
                <SelectTrigger className="h-10 bg-slate-50/50 dark:bg-zinc-800/50">
                  <SelectValue placeholder="Select Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Months</SelectLabel>
                    {PERIODS.filter(p => !p.startsWith('q') && p !== 'year' && p !== 'custom').map(p => (
                      <SelectItem key={p} value={p}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                  <SelectGroup>
                    <SelectLabel>Quarters</SelectLabel>
                    <SelectItem value="q1">Q1</SelectItem>
                    <SelectItem value="q2">Q2</SelectItem>
                    <SelectItem value="q3">Q3</SelectItem>
                    <SelectItem value="q4">Q4</SelectItem>
                  </SelectGroup>
                  <SelectItem value="year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 w-full md:w-32">
              <Label className="text-xs font-semibold text-slate-700 dark:text-zinc-300">Year</Label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="h-10 bg-slate-50/50 dark:bg-zinc-800/50"
              />
            </div>
          </Card>

          {/* ERROR DISPLAY */}
          {(cardsError || tbError) && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {cardsError?.message || tbError?.message}
            </div>
          )}

          {/* DATATABLE */}
          {loadingTB || !trialBalance ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-sm text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-900">
              {companyId ? "Loading trial balance..." : "Select a company to view its trial balance."}
            </div>
          ) : trialBalance.rows.length === 0 ? (
            <div className="rounded-xl border border-dashed p-12 text-center text-sm text-slate-500 dark:text-zinc-400 bg-white dark:bg-zinc-900">
              No saved GL data for this company and period.
            </div>
          ) : (
            <Card className="overflow-hidden shadow-sm border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 rounded-xl">
              {/* Stats Header */}
              <div className="p-6 border-b border-slate-100 dark:border-zinc-800 flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-slate-50/30">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-2xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100/50">
                    <FileText className="h-7 w-7 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-zinc-50">
                      {trialBalance.company_name ?? "—"} Trial Balance
                    </h2>
                    <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-widest mt-1">
                      {trialBalance.period_label ?? `${period} ${year}`}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm rounded-xl px-4 py-3 min-w-[200px]">
                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                      <Wallet className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500 dark:text-zinc-400">Total Debit</div>
                      <div className="text-lg font-bold text-blue-700">${formatMoney(trialBalance.totals.debit, false)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm rounded-xl px-4 py-3 min-w-[200px]">
                    <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                      <Wallet className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500 dark:text-zinc-400">Total Credit</div>
                      <div className="text-lg font-bold text-green-700">${formatMoney(trialBalance.totals.credit, false)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm rounded-xl px-4 py-3 min-w-[160px]">
                    <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                      <BarChart2 className="h-5 w-5 text-slate-500 dark:text-zinc-400" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500 dark:text-zinc-400">Difference</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-zinc-50">${formatMoney(Math.abs(trialBalance.totals.debit - trialBalance.totals.credit), false)}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 shadow-sm rounded-xl px-4 py-3 min-w-[140px]">
                    <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
                      <Users className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500 dark:text-zinc-400"># of Accounts</div>
                      <div className="text-lg font-bold text-slate-900 dark:text-zinc-50">{trialBalance.rows.length}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Toolbar */}
              <div className="p-4 flex flex-col sm:flex-row items-center gap-4 border-b border-slate-100 dark:border-zinc-800">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    placeholder="Search account code or description..." 
                    className="pl-9 bg-slate-50 border-slate-200 dark:border-zinc-800 h-9 text-sm"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  />
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-slate-50/50 dark:bg-zinc-800/50">
                    <TableRow className="border-slate-100 dark:border-zinc-800 hover:bg-transparent">
                      <TableHead className="font-semibold text-slate-900 dark:text-zinc-50">
                        <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => handleSort('account_number')}>
                          Account <ArrowUpDown className={`h-3 w-3 ${sortCol === 'account_number' ? 'text-blue-600' : 'text-slate-400'}`} />
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-slate-900 dark:text-zinc-50">
                        <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => handleSort('account_name')}>
                          Description <ArrowUpDown className={`h-3 w-3 ${sortCol === 'account_name' ? 'text-blue-600' : 'text-slate-400'}`} />
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-slate-900 dark:text-zinc-50">
                        <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => handleSort('account_type')}>
                          Type <ArrowUpDown className={`h-3 w-3 ${sortCol === 'account_type' ? 'text-blue-600' : 'text-slate-400'}`} />
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-slate-900 dark:text-zinc-50 text-right">
                        <div className="flex items-center justify-end gap-2 cursor-pointer select-none" onClick={() => handleSort('debit')}>
                          Debit <ArrowUpDown className={`h-3 w-3 ${sortCol === 'debit' ? 'text-blue-600' : 'text-slate-400'}`} />
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-slate-900 dark:text-zinc-50 text-right">
                        <div className="flex items-center justify-end gap-2 cursor-pointer select-none" onClick={() => handleSort('credit')}>
                          Credit <ArrowUpDown className={`h-3 w-3 ${sortCol === 'credit' ? 'text-blue-600' : 'text-slate-400'}`} />
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-slate-900 dark:text-zinc-50 text-right">
                        <div className="flex items-center justify-end gap-2 cursor-pointer select-none" onClick={() => handleSort('balance')}>
                          Balance <ArrowUpDown className={`h-3 w-3 ${sortCol === 'balance' ? 'text-blue-600' : 'text-slate-400'}`} />
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((row) => {
                      const balance = row.debit - row.credit;
                      return (
                        <TableRow key={row.account_number} className="border-slate-100 dark:border-zinc-800 hover:bg-slate-50/50 dark:bg-zinc-800/50">
                          <TableCell className="font-semibold text-slate-900 dark:text-zinc-50">{row.account_number}</TableCell>
                          <TableCell className="font-medium text-slate-900 dark:text-zinc-50">{row.account_name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className={`border-0 rounded-md font-medium px-2 py-0.5 ${getAccountTypeColor(row.account_type)}`}>
                              {row.account_type || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium text-slate-900 dark:text-zinc-50">{formatMoney(row.debit, false)}</TableCell>
                          <TableCell className="text-right font-medium text-slate-900 dark:text-zinc-50">{formatMoney(row.credit, false)}</TableCell>
                          <TableCell className={`text-right font-bold ${balance < 0 ? "text-red-600" : "text-blue-600"}`}>
                            {formatMoney(balance, true)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {filteredRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="h-24 text-center text-slate-500 dark:text-zinc-400">
                          No accounts found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination Footer */}
              <div className="flex flex-col lg:flex-row items-center justify-center p-4 border-t border-slate-100 dark:border-zinc-800 bg-white dark:bg-zinc-900 gap-8">
                <div className="text-sm text-slate-500 dark:text-zinc-400 text-center">
                  {trialBalance?.rows?.length || 0} total accounts.
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
          )}

        </div>
      )}

      {activeTab === 'consolidated' && (
        <div className="mt-0 outline-none transition-all duration-300 animate-in fade-in-30 slide-in-from-bottom-2">
          <ConsolidatedTrialBalance />
        </div>
      )}
    </div>
  );
}
