import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle, AlertDialogTrigger, AlertDialogHeader, AlertDialogFooter } from "@/components/ui/alert-dialog";
import type { BankFeedRule } from "../../types/bankFeedRule";
import { useBankFeedRules, useCreateBankFeedRule, useUpdateBankFeedRule, useDeleteBankFeedRule } from "../../hooks/useBankFeedRule";
import { Search, ChevronDown, ArrowUpDown, Plus, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import BankFeedRuleForm from "../../components/Configurations/BankFeedRuleForm";
import ReplaceBankFeedRulesDialog from "../../components/Configurations/ReplaceBankFeedRulesDialog";
import ImportBankFeedRulesDialog from "../../components/Configurations/ImportBankFeedRulesDialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
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

const FIELD_NAMES: Record<number, string> = {
  1: 'Description',
  6: 'Bank text',
  2: 'Amount',
  10: 'For',
};

const ACTION_NAMES: Record<number, string> = {
  0: 'Set category / account',
  5: 'Set payee / vendor / customer',
  1: 'Set description / memo',
  9: 'Set memo',
  2: 'Set class',
  3: 'Set location',
};

const formatOperator = (op: string) => {
  if (!op) return '';
  const mapping: Record<string, string> = {
    'contains': 'contains',
    'does_not_contain': 'does not contain',
    'equals': 'equals',
    'not_equals': 'does not equal',
    'greater_than': 'is greater than',
    'less_than': 'is less than',
    'greater_than_or_equal': 'is greater than or equal to',
    'less_than_or_equal': 'is less than or equal to',
  };
  return mapping[op] || op.replace(/_/g, ' ');
};

const getConditionLabel = (type: number, value: any, ruleTypeName?: string) => {
  const baseField = FIELD_NAMES[type] || ruleTypeName || `Field ${type}`;
  if (typeof value === 'object' && value !== null && value.operator) {
    return `${baseField} ${formatOperator(value.operator)}`.toUpperCase();
  }
  return baseField.toUpperCase();
};

const formatConditionValue = (type: number, value: any) => {
  let val = value;
  if (typeof value === 'object' && value !== null && value.value !== undefined) {
    val = value.value;
  }
  if (type === 10) {
    if (String(val) === "1" || String(val) === "money_in") return "Money in / deposit";
    if (String(val) === "-1" || String(val) === "money_out") return "Money out / expense";
  }
  if (typeof val === "boolean") return val ? "Yes" : "No";
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
};

const getActionLabel = (type: number, actionTypeName?: string) => {
  return (ACTION_NAMES[type] || actionTypeName || `Action ${type}`).toUpperCase();
};

const formatActionValue = (value: any) => {
  let val = value;
  if (typeof value === 'object' && value !== null && value.value !== undefined) {
    val = value.value;
  }
  if (Array.isArray(val)) {
    return val.join(", ");
  }
  if (typeof val === 'object' && val !== null) {
    if (val.account_number && val.account_name) return `${val.account_number} - ${val.account_name}`;
    if (val.account_name) return val.account_name;
    return JSON.stringify(val);
  }
  if (typeof val === "boolean") return val ? "Yes" : "No";
  return String(val);
};

export default function BankFeedRules() {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("CONFIG_BANK_FEED_RULES_UPDATE");
  const canDelete = hasPermission("CONFIG_BANK_FEED_RULES_DELETE");
  const canCreate = hasPermission("CONFIG_BANK_FEED_RULES_CREATE");
  const { data: rules = [], isPending: loadingRules } = useBankFeedRules();
  const createRule = useCreateBankFeedRule();
  const updateRule = useUpdateBankFeedRule();
  const deleteRule = useDeleteBankFeedRule();
  
  const [selectedRule, setSelectedRule] = useState<BankFeedRule | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<BankFeedRule | null>(null);

  const handleSaveRule = async (data: any) => {
    try {
      if (editingRule) {
        await updateRule.mutateAsync({ id: editingRule.id, rule: data });
        toast.success("Rule updated successfully.");
      } else {
        await createRule.mutateAsync(data);
        toast.success("Rule created successfully.");
      }
      setIsFormOpen(false);
      setEditingRule(null);
    } catch (e) {
      toast.error("Failed to save rule.");
      console.error(e);
    }
  };

  const handleDeleteRule = async (id: number) => {
    try {
      await deleteRule.mutateAsync(id);
      toast.success("Rule deleted successfully.");
    } catch (e) {
      toast.error("Failed to delete rule.");
      console.error(e);
    }
  };



  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");
  const [rowSelection, setRowSelection] = useState({});

  const columns = useMemo<ColumnDef<BankFeedRule>[]>(() => {
    const cols: ColumnDef<BankFeedRule>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
          disabled={!canDelete}
        />
      ),
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            className="translate-y-[2px]"
            disabled={!canDelete}
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
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
    },
    {
      accessorKey: "created_at",
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold text-slate-700" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Created At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const dateStr = row.original.created_at;
        if (!dateStr) return <span className="text-slate-500">-</span>;
        const d = new Date(dateStr);
        return <span className="text-slate-600">{d.toLocaleString()}</span>;
      },
    }
  ];

  if (canUpdate || canDelete) {
    cols.push({
      id: "actions",
      header: "Actions",
      cell: ({ row }) => (
        <div className="flex items-center space-x-2">
          {canUpdate && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={(e) => {
                e.stopPropagation();
                setEditingRule(row.original);
                setIsFormOpen(true);
              }}
            >
              <Pencil className="w-4 h-4 text-slate-500" />
            </Button>
          )}
          {canDelete && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Rule</AlertDialogTitle>
                  <AlertDialogDescription>Are you sure you want to delete this rule? This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={() => handleDeleteRule(row.original.id)} className="bg-red-600 hover:bg-red-700 text-white">Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      ),
    });
  }
  return cols;
}, [canUpdate, canDelete]);

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
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
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
      rowSelection,
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

          {canCreate && <ImportBankFeedRulesDialog />}
          {(canUpdate || canDelete) && <ReplaceBankFeedRulesDialog />}
          
          {canDelete && Object.keys(rowSelection).length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="bg-red-600 hover:bg-red-700 text-white">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({Object.keys(rowSelection).length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Selected Rules</AlertDialogTitle>
                  <AlertDialogDescription>Are you sure you want to delete {Object.keys(rowSelection).length} selected rules? This cannot be undone.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={async () => {
                    try {
                      const idsToDelete = Object.keys(rowSelection).map(index => table.getRow(index).original.id);
                      await Promise.all(idsToDelete.map(id => deleteRule.mutateAsync(id)));
                      toast.success(`Successfully deleted ${idsToDelete.length} rule(s).`);
                      setRowSelection({});
                    } catch (e) {
                      toast.error("Failed to delete some rules.");
                    }
                  }} className="bg-red-600 hover:bg-red-700 text-white">
                    Delete Selected
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          {canCreate && (
            <Button 
              onClick={() => {
                setEditingRule(null);
                setIsFormOpen(true);
              }}
              className="bg-[#18181b] hover:bg-[#27272a] text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Rule
            </Button>
          )}
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
      <div className="border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-3">
        <DataTablePagination table={table} noun="rule(s)" />
      </div>

      <Dialog open={selectedRule !== null} onOpenChange={(open) => { if (!open) setSelectedRule(null); }}>
        <DialogContent className="sm:max-w-6xl w-[90vw] max-h-[90vh] bg-background p-0 overflow-hidden resize border-border shadow-2xl min-w-[300px] min-h-[300px] flex flex-col">
          <div className="bg-muted/50 border-b border-border px-6 py-5 shrink-0">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-foreground">
                {selectedRule?.rule_name}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1">
                Rule configuration details for automatic matching.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="px-6 py-6 overflow-y-auto space-y-8 flex-1">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Conditions</h3>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                  Match {selectedRule?.is_and_rule ? 'All' : 'Any'}
                </span>
              </div>
              
              <div className="space-y-0 rounded-lg border border-border bg-background overflow-hidden">
                {selectedRule?.conditions
                  .filter((c) => !c.rule_type_name?.toLowerCase().includes("auto-add"))
                  .map((c, i) => (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 border-b border-border last:border-0 text-sm hover:bg-muted/30 transition-colors">
                    <span className="font-medium text-muted-foreground sm:w-1/3 shrink-0">{getConditionLabel(c.rule_type, c.value, c.rule_type_name)}</span>
                    <span className="text-foreground font-semibold break-words whitespace-normal flex-1">
                      {formatConditionValue(c.rule_type, c.value)}
                    </span>
                  </div>
                ))}
                {(!selectedRule?.conditions || selectedRule.conditions.filter((c) => !c.rule_type_name?.toLowerCase().includes("auto-add")).length === 0) && (
                  <div className="text-sm text-muted-foreground italic p-4 text-center">No conditions set.</div>
                )}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="border-b border-border pb-2">
                <h3 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">Actions</h3>
              </div>
              
              <div className="space-y-0 rounded-lg border border-border bg-background overflow-hidden">
                {selectedRule?.actions
                  .filter((a) => !a.action_type_name?.toLowerCase().includes("auto-add"))
                  .map((a, i) => {
                  if (Array.isArray(a.value) && a.value.length === 0) return null;
                  return (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 p-4 border-b border-border last:border-0 text-sm hover:bg-muted/30 transition-colors">
                      <span className="font-medium text-muted-foreground sm:w-1/3 shrink-0">{getActionLabel(a.action_type, a.action_type_name)}</span>
                      <span className="text-foreground font-semibold break-words whitespace-normal flex-1">
                        {formatActionValue(a.value)}
                      </span>
                    </div>
                  );
                })}
                {(!selectedRule?.actions || selectedRule.actions.filter((a) => !a.action_type_name?.toLowerCase().includes("auto-add")).length === 0) && (
                  <div className="text-sm text-muted-foreground italic p-4 text-center">No actions set.</div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-4xl w-[95vw] h-[85vh] p-0 overflow-hidden border-border shadow-2xl bg-background flex flex-col">
          <div className="bg-background border-b border-border px-6 py-5 shrink-0 flex justify-between items-center">
            <DialogHeader className="p-0">
              <DialogTitle className="text-xl font-bold text-foreground">
                {editingRule ? 'Edit Rule' : 'Create New Rule'}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground mt-1">
                Configure conditions to automatically categorize matching transactions.
              </DialogDescription>
            </DialogHeader>
          </div>
          
          <div className="flex-1 overflow-hidden">
            <BankFeedRuleForm 
              initialData={editingRule} 
              onSave={handleSaveRule} 
              onCancel={() => {
                setIsFormOpen(false);
                setEditingRule(null);
              }}
              isSaving={createRule.isPending || updateRule.isPending}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
