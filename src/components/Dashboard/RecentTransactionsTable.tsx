import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { useRecentTransactions } from "@/hooks/useDashboard";
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
    return <div className="text-red-500 p-6">Failed to load recent transactions.</div>;
  }

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle>Recent Bank Statement Transactions</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px] pl-6">Date</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right pr-6">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((tx: any) => (
              <TableRow key={tx.id}>
                <TableCell className="pl-6 font-medium text-slate-500">{tx.date}</TableCell>
                <TableCell>{tx.description}</TableCell>
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
