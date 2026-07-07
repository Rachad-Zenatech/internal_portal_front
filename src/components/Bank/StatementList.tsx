import { useState, useMemo } from "react";
import { X, Calendar, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Trash2, ArrowUpDown } from "lucide-react";
import { useStatements, useDeleteStatement } from "@/hooks/useBank";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table";
import type { BankStatement } from "@/types/bank";

const fmt = (n: number): string =>
  Number(n).toLocaleString("en-US", { minimumFractionDigits: 2 });

const typeLabel = (t: string): string =>
  t ? t.charAt(0).toUpperCase() + t.slice(1) : "—";

interface Props {
  onSelect: (id: string) => void;
}

export default function StatementList({ onSelect }: Props) {
  const { data: statements = [], isLoading, error } = useStatements(null);
  const deleteStatement = useDeleteStatement();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const columns = useMemo<ColumnDef<BankStatement>[]>(
    () => [
      {
        accessorKey: "company_name",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Company
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-bold text-foreground">{row.original.company_name}</span>
        ),
      },
      {
        id: "bank_account",
        accessorFn: row => `${row.bank_name} ${row.account_number}`,
        header: "Bank & Account",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground capitalize">{row.original.bank_name}</span>
            <span className="text-[11px] text-primary font-medium">****{row.original.account_number}</span>
          </div>
        ),
      },
      {
        accessorKey: "statement_date",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Statement Date
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground/50" />
            {row.original.statement_date}
          </div>
        ),
      },
      {
        accessorKey: "statement_type",
        header: "Type",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider">
              {typeLabel(row.original.statement_type)}
            </span>
            <span className="text-xs font-medium text-muted-foreground">
              Q{row.original.statement_quarter} {row.original.statement_year}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "beginning_balance",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold flex w-full justify-end" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Beg Bal
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-right font-medium text-foreground/80 text-[13px]">
            ${fmt(row.original.beginning_balance)}
          </div>
        ),
      },
      {
        accessorKey: "total_additions",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold flex w-full justify-end" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Additions
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-right font-medium text-green-600 dark:text-green-500 text-[13px]">
            +${fmt(row.original.total_additions)}
          </div>
        ),
      },
      {
        accessorKey: "total_subtractions",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold flex w-full justify-end" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Deductions
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-right font-medium text-red-600 dark:text-red-500 text-[13px]">
            -${fmt(row.original.total_subtractions)}
          </div>
        ),
      },
      {
        accessorKey: "ending_balance",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold flex w-full justify-end" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            End Bal
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-right font-bold text-foreground text-[15px]">
            ${fmt(row.original.ending_balance)}
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const stmt = row.original;
          return (
            <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent onClick={(e) => e.stopPropagation()} className="sm:max-w-[400px] border-border/50 shadow-2xl rounded-2xl p-0 overflow-hidden">
                  <div className="p-8 text-center flex flex-col items-center">
                    <div className="h-16 w-16 bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-500 rounded-full flex items-center justify-center mb-6 shadow-sm ring-8 ring-red-50 dark:ring-red-500/10">
                      <Trash2 className="h-8 w-8" />
                    </div>
                    
                    <div className="mb-2 w-full flex flex-col items-center text-center space-y-1.5">
                      <AlertDialogTitle className="text-2xl font-bold text-center">Delete statement?</AlertDialogTitle>
                    </div>
                    
                    <p className="text-muted-foreground text-center text-base mb-8 px-2">
                      This will permanently delete this statement.
                    </p>

                    <AlertDialogFooter className="flex w-full gap-3 m-0 p-0 border-none bg-transparent sm:justify-center">
                      <AlertDialogCancel className="flex-1 rounded-xl h-11 font-semibold mt-0">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => deleteStatement.mutate(stmt.id)}
                        className="flex-1 rounded-xl h-11 bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg transition-all border-none font-semibold"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        },
      },
    ],
    [deleteStatement]
  );

  const table = useReactTable({
    data: statements,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="w-full mb-6">
        <CardHeader>
          <CardTitle>Error</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center p-10 text-center">
          <h3 className="text-lg font-semibold text-foreground">Failed to load data</h3>
          <p className="text-sm text-muted-foreground mt-1">{(error as Error).message}</p>
        </CardContent>
      </Card>
    );
  }

  if (statements.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <h3 className="text-lg font-semibold text-foreground">No data</h3>
          <p className="text-sm text-muted-foreground mt-1">No bank statements found.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Input
          placeholder="Filter companies..."
          value={(table.getColumn("company_name")?.getFilterValue() as string) ?? ""}
          onChange={(event) =>
            table.getColumn("company_name")?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((column) => column.getCanHide())
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
                    onCheckedChange={(value) => column.toggleVisibility(!!value)}
                  >
                    {column.id.replace(/_/g, " ")}
                  </DropdownMenuCheckboxItem>
                );
              })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <Table containerClassName="max-h-[600px] overflow-auto">
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer group hover:bg-muted/30 transition-colors"
                  onClick={() => onSelect(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-center gap-4 px-2 py-4 sm:flex-row sm:gap-6 lg:gap-8">
        <div className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} total row(s).
        </div>
        <div className="flex items-center space-x-4 sm:space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount() || 1}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
