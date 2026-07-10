import { useState, useMemo } from "react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useBankBalancesChart, type DashboardFilters } from "@/hooks/useDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, ChevronLeft, ChevronRight } from "lucide-react";

type BankBalancesChartProps = {
  filters?: DashboardFilters;
};

export default function BankBalancesChart({ filters }: BankBalancesChartProps) {
  const { data = [], isLoading, isError } = useBankBalancesChart(filters);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(val || 0);

  const columns = [
    {
      accessorKey: "account",
      header: "Bank Account",
      cell: ({ row }: any) => {
        let accountName = row.original.account;
        if (accountName.includes(" - ")) {
          const parts = accountName.split(" - ");
          accountName = `${parts[0]} ${parts[1].substring(0, 4)}`;
        }
        return <span className="font-medium text-slate-900">{accountName}</span>;
      },
    },
    {
      accessorKey: "beginning",
      header: () => <div className="text-right">Beginning Balance</div>,
      cell: ({ row }: any) => (
        <div className="text-right text-slate-600">{formatCurrency(row.original.beginning)}</div>
      ),
    },
    {
      accessorKey: "ending",
      header: () => <div className="text-right">Ending Balance</div>,
      cell: ({ row }: any) => (
        <div className="text-right text-slate-900 font-medium">{formatCurrency(row.original.ending)}</div>
      ),
    },
    {
      id: "change",
      header: () => <div className="text-right">Change</div>,
      cell: ({ row }: any) => {
        const change = row.original.ending - row.original.beginning;
        const isPositive = change >= 0;
        return (
          <div className={`flex items-center justify-end gap-1 font-medium ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {formatCurrency(Math.abs(change))}
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onPaginationChange: setPagination,
    state: {
      pagination,
    },
  });

  if (isLoading) {
    return (
      <Card className="w-full h-full rounded-2xl border-slate-200/60 shadow-sm flex flex-col">
        <CardHeader>
          <Skeleton className="h-6 w-[200px]" />
        </CardHeader>
        <CardContent className="flex-1">
          <Skeleton className="h-[250px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="w-full h-full rounded-2xl border-slate-200/60 shadow-sm flex flex-col">
        <CardHeader>
          <CardTitle className="text-lg">Bank Account Balances</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-sm text-muted-foreground mt-1">Failed to load bank balances.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full h-full rounded-2xl border-slate-200/60 shadow-sm flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">Bank Account Balances</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0">
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-y border-slate-100 text-slate-500 font-medium">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th key={header.id} className="px-4 py-3 font-medium">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="h-24 text-center text-slate-500">
                    No results.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100">
          <div className="text-xs text-slate-500">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="h-8 w-8 p-0"
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
