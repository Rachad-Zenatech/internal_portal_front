import { useState } from "react";
import { X } from "lucide-react";
import { useStatements, useDeleteStatement, useBankAccounts } from "@/hooks/useBank";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const ALL = "all";

const fmt = (n: number): string =>
  Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 });

// Capitalize the statement type for display (e.g. "savings" -> "Savings").
const typeLabel = (t: string): string =>
  t ? t.charAt(0).toUpperCase() + t.slice(1) : "—";

interface Props {
  onSelect: (id: number) => void;
}

export default function StatementList({ onSelect }: Props) {
  const [accountId, setAccountId] = useState<number | null>(null);

  const { data: accounts = [] } = useBankAccounts();
  const { data: statements = [], isLoading, error } = useStatements(accountId);
  const deleteStatement = useDeleteStatement();

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Statements</h2>
        <Select
          value={accountId ? String(accountId) : ALL}
          onValueChange={(v) => setAccountId(v === ALL ? null : Number(v))}
        >
          <SelectTrigger className="w-auto min-w-56">
            <SelectValue placeholder="All accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All accounts</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={String(a.id)}>
                {a.company_name} · ****{a.account_number}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading && (
        <div className="flex flex-col gap-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      )}
      {error && (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      )}
      {!isLoading && statements.length === 0 && (
        <p className="text-sm text-muted-foreground">No statements found</p>
      )}

      <div className="flex flex-col gap-2.5">
        {statements.map((stmt) => (
          <Card
            key={stmt.id}
            size="sm"
            role="button"
            tabIndex={0}
            onClick={() => onSelect(stmt.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(stmt.id);
              }
            }}
            className="cursor-pointer transition-colors hover:bg-muted/40"
          >
            <CardContent>
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-semibold">{stmt.company_name}</span>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium capitalize text-muted-foreground">
                    {typeLabel(stmt.statement_type)}
                  </span>
                  <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Q{stmt.statement_quarter} {stmt.statement_year}
                  </span>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        className="text-muted-foreground"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="Delete statement"
                      >
                        <X />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent onClick={(e) => e.stopPropagation()}>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete statement?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this statement and all of
                          its transactions. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => deleteStatement.mutate(stmt.id)}
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div className="mb-2 text-xs text-muted-foreground">
                {stmt.bank_name} · ****{stmt.account_number} · {stmt.statement_date}
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">Beginning</span>
                <span>${fmt(stmt.beginning_balance)}</span>
                <span className="text-green-600">+${fmt(stmt.total_additions)}</span>
                <span className="text-destructive">
                  −${fmt(stmt.total_subtractions)}
                </span>
                <span className="ml-auto font-bold">
                  ${fmt(stmt.ending_balance)}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
