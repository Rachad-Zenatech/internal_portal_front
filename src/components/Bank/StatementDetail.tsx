import { useMemo, useState } from "react";
import { ArrowLeft, Calendar, CreditCard, Layers, ArrowUpRight, ArrowDownLeft, Scale, ArrowUp, ArrowDown } from "lucide-react";
import { useStatement, useChecks, useDeposits } from "@/hooks/useBank";
import type { CheckTransaction, DepositTransaction } from "@/types/bank";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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

const typeLabel = (t: string | undefined): string =>
  t ? t.charAt(0).toUpperCase() + t.slice(1) : "—";

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
      className="inline-flex items-center gap-1 uppercase tracking-wider hover:text-foreground"
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

interface Props {
  statementId: number;
  onBack: () => void;
}

export default function StatementDetail({ statementId, onBack }: Props) {
  const { data: statement, isLoading: stmtLoading, error: stmtError } =
    useStatement(statementId);
  const { data: checks = [], isLoading: chkLoading } = useChecks(statementId);
  const { data: deposits = [], isLoading: depLoading } = useDeposits(statementId);

  if (stmtLoading || chkLoading || depLoading)
    return (
      <div className="space-y-4 p-4 animate-pulse">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-12 w-96 rounded-xl" />
      </div>
    );
    
  if (stmtError)
    return (
      <p className="p-4 text-sm text-destructive font-medium">
        {(stmtError as Error).message}
      </p>
    );
    
  if (!statement) return null;

  return (
    <div className="p-4 space-y-6 animate-in fade-in duration-200">
      {/* Back Button with Motion Feedback */}
      <div>
        <Button 
          variant="ghost" 
          onClick={onBack} 
          className="gap-2 text-muted-foreground hover:text-foreground transition-all active:scale-95 px-3 -ml-3"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-semibold text-sm">Back to Statements</span>
        </Button>
      </div>

      {/* Main Statement Meta Context Header Dashboard */}
      <Card className="border-muted-foreground/15 shadow-sm bg-card overflow-hidden">
        <CardContent className="p-6 space-y-6">
          
          {/* Top Row Title Stack */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
            <div>
              <span className="text-xs font-bold tracking-wider uppercase text-muted-foreground block mb-0.5">
                Statement Ledger View
              </span>
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                {statement.company_name}
              </h2>
            </div>
            
            {/* Quick Context Tags */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1.5 rounded bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary uppercase tracking-wide">
                Q{statement.statement_quarter} {statement.statement_year}
              </span>
              <span className="text-xs bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
                {typeLabel(statement.statement_type)}
              </span>
            </div>
          </div>

          {/* 4-Column Context Metadata Row Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm pt-1">
            <div className="flex items-center gap-3 bg-muted/40 px-3 py-2 rounded-lg border">
              <Layers className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-[11px] text-muted-foreground font-medium">Bank Inst.</div>
                <div className="font-semibold text-foreground/90">{statement.bank_name}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-muted/40 px-3 py-2 rounded-lg border">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-[11px] text-muted-foreground font-medium">Account Number</div>
                <div className="font-mono font-bold text-foreground text-[13px]">****{statement.account_number}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-muted/40 px-3 py-2 rounded-lg border sm:col-span-2 md:col-span-1">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="text-[11px] text-muted-foreground font-medium">Statement Date</div>
                <div className="font-semibold text-amber-800 dark:text-amber-400">{statement.statement_date}</div>
              </div>
            </div>
          </div>

          {/* Financial Ledger Balance Block Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl border border-dashed bg-muted/10 mt-2">
            <Bal label="Beginning Balance" value={statement.beginning_balance} icon={<Scale className="h-3.5 w-3.5" />} />
            <Bal
              label="Total Additions"
              value={statement.total_additions}
              className="text-green-600 dark:text-green-400"
              icon={<ArrowUpRight className="h-3.5 w-3.5 text-green-600" />}
            />
            <Bal
              label="Total Subtractions"
              value={statement.total_subtractions}
              className="text-destructive"
              icon={<ArrowDownLeft className="h-3.5 w-3.5 text-destructive" />}
            />
            <Bal label="Ending Balance" value={statement.ending_balance} bold />
          </div>
        </CardContent>
      </Card>

      {/* Transaction Records Navigation & Content */}
      <Tabs defaultValue={TABS[0]} className="w-full">
        <TabsList className="h-12 w-max items-center justify-start gap-1 rounded-xl bg-muted p-1 border shadow-inner mb-4">
          {TABS.map((t) => (
            <TabsTrigger 
              key={t} 
              value={t} 
              className="h-full px-4 text-xs font-bold tracking-wide capitalize transition-all duration-200 active:scale-[0.97] data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-muted-foreground/10"
            >
              {t.replace(/_/g, " ")}
            </TabsTrigger>
          ))}
        </TabsList>

        {TABS.map((t) => {
          const isDeposit = t.includes("deposit");
          const depositRows = deposits.filter((d) => d.section === t);
          const checkRows = checks.filter((c) => c.section === t);
          const empty = isDeposit ? depositRows.length === 0 : checkRows.length === 0;

          return (
            <TabsContent 
              key={t} 
              value={t} 
              className="mt-2 outline-none transition-all duration-300 animate-in fade-in-40 slide-in-from-bottom-3 border rounded-xl bg-card shadow-sm overflow-hidden"
            >
              {empty ? (
                <div className="py-12 text-center">
                  <p className="text-sm font-medium text-muted-foreground">
                    No transactions available in this ledger segment.
                  </p>
                </div>
              ) : isDeposit ? (
                <DepositTable rows={depositRows} />
              ) : (
                <CheckTable rows={checkRows} />
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}

interface BalProps {
  label: string;
  value: number;
  className?: string;
  bold?: boolean;
  icon?: React.ReactNode;
}

function Bal({ label, value, className, bold, icon }: BalProps) {
  return (
    <div className={cn("p-2 rounded-lg flex flex-col justify-between", bold && "bg-primary/5 border border-primary/20")}>
      <div className="mb-1 text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className={cn("tracking-tight font-semibold", bold ? "text-xl text-primary font-bold" : "text-base text-foreground", className)}>
        ${fmt(value)}
      </div>
    </div>
  );
}

function CheckTable({ rows }: { rows: CheckTransaction[] }) {
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const sorted = useMemo(() => sortByDate(rows, sortDir), [rows, sortDir]);
  const toggle = () => setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            {["Date", "Check #", "Type", "Paid To", "Reference", "Amount"].map(
              (h) => (
                <TableHead key={h} className={cn("font-bold text-foreground/80 h-11 text-xs uppercase tracking-wider", h === "Amount" ? "text-right" : "")}>
                  {h === "Date" ? <DateSortHead dir={sortDir} onToggle={toggle} /> : h}
                </TableHead>
              )
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r) => (
            <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
              <TableCell className="font-medium text-sm">{r.date}</TableCell>
              <TableCell className="font-mono font-semibold text-sm text-foreground/80">{r.check_number || "—"}</TableCell>
              <TableCell className="text-xs font-medium"><span className="bg-muted px-2 py-0.5 rounded">{r.type || "—"}</span></TableCell>
              <TableCell className="text-sm font-medium max-w-xs truncate">{r.paid_to || "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-sm truncate">{r.reference || "—"}</TableCell>
              <TableCell className={cn("text-right font-bold text-sm tracking-tight", (r.amount ?? 0) < 0 ? "text-destructive" : "text-foreground")}>
                ${fmt(r.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DepositTable({ rows }: { rows: DepositTransaction[] }) {
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const sorted = useMemo(() => sortByDate(rows, sortDir), [rows, sortDir]);
  const toggle = () => setSortDir((d) => (d === "asc" ? "desc" : "asc"));
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            {["Date", "Deposit ID", "Received From", "Reference", "Amount"].map(
              (h) => (
                <TableHead key={h} className={cn("font-bold text-foreground/80 h-11 text-xs uppercase tracking-wider", h === "Amount" ? "text-right" : "")}>
                  {h === "Date" ? <DateSortHead dir={sortDir} onToggle={toggle} /> : h}
                </TableHead>
              )
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sorted.map((r) => (
            <TableRow key={r.id} className="hover:bg-muted/30 transition-colors">
              <TableCell className="font-medium text-sm">{r.date}</TableCell>
              <TableCell className="font-mono font-semibold text-sm text-foreground/80">{r.deposit_id || "—"}</TableCell>
              <TableCell className="text-sm font-medium max-w-xs truncate">{r.received_from || "—"}</TableCell>
              <TableCell className="text-xs text-muted-foreground max-w-sm truncate">{r.reference || "—"}</TableCell>
              <TableCell className={cn("text-right font-bold text-sm tracking-tight", (r.amount ?? 0) < 0 ? "text-destructive" : "text-green-600 dark:text-green-400")}>
                ${fmt(r.amount)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}