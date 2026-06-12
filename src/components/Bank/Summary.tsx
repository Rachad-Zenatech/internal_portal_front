import { useState } from "react";
import type { FormEvent } from "react";
import { useSummary, useCompanies, useBankAccounts } from "@/hooks/useBank";
import type { SummaryPeriod } from "@/types/bank";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Building2, Calendar, CreditCard, BarChart3, Search } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const fmt = (n: number | null | undefined): string =>
  n == null ? "—" : Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 });

const typeLabel = (t: string | undefined): string =>
  t ? t.charAt(0).toUpperCase() + t.slice(1) : "—";

const currentYear = new Date().getFullYear();
const ALL = "all";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const PERIOD_LABELS: Record<SummaryPeriod, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
};

function periodLabel(period: SummaryPeriod, value: number): string {
  if (period === "monthly") return MONTHS[value - 1] ?? String(value);
  if (period === "quarterly") return `Q${value}`;
  return String(value);
}

interface FetchParams {
  period: SummaryPeriod;
  year: number;
  companyId: number | null;
  accountId: number | null;
}

export default function SummaryPage() {
  const [period, setPeriod] = useState<SummaryPeriod>("quarterly");
  const [year, setYear] = useState<number>(currentYear);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [params, setParams] = useState<FetchParams | null>(null);

  const { data: companies = [] } = useCompanies();
  const { data: accounts = [] } = useBankAccounts(companyId);

  const { data: rows = [], isLoading, error } = useSummary(
    params?.period ?? "quarterly",
    params?.year ?? null,
    params?.companyId,
    params?.accountId,
  );

  function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setParams({ period, year, companyId, accountId });
  }

  const activePeriod = params?.period ?? "quarterly";
  const toggleItemStyles = 
    "px-4 text-xs font-bold tracking-wide transition-all duration-200 active:scale-[0.97] data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:hover:bg-primary/90";

  return (
    <div className="p-4 space-y-6 animate-in fade-in duration-200">
      <div>
        <h2 className="text-xl font-bold tracking-tight mb-1">Statement Summary</h2>
        <p className="text-sm text-muted-foreground">
          Configure granularity parameters to aggregate macro ledger records across active fiscal frames.
        </p>
      </div>

      {/* Control Filter Panel Form */}
      <form onSubmit={handleSearch} className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Granularity Period Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5" />
              Reporting Period
            </Label>
            <ToggleGroup
              type="single"
              variant="outline"
              size="sm"
              className="h-10 w-max items-center justify-start gap-1 rounded-xl bg-muted p-1 border shadow-inner"
              value={period}
              onValueChange={(v) => { if (v) setPeriod(v as SummaryPeriod); }}
            >
              {(["monthly", "quarterly", "yearly"] as const).map((p) => (
                <ToggleGroupItem key={p} value={p} className={toggleItemStyles}>
                  {PERIOD_LABELS[p]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* Fiscal Target Year Input */}
          <div className="space-y-2">
            <Label htmlFor="year" className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              Fiscal Year
            </Label>
            <Input
              id="year"
              type="number"
              value={year}
              min={2000}
              max={2099}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-36 h-10 rounded-lg font-semibold border-muted-foreground/20 text-sm focus-visible:ring-primary"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          {/* Reverted Company Dropdown List Section */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5" />
              Company Selection
            </Label>
            <Select
              value={companyId ? String(companyId) : ALL}
              onValueChange={(v) => {
                setCompanyId(v === ALL ? null : Number(v));
                setAccountId(null); // Safely reset downstream account selection states
              }}
            >
              <SelectTrigger className="w-full max-w-xs h-10 rounded-lg border-muted-foreground/20 font-semibold text-sm focus:ring-primary">
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL} className="font-medium text-sm">All Companies</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)} className="font-medium text-sm">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Assigned Financial Institution Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <CreditCard className="h-3.5 w-3.5" />
              Bank Account
            </Label>
            {companyId == null ? (
              <div className="h-10 px-3 flex items-center text-xs font-semibold text-muted-foreground rounded-lg border border-dashed bg-muted/20 w-max">
                Select a company first
              </div>
            ) : (
              <ToggleGroup
                type="single"
                variant="outline"
                size="sm"
                className="w-max max-w-full justify-start gap-1 rounded-xl bg-muted p-1 border shadow-inner flex-wrap h-auto min-h-10"
                value={accountId ? String(accountId) : ALL}
                onValueChange={(v) => { if (v) setAccountId(v === ALL ? null : Number(v)); }}
              >
                <ToggleGroupItem value={ALL} className={toggleItemStyles}>
                  All Accounts
                </ToggleGroupItem>
                {accounts.map((a) => (
                  <ToggleGroupItem key={a.id} value={String(a.id)} className={toggleItemStyles}>
                    <span className="capitalize">{a.bank_name}</span> (****{a.account_number})
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            )}
          </div>
        </div>

        {/* Form Submission Execution Row */}
        <div className="pt-2 flex justify-end">
          <Button type="submit" className="gap-2 px-5 font-bold text-sm shadow-sm transition-transform active:scale-95">
            <Search className="h-4 w-4" />
            Fetch Data
          </Button>
        </div>
      </form>

      {/* Interface Feedback Loading Elements */}
      {isLoading && (
        <div className="space-y-3 animate-pulse">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      )}
      
      {error && (
        <p className="text-sm text-destructive font-medium bg-destructive/10 p-3 rounded-lg border border-destructive/20">
          {(error as Error).message}
        </p>
      )}
      
      {params && !isLoading && rows.length === 0 && (
        <div className="rounded-xl border border-dashed py-12 text-center bg-muted/5">
          <p className="text-sm font-medium text-muted-foreground">No ledger summary records found for fiscal year {params.year}.</p>
        </div>
      )}

      {/* Aggregate Balance Data Visualization Grid */}
      {rows.length > 0 && (
        <div className="border border-muted-foreground/15 rounded-xl bg-card shadow-sm overflow-hidden transition-all duration-300 animate-in fade-in-40 slide-in-from-bottom-3">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  {["Company", "Account", "Bank", "Type", activePeriod === "monthly" ? "Month" : activePeriod === "quarterly" ? "Quarter" : "Year"].map((h) => (
                    <TableHead key={h} className="font-bold text-foreground/80 h-11 text-xs uppercase tracking-wider">
                      {h}
                    </TableHead>
                  ))}
                  {activePeriod === "monthly" && (
                    <TableHead className="text-right font-bold text-foreground/80 h-11 text-xs uppercase tracking-wider">Beginning Balance</TableHead>
                  )}
                  <TableHead className="text-right font-bold text-foreground/80 h-11 text-xs uppercase tracking-wider">In</TableHead>
                  <TableHead className="text-right font-bold text-foreground/80 h-11 text-xs uppercase tracking-wider">Out</TableHead>
                  <TableHead className="text-right font-bold text-foreground/80 h-11 text-xs uppercase tracking-wider">Closing Balance</TableHead>
                  <TableHead className="text-right font-bold text-foreground/80 h-11 text-xs uppercase tracking-wider">Count</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r, i) => (
                  <TableRow key={i} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-bold text-sm text-foreground">{r.company_name}</TableCell>
                    <TableCell className="font-mono font-semibold text-xs text-muted-foreground">
                      <span className="bg-muted px-1.5 py-0.5 rounded text-foreground">****{r.account_number}</span>
                    </TableCell>
                    <TableCell className="font-semibold text-sm text-foreground/80">{r.bank_name}</TableCell>
                    <TableCell className="text-xs">
                      <span className="bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 px-2 py-0.5 rounded font-bold uppercase tracking-wide">
                        {typeLabel(r.statement_type)}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm font-bold text-foreground">
                      <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 px-2 py-0.5 rounded">
                        {periodLabel(activePeriod, r.period)}
                      </span>
                    </TableCell>
                    {activePeriod === "monthly" && (
                      <TableCell className="text-right font-semibold text-sm text-foreground">
                        ${fmt(r.beginning_balance)}
                      </TableCell>
                    )}
                    <TableCell className="text-right font-bold text-sm text-green-600 dark:text-green-400">
                      +${fmt(r.total_in)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-sm text-destructive">
                      −${fmt(r.total_out)}
                    </TableCell>
                    <TableCell className="text-right font-bold text-base text-primary tracking-tight">
                      ${fmt(r.closing_balance)}
                    </TableCell>
                    <TableCell className="text-right text-xs font-bold text-muted-foreground/80">
                      <span className="bg-muted px-2 py-1 rounded-full">{r.statement_count}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}