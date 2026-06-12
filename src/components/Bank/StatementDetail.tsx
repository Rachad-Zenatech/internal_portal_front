import { ArrowLeft } from "lucide-react";
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
      <div className="space-y-3 p-4">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  if (stmtError)
    return (
      <p className="p-4 text-sm text-destructive">
        {(stmtError as Error).message}
      </p>
    );
  if (!statement) return null;

  const meta: [string, string][] = [
    ["Company", statement.company_name],
    ["Bank", statement.bank_name],
    ["Account", `****${statement.account_number}`],
    ["Type", statement.statement_type
      ? statement.statement_type.charAt(0).toUpperCase() + statement.statement_type.slice(1)
      : "—"],
    [
      "Date",
      `${statement.statement_date}  —  Q${statement.statement_quarter} ${statement.statement_year}`,
    ],
  ];

  return (
    <div className="p-4">
      <Button variant="link" onClick={onBack} className="mb-4 px-0">
        <ArrowLeft />
        Back
      </Button>

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
            <Bal label="Beginning" value={statement.beginning_balance} />
            <Bal
              label="+ Additions"
              value={statement.total_additions}
              className="text-green-600"
            />
            <Bal
              label="− Subtractions"
              value={statement.total_subtractions}
              className="text-destructive"
            />
            <Bal label="Ending" value={statement.ending_balance} bold />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue={TABS[0]}>
        <TabsList variant="line" className="flex-wrap">
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t} className="capitalize">
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
            <TabsContent key={t} value={t} className="mt-4">
              {empty ? (
                <p className="py-4 text-sm text-muted-foreground">
                  No transactions
                </p>
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
}
function Bal({ label, value, className, bold }: BalProps) {
  return (
    <div className="text-center">
      <div className="mb-0.5 text-xs text-muted-foreground">{label}</div>
      <div className={cn(bold ? "font-bold" : "font-medium", className)}>
        ${fmt(value)}
      </div>
    </div>
  );
}

function CheckTable({ rows }: { rows: CheckTransaction[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {["Date", "Check #", "Type", "Paid To", "Reference", "Amount"].map(
            (h) => (
              <TableHead key={h} className={h === "Amount" ? "text-right" : ""}>
                {h}
              </TableHead>
            )
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.date}</TableCell>
            <TableCell>{r.check_number}</TableCell>
            <TableCell>{r.type}</TableCell>
            <TableCell>{r.paid_to}</TableCell>
            <TableCell>{r.reference}</TableCell>
            <TableCell
              className={cn(
                "text-right",
                (r.amount ?? 0) < 0 && "text-destructive"
              )}
            >
              ${fmt(r.amount)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DepositTable({ rows }: { rows: DepositTransaction[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {["Date", "Deposit ID", "Received From", "Reference", "Amount"].map(
            (h) => (
              <TableHead key={h} className={h === "Amount" ? "text-right" : ""}>
                {h}
              </TableHead>
            )
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell>{r.date}</TableCell>
            <TableCell>{r.deposit_id}</TableCell>
            <TableCell>{r.received_from}</TableCell>
            <TableCell>{r.reference}</TableCell>
            <TableCell
              className={cn(
                "text-right",
                (r.amount ?? 0) < 0 ? "text-destructive" : "text-green-600"
              )}
            >
              ${fmt(r.amount)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
