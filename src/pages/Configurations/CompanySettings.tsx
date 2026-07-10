import { useEffect, useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { Company, CompanyCreate } from "../../types/bank";
import { useCompanies, useCompanyEntities, useCreateCompany, useUpdateCompany, useDeleteCompany } from "../../hooks/useBank";
import { GLService } from "../../services/glService";
import type { GLExtractionFormat } from "@/types/gl";
import { useAuth } from "@/lib/AuthContext";
import { Plus, Edit2, Trash2, Search, AlertTriangle, ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  Select as UISelect,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Request failed";
}

export default function CompanySettings() {
  const { hasPermission } = useAuth();
  const canDelete = hasPermission("CONFIG_COMPANY_DELETE");
  const canUpdate = hasPermission("CONFIG_COMPANY_UPDATE");
  const canCreate = hasPermission("CONFIG_COMPANY_CREATE");
  const { data: companies = [], isLoading } = useCompanies();
  const { data: entityOptions = [], isLoading: isLoadingEntities } = useCompanyEntities();
  const createMutation = useCreateCompany();
  const updateMutation = useUpdateCompany();
  const deleteMutation = useDeleteCompany();
  const queryClient = useQueryClient();

  const [glFormats, setGlFormats] = useState<GLExtractionFormat[]>([]);
  const [isLoadingGlFormats, setIsLoadingGlFormats] = useState(false);
  const [defaultGlFormatId, setDefaultGlFormatId] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<CompanyCreate>({
    name: "", entity: "", description: "", group: "DAAS", state: "", country: "",
  });

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  useEffect(() => {
    let isActive = true;

    async function loadGlFormats() {
      setIsLoadingGlFormats(true);
      try {
        const formats = await GLService.getFormats();
        if (isActive) setGlFormats(formats);
      } catch (error) {
        if (isActive) {
          toast.error("Error", { description: errorMessage(error) });
        }
      } finally {
        if (isActive) setIsLoadingGlFormats(false);
      }
    }

    void loadGlFormats();

    return () => {
      isActive = false;
    };
  }, []);

  const handleOpenModal = (company?: Company) => {
    setDefaultGlFormatId("");
    if (company) {
      setEditingId(company.id);
      setFormData({
        name: company.name,
        entity: company.entity || "",
        description: company.description || "",
        group: company.group || "DAAS",
        state: company.state || "",
        country: company.country || "",
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", entity: "", description: "", group: "DAAS", state: "", country: "" });
    }
    setIsDialogOpen(true);
  };

  const handleSaveClick = async () => {
    try {
      let savedCompany: Company;
      if (editingId) {
        savedCompany = await updateMutation.mutateAsync({ id: editingId, data: formData });
      } else {
        savedCompany = await createMutation.mutateAsync(formData);
        if (defaultGlFormatId) {
          await GLService.assignCompanyBook({
            companyId: savedCompany.id,
            formatId: Number(defaultGlFormatId),
          });
        }
      }
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["company-cards"] }),
        queryClient.invalidateQueries({ queryKey: ["books"] }),
      ]);
      setIsDialogOpen(false);
      toast.success("Company saved successfully", { position: "top-center" });
    } catch (error) {
      toast.error("Error", { description: errorMessage(error) });
    }
  };

  const handleDeleteClick = (company: Company) => {
    setCompanyToDelete(company);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!companyToDelete) return;
    try {
      await deleteMutation.mutateAsync(companyToDelete.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["company-cards"] }),
        queryClient.invalidateQueries({ queryKey: ["books"] }),
      ]);
      toast.success("Company deleted", { position: "top-center" });
    } catch (error) {
      toast.error("Error", { description: errorMessage(error) });
    }
    setIsDeleteDialogOpen(false);
    setCompanyToDelete(null);
  };

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");

  const columns = useMemo<ColumnDef<Company>[]>(() => {
    const cols: ColumnDef<Company>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: "entity",
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Entity
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span>{row.original.entity || "-"}</span>,
    },
    {
      accessorKey: "group",
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Group
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span>{row.original.group || "-"}</span>,
    },
    {
      accessorKey: "state",
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          State
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span>{row.original.state || "-"}</span>,
    },
    {
      accessorKey: "country",
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Country
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span>{row.original.country || "-"}</span>,
    },
    {
      accessorKey: "description",
      header: ({ column }) => (
        <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Description
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <span className="max-w-[250px] truncate block" title={row.original.description || ""}>{row.original.description || "-"}</span>,
    }
  ];

  if (canUpdate || canDelete) {
    cols.push({
      id: "actions",
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="text-right space-x-2">
          {canUpdate && (
            <Button variant="outline" size="sm" onClick={() => handleOpenModal(row.original)}>
              <Edit2 size={14} className="mr-1" /> Edit
            </Button>
          )}
          {canDelete && (
            <Button variant="destructive" size="sm" onClick={() => handleDeleteClick(row.original)}>
              <Trash2 size={14} className="mr-1" /> Remove
            </Button>
          )}
        </div>
      ),
    });
  }
  return cols;
}, [canUpdate, canDelete]);

  const table = useReactTable({
    data: companies,
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
      const name = (row.getValue("name") as string)?.toLowerCase() || "";
      const entity = (row.getValue("entity") as string)?.toLowerCase() || "";
      const group = (row.getValue("group") as string)?.toLowerCase() || "";
      const state = (row.getValue("state") as string)?.toLowerCase() || "";
      const country = (row.getValue("country") as string)?.toLowerCase() || "";
      return name.includes(search) || entity.includes(search) || group.includes(search) || state.includes(search) || country.includes(search);
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
    <div className="w-full space-y-8 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Company Settings</h1>
          <p className="text-slate-500 mt-1">Manage the companies and entities within your organization.</p>
        </div>
        <div className="flex items-center gap-4">
          {canCreate && (
            <Button onClick={() => handleOpenModal()} className="gap-2">
              <Plus size={16} /> Add Company
            </Button>
          )}
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center justify-between">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              type="text" 
              placeholder="Search companies..." 
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
              {isLoading ? (
                <TableRow><TableCell colSpan={columns.length} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
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
                      <p className="text-sm text-muted-foreground mt-1">No companies found.</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>

        {/* PAGINATION */}
        <div className="border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-3">
          <DataTablePagination table={table} noun="company(s)" />
        </div>
      </div>

      {/* EDIT MODAL */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader><DialogTitle>{editingId ? "Edit Company" : "Add Company"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Name *</Label>
              <Input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entity</Label>
                <select
                  value={formData.entity || ""}
                  onChange={e => setFormData({...formData, entity: e.target.value})}
                  disabled={isLoadingEntities}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {isLoadingEntities ? "Loading entities..." : "Select entity"}
                  </option>
                  {entityOptions.map((entity) => (
                    <option key={entity} value={entity}>
                      {entity}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label>Group</Label>
                <select value={formData.group || "DAAS"} onChange={e => setFormData({...formData, group: e.target.value})} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                  <option value="DAAS">DAAS</option>
                  <option value="SAAS">SAAS</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input value={formData.state || ""} onChange={e => setFormData({...formData, state: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input value={formData.country || ""} onChange={e => setFormData({...formData, country: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input value={formData.description || ""} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
            {!editingId && (
              <div className="space-y-2">
                <Label>Default GL Format</Label>
                <select
                  value={defaultGlFormatId}
                  onChange={e => setDefaultGlFormatId(e.target.value)}
                  disabled={isLoadingGlFormats}
                  className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">
                    {isLoadingGlFormats ? "Loading formats..." : "None"}
                  </option>
                  {glFormats.map((format) => (
                    <option key={format.id} value={format.id}>
                      {format.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveClick}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" />Delete Company?</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete <strong>{companyToDelete?.name}</strong>?<br /><br />This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCompanyToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} className="bg-red-600 hover:bg-red-700">Yes, Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
