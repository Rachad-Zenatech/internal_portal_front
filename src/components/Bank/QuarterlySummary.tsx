import { useState } from "react";
import type { FormEvent } from "react";
import { useQuarterlySummary } from "@/hooks/useBank";
import type { QuarterlySummary } from "@/types/bank";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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

interface Grouped {
  company_name: string;
  account_number: string;
  bank_name: string;
  quarters: Partial<Record<number, QuarterlySummary>>;
}

export default function QuarterlySummaryPage() {
  const [year, setYear] = useState<number>(currentYear);
  const [accountId, setAccountId] = useState<number | null>(null);
  const [fetchYear, setFetchYear] = useState<number | null>(null);

  const { data: rows = [], isLoading, error } = useQuarterlySummary(
    fetchYear,
    accountId
  );

  function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFetchYear(year);
  }

  const grouped: Record<string, Grouped> = {};
  rows.forEach((r) => {
    const key = `${r.company_name}|${r.account_number}|${r.bank_name}`;
    if (!grouped[key])
      grouped[key] = {
        company_name: r.company_name,
        account_number: r.account_number,
        bank_name: r.bank_name,
        quarters: {},
      };
    grouped[key].quarters[r.statement_quarter] = r;
  });

  return (
    <div className="p-4">
      <h2 className="mb-4 text-lg font-semibold">Quarterly reconciliation</h2>

      <form onSubmit={handleSearch} className="mb-6 flex flex-wrap items-end gap-4">
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
          <Label htmlFor="accountId">
            Account ID{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="accountId"
            type="number"
            value={accountId ?? ""}
            onChange={(e) =>
              setAccountId(e.target.value ? Number(e.target.value) : null)
            }
            placeholder="all accounts"
            className="w-36"
          />
        </div>
        <Button type="submit">Fetch</Button>
      </form>

      {isLoading && <Skeleton className="h-40 w-full rounded-xl" />}
      {error && (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      )}
      {fetchYear && !isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">No data for {fetchYear}</p>
      )}

      {Object.values(grouped).length > 0 && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Company</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Bank</TableHead>
              {([1, 2, 3, 4] as const).map((q) => (
                <TableHead key={q} colSpan={3} className="text-center">
                  Q{q}
                </TableHead>
              ))}
            </TableRow>
            <TableRow>
              <TableHead colSpan={3} />
              {([1, 2, 3, 4] as const).flatMap((q) =>
                (["In", "Out", "Balance"] as const).map((l) => (
                  <TableHead
                    key={`${q}${l}`}
                    className="text-right text-xs font-normal text-muted-foreground"
                  >
                    {l}
                  </TableHead>
                ))
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Object.values(grouped).map((g, i) => (
              <TableRow key={i}>
                <TableCell>{g.company_name}</TableCell>
                <TableCell>****{g.account_number}</TableCell>
                <TableCell>{g.bank_name}</TableCell>
                {([1, 2, 3, 4] as const).flatMap((q) => {
                  const c = g.quarters[q];
                  return [
                    <TableCell key={`${q}i`} className="text-right text-green-600">
                      {c ? "$" + fmt(c.total_in) : "—"}
                    </TableCell>,
                    <TableCell key={`${q}o`} className="text-right text-destructive">
                      {c ? "$" + fmt(c.total_out) : "—"}
                    </TableCell>,
                    <TableCell key={`${q}b`} className="text-right font-semibold">
                      {c ? "$" + fmt(c.closing_balance) : "—"}
                    </TableCell>,
                  ];
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
