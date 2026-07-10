import { useState, useMemo, useRef } from "react";
import type { ChartOfAccount, ChartOfAccounts } from "@/types/chartOfAccount";
import { useDeleteChartOfAccount, useUpdateChartOfAccount } from "@/hooks/useChartOfAccount";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle, Trash2, Search, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, Info } from "lucide-react";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Select as UISelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
} from "@tanstack/react-table";
import { useAuth } from "@/lib/AuthContext";
import type {
  ColumnDef,
  SortingState,
  ColumnFiltersState,
  VisibilityState,
} from "@tanstack/react-table";

const detailTypePlaceholder = `Purpose: Used for day-to-day operating computer costs.
Typical transactions:
- Mouse
- Keyboard
- Laptop charger
- Antivirus subscription
- Adobe subscription
- Microsoft Office
- Internet bill
- Network repair
- Small computer accessories
Do NOT use for:
- Purchasing new computers
- Servers
- Capital equipment
- Fixed assets
Keywords: software, subscription, internet, repair, accessories, supplies, maintenance
Capitalization: Expense immediately.`;

interface COATableProps {
  result: ChartOfAccounts | undefined;
  loadingData: boolean;
}

export default function COATable({ result, loadingData }: COATableProps) {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("CONFIG_CHART_OF_ACCOUNTS_UPDATE");
  const canDelete = hasPermission("CONFIG_CHART_OF_ACCOUNTS_DELETE");
  const { mutate: deleteAccount } = useDeleteChartOfAccount();
  const { mutate: updateAccount } = useUpdateChartOfAccount();

  // Edit State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);

  // Custom Dragging State
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const currentPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    dragStart.current = { x: e.clientX - currentPos.current.x, y: e.clientY - currentPos.current.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging.current && dragRef.current) {
      currentPos.current = { x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y };
      dragRef.current.style.transform = `translate(${currentPos.current.x}px, ${currentPos.current.y}px)`;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const [editForm, setEditForm] = useState<ChartOfAccount>({
    id: 0, account_number: "", account_type: "", detail_type: "", account_name: "",
  });

  // Delete State
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] =
    useState<ChartOfAccount | null>(null);

  const handleEditClick = (account: ChartOfAccount) => {
    if (!canUpdate) return;
    setEditForm({ ...account });
    setIsDialogOpen(true);
  };

  const handleSaveClick = () => {
    updateAccount(editForm, {
      onSuccess: (data) => {
        toast.success(data.message, { position: "top-center" });
        setIsDialogOpen(false);
      },
      onError: (error: Error) => {
        toast.error("Failed to Update", { description: error.message });
      }
    });
  };

  const handleDeleteClick = (account: ChartOfAccount) => {
    setAccountToDelete(account);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (accountToDelete?.id !== undefined) deleteAccount(accountToDelete.id);
    setIsDeleteDialogOpen(false);
    setAccountToDelete(null);
  };

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");

  const accounts = result?.chart_of_accounts || [];

  const columns = useMemo<ColumnDef<ChartOfAccount>[]>(() => {
    const cols: ColumnDef<ChartOfAccount>[] = [
      {
        accessorKey: "account_number",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Account #
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <span className="font-medium">{row.original.account_number}</span>,
      },
      {
        accessorKey: "account_name",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Account Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <span>{row.original.account_name}</span>,
      },
      {
        accessorKey: "account_type",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Type
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <span>{row.original.account_type}</span>,
      },
      {
        accessorKey: "detail_type",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Detail Type
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => <span>{row.original.detail_type}</span>,
      }
    ];

    if (canDelete) {
      cols.push({
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="text-right space-x-2">
            <Button variant="destructive" size="sm" className="gap-1.5" onClick={() => handleDeleteClick(row.original)}>
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          </div>
        ),
      });
    }

    return cols;
  }, [canDelete]);

  const table = useReactTable({
    data: accounts,
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
      const num = (row.getValue("account_number") as string)?.toLowerCase() || "";
      const name = (row.getValue("account_name") as string)?.toLowerCase() || "";
      const type = (row.getValue("account_type") as string)?.toLowerCase() || "";
      const detail = (row.getValue("detail_type") as string)?.toLowerCase() || "";
      return num.includes(search) || name.includes(search) || type.includes(search) || detail.includes(search);
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
    <>
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              type="text" 
              placeholder="Search accounts..." 
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-10 w-64 sm:w-80"
            />
          </div>
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

        <Card className="overflow-hidden p-0">
          <Table className="m-0 relative" containerClassName="max-h-[calc(100vh-16rem)]">
            <TableHeader className="sticky top-0 z-10 bg-slate-50 shadow-sm">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-slate-50 hover:bg-slate-50 border-t-0">
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
              {loadingData ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                    <TableCell className="text-right"><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="cursor-pointer hover:bg-slate-50/50"
                    onClick={(e) => {
                      // Prevent firing if clicking on actions button
                      if ((e.target as HTMLElement).closest('button')) return;
                      handleEditClick(row.original);
                    }}
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
                  <TableCell colSpan={columns.length} className="p-12 text-center border-b-0">
                    <div className="flex flex-col items-center justify-center">
                      <h3 className="text-lg font-semibold text-foreground">No data</h3>
                      <p className="text-sm text-muted-foreground mt-1">No accounts found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* PAGINATION */}
        <div className="flex flex-col items-center justify-center gap-4 px-2 py-4 sm:flex-row sm:gap-6 lg:gap-8">
          <div className="text-sm text-muted-foreground">
            {table.getFilteredRowModel().rows.length} total account(s).
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

      {/* EDIT MODAL */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader><DialogTitle>Edit Account</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-start gap-4"><Label className="text-right mt-2">Account #</Label><Input value={editForm.account_number} onChange={(e) => setEditForm({ ...editForm, account_number: e.target.value })} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-start gap-4"><Label className="text-right mt-2">Type</Label><Input value={editForm.account_type} onChange={(e) => setEditForm({ ...editForm, account_type: e.target.value })} className="col-span-3" /></div>
            <div className="grid grid-cols-4 items-start gap-4">
              <div className="flex items-center justify-end gap-2 mt-2">
                <span className="text-sm font-medium">Detail</span>
                <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full" onClick={() => setInfoOpen(true)}>
                  <Info className="h-4 w-4 text-slate-500" />
                </Button>
              </div>
              <Textarea placeholder={detailTypePlaceholder} value={editForm.detail_type} onChange={(e) => setEditForm({ ...editForm, detail_type: e.target.value })} className="col-span-3 min-h-[120px]" />
            </div>
            <div className="grid grid-cols-4 items-start gap-4"><Label className="text-right mt-2">Name</Label><Input value={editForm.account_name} onChange={(e) => setEditForm({ ...editForm, account_name: e.target.value })} className="col-span-3" /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button><Button onClick={handleSaveClick}>Save changes</Button></DialogFooter>
          
          {infoOpen && (
            <div ref={dragRef} className="fixed z-[100] w-[500px] shadow-2xl bg-white border border-slate-200 rounded-lg top-[20%] left-[60%] flex flex-col pointer-events-auto" style={{ transform: `translate(${currentPos.current.x}px, ${currentPos.current.y}px)` }}>
              <div 
                className="cursor-move bg-slate-100 rounded-t-lg py-3 px-4 border-b flex items-center justify-between"
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
              >
                <h3 className="text-base font-semibold">Detail Type Template</h3>
                <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setInfoOpen(false)}>
                  <span className="sr-only">Close</span>
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4"><path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                </Button>
              </div>
              <div className="p-4">
                <div className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 p-4 rounded-md border">{detailTypePlaceholder}</div>
                <div className="flex justify-end mt-4">
                  <Button type="button" onClick={() => setInfoOpen(false)}>Close</Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" />Delete Account?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete account <strong>{accountToDelete?.account_number} - {accountToDelete?.account_name}</strong>?<br /><br />This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAccountToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} className="bg-red-600 hover:bg-red-700">Yes, Delete Account</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
