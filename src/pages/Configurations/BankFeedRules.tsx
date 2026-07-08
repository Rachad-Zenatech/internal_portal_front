import { useState, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { BankFeedRule } from "../../types/bankFeedRule";
import { useBankFeedRules, useUploadBankFeedRules } from "../../hooks/useBankFeedRule";
import { Search, Upload, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Select as UISelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useGlobalProgress } from "@/lib/GlobalProgressContext";
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

const formatConditionValue = (type: number, value: any) => {
  if (type === 10) {
    if (String(value) === "1") return "Money in / deposit";
    if (String(value) === "-1") return "Money out / expense";
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const formatActionValue = (value: any) => {
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value) && value.length === 0) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

export default function BankFeedRules() {
  const { addJob } = useGlobalProgress();
  const { data: rules = [], isPending: loadingRules } = useBankFeedRules();
  const { mutateAsync: uploadRules, isPending: isUploading } = useUploadBankFeedRules();
  const [selectedRule, setSelectedRule] = useState<BankFeedRule | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const promise = uploadRules(file);
    addJob("Replace Bank Feed Rules", promise, { description: "Uploading...", type: "upload", link_url: window.location.pathname });

    promise.then(() => {
      toast.success("Successfully replaced rules.", {
        action: { label: "Refresh", onClick: () => window.location.reload() }
      });
    }).catch((err) => {
      toast.error("Failed to process the uploaded file.");
      console.error(err);
    });
    
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<ColumnDef<BankFeedRule>[]>(() => [
    {
      accessorKey: "rule_name",
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold text-slate-700" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Rule Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-medium text-slate-900">{row.original.rule_name}</span>,
    },
    {
      id: "conditions",
      accessorFn: (row) => row.conditions.length,
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold text-slate-700" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Conditions
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span className="text-slate-600">{row.original.conditions.length} condition(s)</span>,
    },
    {
      accessorKey: "is_and_rule",
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold text-slate-700" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Match
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span className="text-slate-600">{row.original.is_and_rule ? "All" : "Any"}</span>,
    }
  ], []);

  const table = useReactTable({
    data: rules,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    globalFilterFn: (row, _columnId, filterValue) => {
      const search = filterValue.toLowerCase();
      const ruleName = (row.getValue("rule_name") as string)?.toLowerCase() || "";
      return ruleName.includes(search);
    },
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
  });

  return (
    <div className="w-full h-full flex flex-col space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bank Feed Rules</h1>
          <p className="text-slate-500 mt-1">Manage rules for automatically categorizing bank transactions.</p>
        </div>
      </div>

      <div className="flex items-start justify-between shrink-0">
        <div className="flex flex-col gap-1.5">
          <div className="relative w-72">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
            <Input 
              placeholder="Search rules..." 
              className="pl-9 bg-white" 
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
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

          <input 
            type="file" 
            accept=".xls,.xlsx,.csv" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
          />
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                variant="destructive" 
                disabled={isUploading}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploading ? "Uploading..." : "Replace Rules"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="sm:max-w-[400px] p-0 pt-10 overflow-hidden border border-slate-200 shadow-2xl rounded-[28px] bg-white gap-0">
              <div className="flex flex-col items-center justify-center text-center px-6">
                <div className="mx-auto flex h-[88px] w-[88px] items-center justify-center rounded-full bg-red-50 mb-5">
                  <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full bg-red-100/80">
                    <AlertTriangle className="h-7 w-7 text-red-600" strokeWidth={2.25} />
                  </div>
                </div>
                
                <AlertDialogTitle className="text-[24px] font-bold tracking-tight text-slate-900 mb-4">
                  Replace Rules?
                </AlertDialogTitle>
                
                <AlertDialogDescription className="text-center text-[15px] leading-[1.6] text-slate-500/90 font-medium px-4">
                  Are you sure you want to replace <strong className="text-slate-700 font-semibold">all<br />existing rules</strong>?
                  <span className="block mt-1">
                    This action cannot be undone and will<br />overwrite all current bank feed rules.
                  </span>
                </AlertDialogDescription>
              </div>
              
              <div className="mt-8 p-[6px] mx-6 mb-6 rounded-[20px] flex gap-[6px]">
                <AlertDialogCancel className="m-0 flex-1 rounded-[14px] h-[46px] text-[14px] font-semibold text-slate-900 bg-white border border-slate-200/60 hover:bg-slate-50 shadow-sm transition-all">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction 
                  onClick={() => fileInputRef.current?.click()}
                  className="m-0 flex-1 rounded-[14px] h-[46px] text-[14px] font-semibold bg-[#18181b] hover:bg-[#27272a] text-white shadow-sm transition-all border-none"
                >
                  Yes, Replace
                </AlertDialogAction>
              </div>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <Card className="flex-1 min-h-0 overflow-hidden border-slate-200 shadow-sm p-0 flex flex-col">
        <Table containerClassName="flex-1 overflow-auto max-h-[calc(100vh-16rem)] relative">
          <TableHeader className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="h-12">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loadingRules ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                </TableRow>
              ))
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="hover:bg-slate-50/50 transition-colors cursor-pointer" 
                  onClick={() => setSelectedRule(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center text-slate-500">
                  {globalFilter ? "No rules found matching your search." : "No bank feed rules have been created yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      {/* PAGINATION */}
      <div className="flex flex-col items-center justify-center gap-4 px-2 py-4 sm:flex-row sm:gap-6 lg:gap-8">
        <div className="flex items-center space-x-4 sm:space-x-6 lg:space-x-8">
          <div className="text-sm font-medium text-slate-600">
            {table.getFilteredRowModel().rows.length} total rule(s).
          </div>
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium text-slate-600">Rows per page</p>
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
          <div className="flex w-[100px] items-center justify-center text-sm font-medium text-slate-600">
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

      <Dialog open={selectedRule !== null} onOpenChange={(open) => { if (!open) setSelectedRule(null); }}>
        <DialogContent className="sm:max-w-6xl w-[90vw] max-h-[90vh] bg-white p-0 overflow-hidden resize border-none shadow-2xl min-w-[300px] min-h-[300px] flex flex-col">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-5 shrink-0">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-slate-800">
                {selectedRule?.rule_name}
              </DialogTitle>
              <DialogDescription className="text-slate-500 mt-1">
                Rule configuration details for automatic matching.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="px-6 py-6 overflow-y-auto space-y-8 flex-1">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-2">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-500">Conditions</h3>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  Match {selectedRule?.is_and_rule ? 'All' : 'Any'}
                </span>
              </div>
              
              <div className="space-y-2.5">
                {selectedRule?.conditions
                  .filter((c) => !c.rule_type_name?.toLowerCase().includes("auto-add"))
                  .map((c, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 bg-slate-50/80 border border-slate-100 p-3 rounded-lg text-sm">
                    <span className="font-medium text-slate-600 sm:w-1/3 shrink-0">{c.rule_type_name || `Type ${c.rule_type}`}</span>
                    <span className="text-slate-900 font-semibold break-words whitespace-normal flex-1">
                      {formatConditionValue(c.rule_type, c.value)}
                    </span>
                  </div>
                ))}
                {(!selectedRule?.conditions || selectedRule.conditions.filter((c) => !c.rule_type_name?.toLowerCase().includes("auto-add")).length === 0) && (
                  <div className="text-sm text-slate-500 italic p-3 text-center bg-slate-50/50 rounded-lg">No conditions set.</div>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="border-b pb-2">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-slate-500">Actions</h3>
              </div>
              
              <div className="space-y-2.5">
                {selectedRule?.actions
                  .filter((a) => !a.action_type_name?.toLowerCase().includes("auto-add"))
                  .map((a, i) => {
                  if (Array.isArray(a.value) && a.value.length === 0) return null;
                  return (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 bg-blue-50/30 border border-blue-100/50 p-3 rounded-lg text-sm">
                      <span className="font-medium text-slate-600 sm:w-1/3 shrink-0">{a.action_type_name || `Action ${a.action_type}`}</span>
                      <span className="text-slate-900 font-semibold break-words whitespace-normal flex-1">
                        {formatActionValue(a.value)}
                      </span>
                    </div>
                  );
                })}
                {(!selectedRule?.actions || selectedRule.actions.filter((a) => !a.action_type_name?.toLowerCase().includes("auto-add")).length === 0) && (
                  <div className="text-sm text-slate-500 italic p-3 text-center bg-slate-50/50 rounded-lg">No actions set.</div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
