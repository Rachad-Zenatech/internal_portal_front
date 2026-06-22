import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

import {
  useRecentTransactions,
  type RecentTransaction,
} from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";

type RecentTransactionsTableProps = {
  companyId?: number | null;
};

export default function RecentTransactionsTable({
  companyId,
}: RecentTransactionsTableProps) {
  const { data, isLoading, isError } = useRecentTransactions(companyId);

  if (isLoading) {
    return (
      <Card className="w-full h-full">
        <CardHeader>
          <Skeleton className="h-6 w-[250px]" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4 px-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isError || !data) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px] flex flex-col items-center justify-center p-6 text-center">
          <h3 className="text-lg font-semibold">No data</h3>
          <p className="text-sm text-muted-foreground mt-1">Failed to load recent transactions.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full flex flex-col overflow-hidden">
      <CardHeader className="flex-none">
        <CardTitle>Recent Bank Statement Transactions</CardTitle>
      </CardHeader>
      <CardContent className="p-0 flex-1 overflow-y-auto min-h-[300px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px] pl-6">Date</TableHead>
              <TableHead className="max-w-[150px] sm:max-w-[200px]">Description</TableHead>
              <TableHead className="text-right pr-6 w-[120px]">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((tx: RecentTransaction) => (
              <TableRow key={tx.id}>
                <TableCell className="pl-6 font-medium text-slate-500 whitespace-nowrap">{tx.date}</TableCell>
                <TableCell className="max-w-[150px] sm:max-w-[200px] whitespace-normal break-words">
                  {tx.description}
                </TableCell>
                <TableCell 
                  className={cn(
                    "text-right pr-6 font-semibold",
                    tx.amount > 0 ? "text-green-600" : "text-red-500"
                  )}
                >
                  {tx.amount > 0 ? "+" : ""}
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(tx.amount)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
