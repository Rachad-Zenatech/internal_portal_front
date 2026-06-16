import { useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, AlertCircle, AlertTriangle, ArrowUp, ArrowDown } from "lucide-react";
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
}: Props) {
  const accountMismatch = !preview.account_matches;
  const [dialogOpen, setDialogOpen] = useState(accountMismatch);

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
    <div>
      <Button variant="link" onClick={onCancel} className="mb-4 px-0">
        <ArrowLeft />
        Back to upload
      </Button>

      <div className="mb-4">
        <h2 className="text-xl font-semibold">Review Extracted Data</h2>
        <p className="text-sm text-muted-foreground">
          Confirm and edit the parsed statement below before it's saved to the database. All fields are editable.
        </p>
      </div>

      {accountMismatch ? (
        <Alert variant="destructive" className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
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
        <Alert className="mb-4 border-amber-200 bg-amber-50 text-amber-800">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Review the extracted data below. Nothing is saved until you confirm.
          </AlertDescription>
        </Alert>
      )}

      <Card className="mb-4">
        <CardContent className="space-y-1.5">
          {meta.map(([label, val]) => (
            <div key={label} className="flex gap-2 text-sm">
              <span className="min-w-24 text-muted-foreground">{label}</span>
              <span>{val}</span>
            </div>
          ))}
          <hr className="my-3 border-border" />
          <div className="flex justify-around">
            <Bal label="Beginning" value={localPreview.beginning_balance} />
            <Bal label="+ Additions" value={localPreview.total_additions} className="text-green-600" />
            <Bal label="− Subtractions" value={localPreview.total_subtractions} className="text-destructive" />
            <Bal label="Ending" value={localPreview.ending_balance} bold />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={TABS[0]}>
        <TabsList variant="line" className="flex-wrap">
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

        {TABS.map((t) => {
          const isDeposit = t.includes("deposit");
          const depositRows = localPreview.deposits.filter((d) => d.section === t);
          const checkRows = localPreview.checks.filter((c) => c.section === t);
          const empty = isDeposit ? depositRows.length === 0 : checkRows.length === 0;

          return (
            <TabsContent key={t} value={t} className="mt-4">
              {empty ? (
                <p className="py-4 text-sm text-muted-foreground">No transactions</p>
              ) : isDeposit ? (
                <DepositTable rows={depositRows} onUpdate={updateDeposit} />
              ) : (
                <CheckTable rows={checkRows} onUpdate={updateCheck} />
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {error && (
        <Alert variant="destructive" className="mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="mt-6 flex items-center gap-3">
        {!accountMismatch && (
          <Button onClick={handleConfirm} disabled={isCommitting} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            {isCommitting ? "Saving…" : `Confirm & save (${txCount} transactions)`}
          </Button>
        )}
        <Button variant="outline" onClick={onCancel} disabled={isCommitting}>
          Cancel
        </Button>
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
    <div className="text-center">
      <div className="mb-0.5 text-xs text-muted-foreground">{label}</div>
      <div className={cn(bold ? "font-bold" : "font-medium", className)}>${fmt(value)}</div>
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

function CheckTable({ rows, onUpdate }: { rows: EditableCheck[], onUpdate: (id: string, field: keyof EditableCheck, val: any) => void }) {
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const sorted = useMemo(() => sortByDate(rows, sortDir), [rows, sortDir]);
  const toggle = () => setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  return (
    <Table containerClassName="max-h-[calc(100vh-400px)]">
      <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
        <TableRow>
          {["Date", "Check #", "Type", "Paid To", "Reference", "Amount"].map((h) => (
            <TableHead key={h} className={h === "Amount" ? "text-right" : ""}>
              {h === "Date" ? <DateSortHead dir={sortDir} onToggle={toggle} /> : h}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((r) => (
          <TableRow key={r._id}>
            <TableCell>
              <input type="date" value={toHTMLDate(r.date)} onChange={e => onUpdate(r._id, "date", fromHTMLDate(e.target.value))} className={inputCls} />
            </TableCell>
            <TableCell>
              <input type="text" value={r.check_number ?? ""} onChange={e => onUpdate(r._id, "check_number", e.target.value)} className={inputCls} />
            </TableCell>
            <TableCell>
              <input type="text" value={r.type ?? ""} onChange={e => onUpdate(r._id, "type", e.target.value)} className={inputCls} />
            </TableCell>
            <TableCell className="min-w-[200px] whitespace-normal break-words">
              <textarea rows={3} value={r.paid_to ?? ""} onChange={e => onUpdate(r._id, "paid_to", e.target.value)} className={cn(inputCls, "resize-none overflow-hidden h-auto")} onInput={(e) => { e.currentTarget.style.height = "auto"; e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"; }} />
            </TableCell>
            <TableCell className="min-w-[200px] whitespace-normal break-words">
              <input type="text" value={r.reference ?? ""} onChange={e => onUpdate(r._id, "reference", e.target.value)} className={inputCls} />
            </TableCell>
            <TableCell className={cn("text-right", (r.amount ?? 0) < 0 && "text-destructive")}>
              <input type="number" step="0.01" value={r.amount === null ? "" : r.amount} onChange={e => onUpdate(r._id, "amount", e.target.value === "" ? null : parseFloat(e.target.value))} className={cn(inputCls, "text-right w-24")} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DepositTable({ rows, onUpdate }: { rows: EditableDeposit[], onUpdate: (id: string, field: keyof EditableDeposit, val: any) => void }) {
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const sorted = useMemo(() => sortByDate(rows, sortDir), [rows, sortDir]);
  const toggle = () => setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  return (
    <Table containerClassName="max-h-[calc(100vh-400px)]">
      <TableHeader className="sticky top-0 bg-background z-10 shadow-sm">
        <TableRow>
          {["Date", "Deposit ID", "Received From", "Reference", "Amount"].map((h) => (
            <TableHead key={h} className={h === "Amount" ? "text-right" : ""}>
              {h === "Date" ? <DateSortHead dir={sortDir} onToggle={toggle} /> : h}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {sorted.map((r) => (
          <TableRow key={r._id}>
            <TableCell>
              <input type="date" value={toHTMLDate(r.date)} onChange={e => onUpdate(r._id, "date", fromHTMLDate(e.target.value))} className={inputCls} />
            </TableCell>
            <TableCell>
              <input type="text" value={r.deposit_id ?? ""} onChange={e => onUpdate(r._id, "deposit_id", e.target.value)} className={inputCls} />
            </TableCell>
            <TableCell className="min-w-[200px] whitespace-normal break-words">
              <textarea rows={3} value={r.received_from ?? ""} onChange={e => onUpdate(r._id, "received_from", e.target.value)} className={cn(inputCls, "resize-none overflow-hidden h-auto")} onInput={(e) => { e.currentTarget.style.height = "auto"; e.currentTarget.style.height = e.currentTarget.scrollHeight + "px"; }} />
            </TableCell>
            <TableCell className="min-w-[200px] whitespace-normal break-words">
              <input type="text" value={r.reference ?? ""} onChange={e => onUpdate(r._id, "reference", e.target.value)} className={inputCls} />
            </TableCell>
            <TableCell className={cn("text-right", (r.amount ?? 0) < 0 ? "text-destructive" : "text-green-600")}>
              <input type="number" step="0.01" value={r.amount === null ? "" : r.amount} onChange={e => onUpdate(r._id, "amount", e.target.value === "" ? null : parseFloat(e.target.value))} className={cn(inputCls, "text-right w-24")} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
