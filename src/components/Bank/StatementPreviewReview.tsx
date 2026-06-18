import { useMemo, useState, useEffect } from "react";
import { ArrowLeft, CheckCircle2, AlertCircle, AlertTriangle, ArrowUp, ArrowDown, Settings2, Plus } from "lucide-react";
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
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
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
  "outstanding_checks",
  "cleared_deposits",
  "outstanding_deposits",
] as const;
type Tab = (typeof TABS)[number];

type EditableCheck = PreviewCheckTransaction & { _id: string };
type EditableDeposit = PreviewDepositTransaction & { _id: string };

type EditablePreview = Omit<StatementPreview, "checks" | "deposits"> & {
  checks: EditableCheck[];
  deposits: EditableDeposit[];
};

interface Props {
  preview: StatementPreview;
  /** Persist the previewed statement. */
  onConfirm: (preview: StatementPreview) => void;
  /** Discard the preview and return to the upload form. */
  onCancel: () => void;
  isCommitting?: boolean;
  error?: string | null;
}

export default function StatementPreviewReview({
  preview,
  onConfirm,
  onCancel,
  isCommitting,
  error,
  children,
}: Props & { children?: React.ReactNode }) {
  const accountMismatch = !preview.account_matches;
  const [dialogOpen, setDialogOpen] = useState(accountMismatch);
  const [activeTab, setActiveTab] = useState<Tab>(TABS[0]);
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set(["Reference"]));

  const activeColumns = activeTab.includes("deposit")
    ? ["Date", "Deposit ID", "Received From", "Reference", "Amount"]
    : ["Date", "Check #", "Type", "Paid To", "Reference", "Amount"];

  // Initialize editable local state with UUIDs to avoid input focus loss on sort
  const [localPreview, setLocalPreview] = useState<EditablePreview>(() => ({
    ...preview,
    checks: preview.checks.map(c => ({ ...c, _id: crypto.randomUUID() })),
    deposits: preview.deposits.map(d => ({ ...d, _id: crypto.randomUUID() })),
  }));

  const meta: [string, string][] = [
    ["Company", localPreview.company_name ?? "—"],
    ["Bank", localPreview.bank_name ?? "—"],
    ["Account", localPreview.account_number ? `****${localPreview.account_number}` : "—"],
    ["Type", localPreview.statement_type
      ? localPreview.statement_type.charAt(0).toUpperCase() + localPreview.statement_type.slice(1)
      : "—"],
    ["Date", localPreview.statement_date],
  ];

  const txCount = localPreview.checks.length + localPreview.deposits.length;

  const updateCheck = (id: string, field: keyof EditableCheck, value: any) => {
    setLocalPreview(prev => ({
      ...prev,
      checks: prev.checks.map(c => c._id === id ? { ...c, [field]: value } : c)
    }));
  };

  const updateDeposit = (id: string, field: keyof EditableDeposit, value: any) => {
    setLocalPreview(prev => ({
      ...prev,
      deposits: prev.deposits.map(d => d._id === id ? { ...d, [field]: value } : d)
    }));
  };

  const handleAddRow = () => {
    if (activeTab.includes("deposit")) {
      setLocalPreview((prev) => ({
        ...prev,
        deposits: [
          ...prev.deposits,
          {
            _id: crypto.randomUUID(),
            section: activeTab,
            date: "",
            deposit_id: "",
            received_from: "",
            reference: "",
            amount: 0,
          },
        ],
      }));
    } else {
      setLocalPreview((prev) => ({
        ...prev,
        checks: [
          ...prev.checks,
          {
            _id: crypto.randomUUID(),
            section: activeTab,
            date: "",
            check_number: "",
            type: "Check",
            paid_to: "",
            reference: "",
            amount: 0,
          },
        ],
      }));
    }
  };

  const handleConfirm = () => {
    // Strip the temporary `_id` before saving
    const payload: StatementPreview = {
      ...localPreview,
      checks: localPreview.checks.map(({ _id, ...c }) => c),
      deposits: localPreview.deposits.map(({ _id, ...d }) => d),
    };
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
        <Button variant="outline" size="sm" onClick={onCancel} className="shrink-0">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to upload
        </Button>
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

      <div className="grid lg:grid-cols-10 gap-8 flex-1 min-h-0">
        <div className="lg:col-span-6 flex flex-col min-h-0 overflow-hidden pr-2">
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
                <Button variant="outline" size="sm" onClick={handleAddRow} className="h-8 border-slate-200">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Row
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 border-slate-200">
                      <Settings2 className="mr-2 h-4 w-4" />
                      Columns
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
                    <DepositTable rows={depositRows} onUpdate={updateDeposit} hiddenColumns={hiddenColumns} />
                  ) : (
                    <CheckTable rows={checkRows} onUpdate={updateCheck} hiddenColumns={hiddenColumns} />
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

        <div className="lg:col-span-4 flex flex-col min-h-0">
          {children}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-end gap-3 pt-4 border-t border-slate-200 shrink-0">
        <Button variant="outline" onClick={onCancel} disabled={isCommitting} className="h-10 px-6 font-semibold">
          Cancel
        </Button>
        {!accountMismatch && (
          <Button onClick={handleConfirm} disabled={isCommitting} className="gap-2 h-10 px-8 font-bold">
            <CheckCircle2 className="h-4 w-4" />
            {isCommitting ? "Saving…" : `Save (${txCount})`}
          </Button>
        )}
      </div>

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10 text-destructive">
              <AlertTriangle />
            </AlertDialogMedia>
            <AlertDialogTitle>Bank account does not match</AlertDialogTitle>
            <AlertDialogDescription>
              The account number on the uploaded statement
              {preview.account_number ? ` (****${preview.account_number})` : ""} does
              not match the bank account you selected
              {preview.expected_account_number
                ? ` (****${preview.expected_account_number})`
                : ""}
              . You can't save this statement — go back and select the correct
              account, or upload the matching statement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction variant="outline" onClick={() => setDialogOpen(false)}>
              Review anyway
            </AlertDialogAction>
            <AlertDialogAction onClick={onCancel}>Back to upload</AlertDialogAction>
          </AlertDialogFooter>
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
    if (value === null) {
      if (localValue !== "" && localValue !== "-") {
        setLocalValue("");
      }
    } else {
      const parsedLocal = parseFloat(localValue);
      if (isNaN(parsedLocal) || parsedLocal !== value) {
        setLocalValue(value.toFixed(2));
      }
    }
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

function CheckTable({ rows, onUpdate, hiddenColumns }: { rows: EditableCheck[], onUpdate: (id: string, field: keyof EditableCheck, val: any) => void, hiddenColumns: Set<string> }) {
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
                <textarea rows={3} value={r.paid_to ?? ""} onChange={e => onUpdate(r._id, "paid_to", e.target.value)} className={cn(inputCls, "resize-none overflow-hidden h-auto")} onInput={(e) => { e.currentTarget.style.height = "auto"; e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"; }} />
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
                  <span className="text-slate-500 mr-1">$</span>
                  <AmountInput value={r.amount} onChange={val => onUpdate(r._id, "amount", val)} className={cn(inputCls, "text-right w-24")} />
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DepositTable({ rows, onUpdate, hiddenColumns }: { rows: EditableDeposit[], onUpdate: (id: string, field: keyof EditableDeposit, val: any) => void, hiddenColumns: Set<string> }) {
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
                <textarea rows={3} value={r.received_from ?? ""} onChange={e => onUpdate(r._id, "received_from", e.target.value)} className={cn(inputCls, "resize-none overflow-hidden h-auto")} onInput={(e) => { e.currentTarget.style.height = "auto"; e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"; }} />
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
                  <span className="text-slate-500 mr-1">$</span>
                  <AmountInput value={r.amount} onChange={val => onUpdate(r._id, "amount", val)} className={cn(inputCls, "text-right w-24")} />
                </div>
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
