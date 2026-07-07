import { useState, useMemo } from "react";
import type { FormEvent } from "react";
import { useSummary, useCompanies, useBankAccounts } from "@/hooks/useBank";
import type { SummaryPeriod, Summary } from "@/types/bank";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Building2, Calendar, CreditCard, BarChart3, Search, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown } from "lucide-react";
import {
  Select as UISelect,
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
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
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

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const columns = useMemo<ColumnDef<Summary>[]>(() => {
    const cols: ColumnDef<Summary>[] = [
      {
        accessorKey: "company_name",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Company
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="font-bold text-sm text-foreground">{row.original.company_name}</span>
        ),
      },
      {
        accessorKey: "account_number",
        header: "Account",
        cell: ({ row }) => (
          <span className="font-mono font-semibold text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded text-foreground">
            ****{row.original.account_number}
          </span>
        ),
      },
      {
        accessorKey: "bank_name",
        header: "Bank",
        cell: ({ row }) => (
          <span className="font-semibold text-sm text-foreground/80">{row.original.bank_name}</span>
        ),
      },
      {
        accessorKey: "statement_type",
        header: "Type",
        cell: ({ row }) => (
          <span className="bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 px-2 py-0.5 rounded font-bold uppercase tracking-wide text-xs">
            {typeLabel(row.original.statement_type)}
          </span>
        ),
      },
      {
        accessorKey: "period",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            {activePeriod === "monthly" ? "Month" : activePeriod === "quarterly" ? "Quarter" : "Year"}
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <span className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400 px-2 py-0.5 rounded text-sm font-bold text-foreground">
            {periodLabel(activePeriod, row.original.period)}
          </span>
        ),
      },
    ];

    if (activePeriod === "monthly") {
      cols.push({
        accessorKey: "beginning_balance",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold flex w-full justify-end" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Beg Bal
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-right font-semibold text-sm text-foreground">
            ${fmt(row.original.beginning_balance)}
          </div>
        ),
      });
    }

    cols.push(
      {
        accessorKey: "total_in",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold flex w-full justify-end" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            In
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-right font-bold text-sm text-green-600 dark:text-green-400">
            +${fmt(row.original.total_in)}
          </div>
        ),
      },
      {
        accessorKey: "total_out",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold flex w-full justify-end" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Out
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-right font-bold text-sm text-destructive">
            -${fmt(row.original.total_out)}
          </div>
        ),
      },
      {
        accessorKey: "closing_balance",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold flex w-full justify-end" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Closing Bal
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-right font-bold text-base text-primary tracking-tight">
            ${fmt(row.original.closing_balance)}
          </div>
        ),
      },
      {
        accessorKey: "statement_count",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold flex w-full justify-end" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Count
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="text-right text-xs font-bold text-muted-foreground/80">
            <span className="bg-muted px-2 py-1 rounded-full">{row.original.statement_count}</span>
          </div>
        ),
      }
    );

    return cols;
  }, [activePeriod]);

  const table = useReactTable({
    data: rows,
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

  return (
    <div className="p-4 space-y-6 animate-in fade-in duration-200">
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
              className="h-10 w-max items-center justify-start gap-1 rounded-xl p-1"
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
            <UISelect
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
            </UISelect>
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
                className="w-max max-w-full justify-start gap-1 rounded-xl p-1 flex-wrap h-auto min-h-10"
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
        <div className="space-y-4 animate-in fade-in-40 slide-in-from-bottom-3">
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
                      className="hover:bg-muted/30 transition-colors"
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
                <UISelect
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
                </UISelect>
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
      )}
    </div>
  );
}