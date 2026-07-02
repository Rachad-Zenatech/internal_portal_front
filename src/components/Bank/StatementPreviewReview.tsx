import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, CheckCircle2, AlertCircle, AlertTriangle, ArrowUp, ArrowDown, Settings2, Plus, Trash2, FileText } from "lucide-react";
import type {
  StatementPreview,
  PreviewCheckTransaction,
  PreviewDepositTransaction,
} from "@/types/bank";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const fmt = (n: number | null | undefined): string =>
  n == null ? "—" : Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 });

type SortDir = "asc" | "desc";

// Sort rows by their date string; rows with no date always sort to the bottom.
const sortByDate = <T extends { date: string | null }>(rows: T[], dir: SortDir): T[] =>
  [...rows].sort((a, b) => {
    const ta = a.date ? new Date(a.date).getTime() : NaN;
    const tb = b.date ? new Date(b.date).getTime() : NaN;
    if (Number.isNaN(ta) && Number.isNaN(tb)) return 0;
    if (Number.isNaN(ta)) return 1;
    if (Number.isNaN(tb)) return -1;
    return dir === "asc" ? ta - tb : tb - ta;
  });

function DateSortHead({ dir, onToggle }: { dir: SortDir; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-1 hover:text-foreground"
      aria-label={`Sort by date ${dir === "asc" ? "ascending" : "descending"}`}
    >
      Date
      {dir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
    </button>
  );
}

const TABS = [
  "cleared_checks",
  "cleared_deposits",
] as const;
type Tab = (typeof TABS)[number];

type EditableCheck = PreviewCheckTransaction & { _id: string };
type EditableDeposit = PreviewDepositTransaction & { _id: string };
type CheckUpdate = <K extends keyof EditableCheck>(
  id: string,
  field: K,
  value: EditableCheck[K]
) => void;
type DepositUpdate = <K extends keyof EditableDeposit>(
  id: string,
  field: K,
  value: EditableDeposit[K]
) => void;

type EditablePreview = Omit<StatementPreview, "checks" | "deposits"> & {
  checks: EditableCheck[];
  deposits: EditableDeposit[];
};

function withoutCheckId(row: EditableCheck): PreviewCheckTransaction {
  const { _id, ...check } = row;
  void _id;
  return check;
}

function withoutDepositId(row: EditableDeposit): PreviewDepositTransaction {
  const { _id, ...deposit } = row;
  void _id;
  return deposit;
}

interface Props {
  previews: StatementPreview[];
  /** Persist the previewed statement. */
  onConfirm: (previews: StatementPreview[]) => void;
  /** Discard the preview and return to the upload form. */
  onCancel: () => void;
  isCommitting?: boolean;
  error?: string | null;
  pdfUrl?: string;
}

export default function StatementPreviewReview({
  previews,
  onConfirm,
  onCancel,
  isCommitting,
  error,
  pdfUrl,
}: Props) {
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  // Initialize editable local state with UUIDs to avoid input focus loss on sort
  const [localPreviews, setLocalPreviews] = useState<EditablePreview[]>(() => previews.map(p => ({
    ...p,
    checks: p.checks.map(c => ({ ...c, _id: crypto.randomUUID() })),
    deposits: p.deposits.map(d => ({ ...d, _id: crypto.randomUUID() })),
  })));

  const safeActiveIndex = Math.min(activePreviewIndex, Math.max(0, localPreviews.length - 1));
  const preview = previews[Math.min(safeActiveIndex, previews.length - 1)] || previews[0];
  const localPreview = localPreviews[safeActiveIndex];

  useEffect(() => {
    if (activePreviewIndex !== safeActiveIndex) {
      setActivePreviewIndex(safeActiveIndex);
    }
  }, [activePreviewIndex, safeActiveIndex]);

  const accountMismatch = previews.some(p => !p.account_matches);
  const [dialogOpen, setDialogOpen] = useState(accountMismatch);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>(TABS[0]);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set(["Reference"]));

  const handleCancelClick = () => {
    if (!accountMismatch) {
      setCancelConfirmOpen(true);
    } else {
      onCancel();
    }
  };

  const activeColumns = activeTab.includes("deposit")
    ? ["Date", "Deposit ID", "Received From", "Reference", "Amount"]
    : ["Date", "Check #", "Type", "Paid To", "Reference", "Amount"];

  const meta: [string, string][] = [
    ["Company", localPreview.company_name ?? "—"],
    ["Bank", localPreview.bank_name ?? "—"],
    ["Account", localPreview.account_number ? `****${localPreview.account_number}` : "—"],
    ["Type", localPreview.statement_type
      ? localPreview.statement_type.charAt(0).toUpperCase() + localPreview.statement_type.slice(1)
      : "—"],
    ["Date", localPreview.statement_date],
  ];

  function getMonthKey(dateStr: string | null | undefined) {
    if (!dateStr) return "Unknown";
    const parts = dateStr.includes("/") ? dateStr.split("/") : dateStr.split("-");
    if (parts.length === 3) {
      if (dateStr.includes("/")) return `${parts[2]}-${parts[0].padStart(2, '0')}`;
      return `${parts[0]}-${parts[1].padStart(2, '0')}`;
    }
    return "Unknown";
  }

  function rebalancePreviews(prevs: EditablePreview[], transactionId: string, isDeposit: boolean, newDate: string | null | undefined) {
    let currentPIdx = -1;
    let transaction: any = null;
    
    for (let i = 0; i < prevs.length; i++) {
      const arr = isDeposit ? prevs[i].deposits : prevs[i].checks;
      const t = arr.find(x => x._id === transactionId);
      if (t) {
        currentPIdx = i;
        transaction = t;
        break;
      }
    }
    
    if (!transaction || currentPIdx === -1) return prevs;
    
    const txMonthKey = getMonthKey(newDate);
    const previewMonthKey = getMonthKey(prevs[currentPIdx].statement_date);
    
    if (txMonthKey === previewMonthKey || txMonthKey === "Unknown") {
      return prevs;
    }
    
    const nextPrevs = [...prevs];
    nextPrevs[currentPIdx] = { ...nextPrevs[currentPIdx] };
    
    if (isDeposit) {
      nextPrevs[currentPIdx].deposits = nextPrevs[currentPIdx].deposits.filter(x => x._id !== transactionId);
    } else {
      nextPrevs[currentPIdx].checks = nextPrevs[currentPIdx].checks.filter(x => x._id !== transactionId);
    }
    
    let targetPIdx = nextPrevs.findIndex(p => getMonthKey(p.statement_date) === txMonthKey);
    
    if (targetPIdx !== -1) {
      nextPrevs[targetPIdx] = { ...nextPrevs[targetPIdx] };
      if (isDeposit) {
        nextPrevs[targetPIdx].deposits = [...nextPrevs[targetPIdx].deposits, transaction];
      } else {
        nextPrevs[targetPIdx].checks = [...nextPrevs[targetPIdx].checks, transaction];
      }
    } else {
      const parts = newDate!.includes("/") ? newDate!.split("/") : newDate!.split("-");
      const year = newDate!.includes("/") ? Number(parts[2]) : Number(parts[0]);
      const month = newDate!.includes("/") ? Number(parts[0]) : Number(parts[1]);
      const lastDay = new Date(year, month, 0).getDate();
      const statement_date = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      
      const newPreview: EditablePreview = {
        ...nextPrevs[currentPIdx],
        statement_date,
        beginning_balance: 0,
        ending_balance: 0,
        total_additions: 0,
        total_subtractions: 0,
        checks: isDeposit ? [] : [transaction],
        deposits: isDeposit ? [transaction] : [],
      };
      nextPrevs.push(newPreview);
    }
    
    nextPrevs.sort((a, b) => {
       const da = new Date(a.statement_date || 0).getTime();
       const db = new Date(b.statement_date || 0).getTime();
       return da - db;
    });
    
    const filteredPrevs = nextPrevs.filter(p => p.checks.length > 0 || p.deposits.length > 0);
    return filteredPrevs.length > 0 ? filteredPrevs : prevs;
  }

  const updateCheck: CheckUpdate = (id, field, value) => {
    setLocalPreviews(prev => {
      let next = [...prev];
      next[safeActiveIndex] = {
        ...next[safeActiveIndex],
        checks: next[safeActiveIndex].checks.map(c => c._id === id ? { ...c, [field]: value } : c)
      };
      if (field === "date") {
        next = rebalancePreviews(next, id, false, value as string | null);
      }
      return next;
    });
  };

  const updateDeposit: DepositUpdate = (id, field, value) => {
    setLocalPreviews(prev => {
      let next = [...prev];
      next[safeActiveIndex] = {
        ...next[safeActiveIndex],
        deposits: next[safeActiveIndex].deposits.map(d => d._id === id ? { ...d, [field]: value } : d)
      };
      if (field === "date") {
        next = rebalancePreviews(next, id, true, value as string | null);
      }
      return next;
    });
  };

  const handleRemoveCheck = (id: string) => {
    setLocalPreviews(prev => {
      const next = [...prev];
      next[safeActiveIndex] = {
        ...next[safeActiveIndex],
        checks: next[safeActiveIndex].checks.filter(c => c._id !== id)
      };
      const filtered = next.filter(p => p.checks.length > 0 || p.deposits.length > 0);
      return filtered.length > 0 ? filtered : next;
    });
  };

  const handleRemoveDeposit = (id: string) => {
    setLocalPreviews(prev => {
      const next = [...prev];
      next[safeActiveIndex] = {
        ...next[safeActiveIndex],
        deposits: next[safeActiveIndex].deposits.filter(d => d._id !== id)
      };
      const filtered = next.filter(p => p.checks.length > 0 || p.deposits.length > 0);
      return filtered.length > 0 ? filtered : next;
    });
  };

  const handleAddRow = () => {
    if (activeTab.includes("deposit")) {
      setLocalPreviews((prev) => {
        const next = [...prev];
        next[safeActiveIndex] = {
          ...next[safeActiveIndex],
          deposits: [
            ...next[safeActiveIndex].deposits,
            {
              _id: crypto.randomUUID(),
              section: activeTab,
              date: localPreview.statement_date ?? "",
              deposit_id: "",
              received_from: "",
              reference: "",
              amount: 0,
            },
          ],
        };
        return next;
      });
    } else {
      setLocalPreviews((prev) => {
        const next = [...prev];
        next[safeActiveIndex] = {
          ...next[safeActiveIndex],
          checks: [
            ...next[safeActiveIndex].checks,
            {
              _id: crypto.randomUUID(),
              section: activeTab,
              date: localPreview.statement_date ?? "",
              check_number: "",
              type: "Check",
              paid_to: "",
              reference: "",
              amount: 0,
            },
          ],
        };
        return next;
      });
    }

    setTimeout(() => {
      const activeContainer = document.querySelector('[data-state="active"] [data-slot="table-container"]');
      if (activeContainer) {
        activeContainer.scrollTop = activeContainer.scrollHeight;
      }
    }, 50);
  };

  const handleConfirm = () => {
    // Strip the temporary `_id` before saving
    const payload: StatementPreview[] = localPreviews.map(lp => ({
      ...lp,
      checks: lp.checks.map(withoutCheckId),
      deposits: lp.deposits.map(withoutDepositId),
    }));
    onConfirm(payload);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-2 shrink-0">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Review Extracted Data</h2>
          <p className="text-xs text-muted-foreground">
            Confirm and edit the parsed statement before saving. All fields are editable.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {pdfUrl && (
            <Button variant="outline" size="sm" onClick={() => window.open(pdfUrl, '_blank', 'width=800,height=900,resizable=yes')} className="shrink-0 text-blue-600 hover:text-blue-700">
              <FileText className="h-4 w-4 mr-2" />
              Preview PDF
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleCancelClick} className="shrink-0">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to upload
          </Button>
          {!accountMismatch && (
            <Button onClick={handleConfirm} disabled={isCommitting} size="sm" className="gap-2 font-bold shrink-0">
              <CheckCircle2 className="h-4 w-4" />
              {isCommitting ? "Saving…" : `Save (${localPreviews.length} month${localPreviews.length !== 1 ? 's' : ''})`}
            </Button>
          )}
        </div>
      </div>

      {accountMismatch ? (
        <Alert variant="destructive" className="mb-2 shrink-0 py-2">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-xs mt-0.5">
            The account number on this statement
            {preview.account_number ? ` (****${preview.account_number})` : ""} does
            not match the selected bank account
            {preview.expected_account_number
              ? ` (****${preview.expected_account_number})`
              : ""}
            . Go back and choose the correct account before saving.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="mb-2 border-amber-200 bg-amber-50 text-amber-800 shrink-0 py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs mt-0.5">
            Review the extracted data below. Nothing is saved until you confirm.
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-3 shrink-0">
        <CardContent className="p-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {meta.map(([label, val]) => (
              <div key={label} className="flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
                <span className="text-sm font-medium">{val}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-6 md:border-l md:pl-6">
            <Bal label="Beginning" value={localPreview.beginning_balance} />
            <Bal label="+ Additions" value={localPreview.total_additions} className="text-green-600" />
            <Bal label="− Subtractions" value={localPreview.total_subtractions} className="text-destructive" />
            <Bal label="Ending" value={localPreview.ending_balance} bold />
          </div>
        </CardContent>
      </Card>

      {localPreviews.length > 1 && (
        <Tabs value={String(activePreviewIndex)} onValueChange={(v) => setActivePreviewIndex(Number(v))} className="mb-3 shrink-0">
          <TabsList variant="line" className="w-full justify-start overflow-x-auto flex-nowrap border-b border-border">
            {localPreviews.map((lp, idx) => {
              let label = `Statement ${idx + 1}`;
              if (lp.statement_date) {
                const parts = lp.statement_date.split("-");
                if (parts.length === 3) {
                  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                  label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
                } else {
                  label = lp.statement_date;
                }
              }
              return (
                <TabsTrigger key={idx} value={String(idx)} className="capitalize px-4 pb-2 pt-1 font-semibold text-muted-foreground data-[state=active]:text-primary border-b-2 border-transparent hover:text-foreground">
                  {label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      )}

      <div className="flex flex-col flex-1 min-h-0">
        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as Tab)}
            className="flex-1 flex flex-col min-h-0 mb-1"
          >
            <div className="flex items-center justify-between shrink-0 border-b border-slate-100 pb-1 mb-1">
              <TabsList variant="line" className="flex-wrap shrink-0">
                {TABS.map((t) => {
                  const count = t.includes("deposit")
                    ? localPreview.deposits.filter((d) => d.section === t).length
                    : localPreview.checks.filter((c) => c.section === t).length;
                  return (
                    <TabsTrigger key={t} value={t} className="capitalize gap-1.5">
                      {t.replace(/_/g, " ")}
                      <Badge variant="secondary" className="text-xs">{count}</Badge>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleAddRow} className="h-8 border-border">
                  <Plus className="h-4 w-4" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 border-border">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[200px]">
                  <DropdownMenuCheckboxItem
                    checked={activeColumns.every(col => !hiddenColumns.has(col))}
                    onSelect={(e) => e.preventDefault()}
                    onCheckedChange={(checked) => {
                      setHiddenColumns(prev => {
                        const next = new Set(prev);
                        if (checked) {
                          activeColumns.forEach(c => next.delete(c));
                        } else {
                          activeColumns.forEach(c => next.add(c));
                        }
                        return next;
                      });
                    }}
                  >
                    Select All
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  {activeColumns.map(col => (
                    <DropdownMenuCheckboxItem
                      key={col}
                      checked={!hiddenColumns.has(col)}
                      onSelect={(e) => e.preventDefault()}
                      onCheckedChange={(checked) => {
                        setHiddenColumns(prev => {
                          const next = new Set(prev);
                          if (!checked) next.add(col);
                          else next.delete(col);
                          return next;
                        });
                      }}
                    >
                      {col}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {TABS.map((t) => {
              const isDeposit = t.includes("deposit");
              const depositRows = localPreview.deposits.filter((d) => d.section === t);
              const checkRows = localPreview.checks.filter((c) => c.section === t);
              const empty = isDeposit ? depositRows.length === 0 : checkRows.length === 0;

              return (
                <TabsContent key={t} value={t} className="mt-2 flex-1 min-h-0 flex flex-col overflow-hidden">
                  {empty ? (
                    <p className="py-4 text-sm text-muted-foreground">No transactions</p>
                  ) : isDeposit ? (
                    <DepositTable rows={depositRows} onUpdate={updateDeposit} onRemove={handleRemoveDeposit} hiddenColumns={hiddenColumns} />
                  ) : (
                    <CheckTable rows={checkRows} onUpdate={updateCheck} onRemove={handleRemoveCheck} hiddenColumns={hiddenColumns} />
                  )}
                </TabsContent>
              );
            })}
          </Tabs>

          {error && (
            <Alert variant="destructive" className="mt-4 shrink-0">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent className="sm:max-w-[400px] border-border/50 shadow-2xl rounded-2xl p-0 overflow-hidden">
          <div className="p-8 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mb-6 shadow-sm ring-8 ring-red-50 dark:ring-red-500/10">
              <AlertTriangle className="h-8 w-8" />
            </div>
            
            <div className="mb-2 w-full flex flex-col items-center text-center space-y-1.5">
              <AlertDialogTitle className="text-2xl font-bold text-center">Bank account does not match</AlertDialogTitle>
            </div>
            
            <p className="text-muted-foreground text-center text-sm mb-8 px-2">
              The account number on the uploaded statement
              {preview.account_number ? ` (****${preview.account_number})` : ""} does
              not match the bank account you selected
              {preview.expected_account_number
                ? ` (****${preview.expected_account_number})`
                : ""}
              . You can't save this statement — go back and select the correct
              account, or upload the matching statement.
            </p>

            <AlertDialogFooter className="flex w-full gap-3 m-0 p-0 border-none bg-transparent sm:justify-center">
              <AlertDialogAction variant="outline" onClick={() => setDialogOpen(false)} className="flex-1 rounded-xl h-11 font-semibold">
                Review anyway
              </AlertDialogAction>
              <AlertDialogAction onClick={onCancel} className="flex-1 rounded-xl h-11 bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all border-none font-semibold">
                Back to upload
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={cancelConfirmOpen} onOpenChange={setCancelConfirmOpen}>
        <AlertDialogContent className="sm:max-w-[400px] border-border/50 shadow-2xl rounded-2xl p-0 overflow-hidden">
          <div className="p-8 text-center flex flex-col items-center">
            <div className="h-16 w-16 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-500 rounded-full flex items-center justify-center mb-6 shadow-sm ring-8 ring-amber-50 dark:ring-amber-500/10">
              <AlertTriangle className="h-8 w-8" />
            </div>
            
            <div className="mb-2 w-full flex flex-col items-center text-center space-y-1.5">
              <AlertDialogTitle className="text-2xl font-bold text-center">Are you sure you want to leave this page?</AlertDialogTitle>
            </div>
            
            <p className="text-muted-foreground text-center text-sm mb-8 px-2">
              Edited data will be lost.
            </p>

            <AlertDialogFooter className="flex w-full gap-3 m-0 p-0 border-none bg-transparent sm:justify-center">
              <AlertDialogAction variant="outline" onClick={() => setCancelConfirmOpen(false)} className="flex-1 rounded-xl h-11 font-semibold">
                Cancel
              </AlertDialogAction>
              <AlertDialogAction onClick={onCancel} className="flex-1 rounded-xl h-11 bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md hover:shadow-lg transition-all border-none font-semibold">
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface BalProps {
  label: string;
  value: number;
  className?: string;
  bold?: boolean;
}
function Bal({ label, value, className, bold }: BalProps) {
  return (
    <div className="text-center md:text-left">
      <div className="mb-0.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className={cn(bold ? "font-bold text-base" : "font-medium text-sm", className)}>${fmt(value)}</div>
    </div>
  );
}

// Convert MM/DD/YYYY to YYYY-MM-DD
const toHTMLDate = (d: string | null) => {
  if (!d) return "";
  const parts = d.split("/");
  if (parts.length === 3) {
    return `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
  }
  return d;
};
// Convert YYYY-MM-DD to MM/DD/YYYY
const fromHTMLDate = (d: string) => {
  if (!d) return null;
  const parts = d.split("-");
  if (parts.length === 3) {
    return `${parts[1]}/${parts[2]}/${parts[0]}`;
  }
  return d;
};

const inputCls = "w-full bg-transparent border border-transparent hover:border-border focus:border-ring rounded p-1 transition-colors text-sm";

function AmountInput({ value, onChange, className }: { value: number | null, onChange: (val: number | null) => void, className?: string }) {
  const [localValue, setLocalValue] = useState<string>(value === null ? "" : value.toFixed(2));

  useEffect(() => {
    setLocalValue(value === null ? "" : value.toFixed(2));
  }, [value]);

  const handleBlur = () => {
    if (localValue === "" || localValue === "-") {
      setLocalValue("");
      onChange(null);
    } else {
      const parsed = parseFloat(localValue);
      setLocalValue(parsed.toFixed(2));
      onChange(parsed);
    }
  };

  return (
    <input
      type="number"
      step="0.01"
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value);
        if (e.target.value === "" || e.target.value === "-") {
          onChange(null);
        } else {
          const parsed = parseFloat(e.target.value);
          if (!isNaN(parsed)) onChange(parsed);
        }
      }}
      onBlur={handleBlur}
      className={className}
    />
  );
}

function CheckTable({ rows, onUpdate, onRemove, hiddenColumns }: { rows: EditableCheck[], onUpdate: (id: string, field: keyof EditableCheck, val: any) => void, onRemove: (id: string) => void, hiddenColumns: Set<string> }) {
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const sorted = useMemo(() => sortByDate(rows, sortDir), [rows, sortDir]);
  const toggle = () => setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  const cols = ["Date", "Check #", "Type", "Paid To", "Reference", "Amount"].filter(c => !hiddenColumns.has(c));
  return (
    <Table containerClassName="flex-1 overflow-auto custom-scrollbar border rounded-md">
      <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
        <TableRow>
          {cols.map((h) => {
            let widthClass = "";
            if (h === "Date") widthClass = "w-[160px] min-w-[160px]";
            else if (h === "Check #") widthClass = "w-[160px] min-w-[160px]";
            else if (h === "Type") widthClass = "w-[160px] min-w-[160px]";
            else if (h === "Paid To" || h === "Reference") widthClass = "min-w-[250px] w-full";
            else if (h === "Amount") widthClass = "w-[140px] min-w-[140px] text-right";
            return (
              <TableHead key={h} className={widthClass}>
                {h === "Date" ? <DateSortHead dir={sortDir} onToggle={toggle} /> : h}
              </TableHead>
            );
          })}
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((r) => (
          <TableRow key={r._id}>
            {cols.includes("Date") && (
              <TableCell>
                <input type="date" value={toHTMLDate(r.date)} onChange={e => onUpdate(r._id, "date", fromHTMLDate(e.target.value))} className={inputCls} />
              </TableCell>
            )}
            {cols.includes("Check #") && (
              <TableCell>
                <input type="text" value={r.check_number ?? ""} onChange={e => onUpdate(r._id, "check_number", e.target.value)} className={inputCls} />
              </TableCell>
            )}
            {cols.includes("Type") && (
              <TableCell>
                <input type="text" value={r.type ?? ""} onChange={e => onUpdate(r._id, "type", e.target.value)} className={inputCls} />
              </TableCell>
            )}
            {cols.includes("Paid To") && (
              <TableCell className="min-w-[200px] whitespace-normal break-words">
                <textarea rows={1} value={r.paid_to ?? ""} onChange={e => onUpdate(r._id, "paid_to", e.target.value)} className={cn(inputCls, "resize-none overflow-hidden h-auto")} onInput={(e) => { e.currentTarget.style.height = "auto"; e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"; }} />
              </TableCell>
            )}
            {cols.includes("Reference") && (
              <TableCell className="min-w-[200px] whitespace-normal break-words">
                <input type="text" value={r.reference ?? ""} onChange={e => onUpdate(r._id, "reference", e.target.value)} className={inputCls} />
              </TableCell>
            )}
            {cols.includes("Amount") && (
              <TableCell className={cn("text-right", (r.amount ?? 0) < 0 && "text-destructive")}>
                <div className="flex items-center justify-end">
                  <span className="text-muted-foreground mr-1">$</span>
                  <AmountInput value={r.amount} onChange={val => onUpdate(r._id, "amount", val)} className={cn(inputCls, "text-right w-24")} />
                </div>
              </TableCell>
            )}
            <TableCell className="text-right pr-4">
              <Button variant="ghost" size="icon" onClick={() => onRemove(r._id)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DepositTable({ rows, onUpdate, onRemove, hiddenColumns }: { rows: EditableDeposit[], onUpdate: (id: string, field: keyof EditableDeposit, val: any) => void, onRemove: (id: string) => void, hiddenColumns: Set<string> }) {
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const sorted = useMemo(() => sortByDate(rows, sortDir), [rows, sortDir]);
  const toggle = () => setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  const cols = ["Date", "Deposit ID", "Received From", "Reference", "Amount"].filter(c => !hiddenColumns.has(c));
  return (
    <Table containerClassName="flex-1 overflow-auto custom-scrollbar border rounded-md">
      <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
        <TableRow>
          {cols.map((h) => {
            let widthClass = "";
            if (h === "Date") widthClass = "w-[160px] min-w-[160px]";
            else if (h === "Deposit ID") widthClass = "w-[160px] min-w-[160px]";
            else if (h === "Received From" || h === "Reference") widthClass = "min-w-[250px] w-full";
            else if (h === "Amount") widthClass = "w-[140px] min-w-[140px] text-right";
            return (
              <TableHead key={h} className={widthClass}>
                {h === "Date" ? <DateSortHead dir={sortDir} onToggle={toggle} /> : h}
              </TableHead>
            );
          })}
          <TableHead className="w-[50px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((r) => (
          <TableRow key={r._id}>
            {cols.includes("Date") && (
              <TableCell>
                <input type="date" value={toHTMLDate(r.date)} onChange={e => onUpdate(r._id, "date", fromHTMLDate(e.target.value))} className={inputCls} />
              </TableCell>
            )}
            {cols.includes("Deposit ID") && (
              <TableCell>
                <input type="text" value={r.deposit_id ?? ""} onChange={e => onUpdate(r._id, "deposit_id", e.target.value)} className={inputCls} />
              </TableCell>
            )}
            {cols.includes("Received From") && (
              <TableCell className="min-w-[200px] whitespace-normal break-words">
                <textarea rows={1} value={r.received_from ?? ""} onChange={e => onUpdate(r._id, "received_from", e.target.value)} className={cn(inputCls, "resize-none overflow-hidden h-auto")} onInput={(e) => { e.currentTarget.style.height = "auto"; e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"; }} />
              </TableCell>
            )}
            {cols.includes("Reference") && (
              <TableCell className="min-w-[200px] whitespace-normal break-words">
                <input type="text" value={r.reference ?? ""} onChange={e => onUpdate(r._id, "reference", e.target.value)} className={inputCls} />
              </TableCell>
            )}
            {cols.includes("Amount") && (
              <TableCell className={cn("text-right", (r.amount ?? 0) < 0 ? "text-destructive" : "text-green-600")}>
                <div className="flex items-center justify-end">
                  <span className="text-muted-foreground mr-1">$</span>
                  <AmountInput value={r.amount} onChange={val => onUpdate(r._id, "amount", val)} className={cn(inputCls, "text-right w-24")} />
                </div>
              </TableCell>
            )}
            <TableCell className="text-right pr-4">
              <Button variant="ghost" size="icon" onClick={() => onRemove(r._id)} className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
