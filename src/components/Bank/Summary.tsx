import { useState } from "react";
import type { FormEvent } from "react";
import { useSummary, useCompanies, useBankAccounts } from "@/hooks/useBank";
import type { SummaryPeriod } from "@/types/bank";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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

// Render the per-row period index as a readable label for the chosen granularity.
function periodLabel(period: SummaryPeriod, value: number): string {
  if (period === "monthly") return MONTHS[value - 1] ?? String(value);
  if (period === "quarterly") return `Q${value}`;
  return String(value); // yearly → the year itself
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
  // Accounts are scoped to the chosen company; an account can only be selected
  // once a company is picked.
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

  return (
    <div className="p-4">
      <h2 className="mb-4 text-lg font-semibold">Statement summary</h2>

      <form onSubmit={handleSearch} className="mb-6 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Period</Label>
          <Select
            value={period}
            onValueChange={(v) => setPeriod(v as SummaryPeriod)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(["monthly", "quarterly", "yearly"] as const).map((p) => (
                <SelectItem key={p} value={p}>
                  {PERIOD_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="year">Year</Label>
          <Input
            id="year"
            type="number"
            value={year}
            min={2000}
            max={2099}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-36"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>
            Company{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Select
            value={companyId ? String(companyId) : ALL}
            onValueChange={(v) => {
              setCompanyId(v === ALL ? null : Number(v));
              // Account belongs to the previously selected company — reset it.
              setAccountId(null);
            }}
          >
            <SelectTrigger className="w-56">
              <SelectValue placeholder="All companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>
            Bank account{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Select
            value={accountId ? String(accountId) : ALL}
            onValueChange={(v) => setAccountId(v === ALL ? null : Number(v))}
            disabled={companyId == null}
          >
            <SelectTrigger className="w-56">
              <SelectValue
                placeholder={companyId == null ? "Select a company first" : "All accounts"}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All accounts</SelectItem>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.bank_name} · ****{a.account_number}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button type="submit">Fetch</Button>
      </form>

      {isLoading && <Skeleton className="h-40 w-full rounded-xl" />}
      {error && (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      )}
      {params && !isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No data for {params.year}</p>
      )}

      {rows.length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>
                {activePeriod === "monthly"
                  ? "Month"
                  : activePeriod === "quarterly"
                    ? "Quarter"
                    : "Year"}
              </TableHead>
              {activePeriod === "monthly" && (
                <TableHead className="text-right">Beginning balance</TableHead>
              )}
              <TableHead className="text-right">In</TableHead>
              <TableHead className="text-right">Out</TableHead>
              <TableHead className="text-right">Closing balance</TableHead>
              <TableHead className="text-right">Statements</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r, i) => (
              <TableRow key={i}>
                <TableCell>{r.company_name}</TableCell>
                <TableCell>****{r.account_number}</TableCell>
                <TableCell>{r.bank_name}</TableCell>
                <TableCell className="capitalize">{r.statement_type}</TableCell>
                <TableCell>{periodLabel(activePeriod, r.period)}</TableCell>
                {activePeriod === "monthly" && (
                  <TableCell className="text-right">
                    ${fmt(r.beginning_balance)}
                  </TableCell>
                )}
                <TableCell className="text-right text-green-600">
                  ${fmt(r.total_in)}
                </TableCell>
                <TableCell className="text-right text-destructive">
                  ${fmt(r.total_out)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  ${fmt(r.closing_balance)}
                </TableCell>
                <TableCell className="text-right text-muted-foreground">
                  {r.statement_count}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
