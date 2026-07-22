// src/pages/GeneralLedger.tsx

import { useEffect, useMemo, useState } from "react";
import type { CompanyGLCard, GLExtractionFormat } from "@/types/gl";
import {
  useCancelGLUploadQueueJob,
  useCompanyCards,
  useDeleteGLUploadQueueJob,
  useGLFormats,
  useAssignFormat,
  useGLUploadQueue,
} from "@/hooks/useGL";
import { GLUploadQueuePanel } from "@/components/GLUploadQueuePanel";
import { useGlobalProgress } from "@/lib/GlobalProgressContext";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { ArrowUpDown, ChevronDown } from "lucide-react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type PeriodType = "january" | "february" | "march" | "april" | "may" | "june" | "july" | "august" | "september" | "october" | "november" | "december" | "q1" | "q2" | "q3" | "q4" | "year" | "custom";

import { useAuth } from "@/lib/AuthContext";

export default function GeneralLedger() {
  const { hasPermission } = useAuth();
  const [period, setPeriod] = useState<PeriodType>("q1");
  const [year, setYear] = useState<number>(2026);
  const [companyId, setCompanyId] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState("all");
  const [queueActionMessage, setQueueActionMessage] = useState<string | null>(null);
  const [queueActionError, setQueueActionError] = useState<string | null>(null);
  const [cancelingQueueJobId, setCancelingQueueJobId] = useState<number | null>(null);
  const [deletingQueueJobId, setDeletingQueueJobId] = useState<number | null>(null);

  const { data: cards = [], isLoading: loadingCards, error: cardsError } = useCompanyCards(period, year);
  const { data: formats = [] } = useGLFormats();
  const {
    data: uploadQueueData,
    isLoading: isUploadQueueLoading,
    fetchNextPage: fetchNextUploadQueuePage,
    hasNextPage: hasNextUploadQueuePage,
    isFetchingNextPage: isFetchingNextUploadQueuePage,
    refetch: refetchUploadQueue,
  } = useGLUploadQueue(10);
  const assignFormatMutation = useAssignFormat();
  const cancelUploadQueueJobMutation = useCancelGLUploadQueueJob();
  const deleteUploadQueueJobMutation = useDeleteGLUploadQueueJob();
  const { activeJobs, removeJob } = useGlobalProgress();
  const uploadQueue = uploadQueueData?.jobs ?? [];

  async function handleCancelQueueJob(jobId: number) {
    setQueueActionError(null);
    setQueueActionMessage(null);
    setCancelingQueueJobId(jobId);
    try {
      const result = await cancelUploadQueueJobMutation.mutateAsync({ jobId });
      setQueueActionMessage(result.message || "Cancel requested.");
      const activeUploadJob = activeJobs.find((job) => String(job.jobId) === String(jobId));
      if (activeUploadJob) {
        removeJob(activeUploadJob.id);
      }
      void refetchUploadQueue();
    } catch (err) {
      setQueueActionError(err instanceof Error ? err.message : "Failed to cancel GL upload");
    } finally {
      setCancelingQueueJobId(null);
    }
  }

  async function handleDeleteQueueJob(jobId: number) {
    setQueueActionError(null);
    setQueueActionMessage(null);
    setDeletingQueueJobId(jobId);
    try {
      const result = await deleteUploadQueueJobMutation.mutateAsync({ jobId });
      setQueueActionMessage(result.message || "GL upload queue item deleted.");
      const activeUploadJob = activeJobs.find((job) => String(job.jobId) === String(jobId));
      if (activeUploadJob) {
        removeJob(activeUploadJob.id);
      }
      void refetchUploadQueue();
    } catch (err) {
      setQueueActionError(err instanceof Error ? err.message : "Failed to delete GL upload");
    } finally {
      setDeletingQueueJobId(null);
    }
  }

  async function handleDeleteQueueJobs(jobIds: number[]) {
    setQueueActionError(null);
    setQueueActionMessage(null);
    setDeletingQueueJobId(jobIds[0]);
    try {
      let lastMessage = "";
      for (const jobId of jobIds) {
        const result = await deleteUploadQueueJobMutation.mutateAsync({ jobId });
        lastMessage = result.message || "GL upload queue items deleted.";
        const activeUploadJob = activeJobs.find((job) => String(job.jobId) === String(jobId));
        if (activeUploadJob) {
          removeJob(activeUploadJob.id);
        }
      }
      setQueueActionMessage(lastMessage);
      void refetchUploadQueue();
    } catch (err) {
      setQueueActionError(err instanceof Error ? err.message : "Failed to delete GL uploads");
    } finally {
      setDeletingQueueJobId(null);
    }
  }

  const companies = useMemo(() => {
    const seen = new Map<number, { id: number; name: string; entity: string | null }>();
    for (const card of cards) {
      if (!seen.has(card.company_id)) {
        seen.set(card.company_id, {
          id: card.company_id,
          name: card.company_name,
          entity: card.entity,
        });
      }
    }
    return Array.from(seen.values());
  }, [cards]);

  const entities = useMemo(() => {
    const values = new Set<string>();
    for (const company of companies) {
      if (company.entity && company.entity.toLowerCase() !== "all") {
        values.add(company.entity);
      } else if (!company.entity) {
        values.add("No Entity");
      }
    }
    return ["all", ...Array.from(values)];
  }, [companies]);

  const filteredCards = useMemo(() => {
    return cards.filter((card) => {
      const matchCompany = companyId === "all" || card.company_id === Number(companyId);
      const matchEntity =
        entityFilter === "all" ||
        (entityFilter === "No Entity" ? !card.entity : card.entity === entityFilter);

      return matchCompany && matchEntity;
    });
  }, [cards, companyId, entityFilter]);

  return (
    <main className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">General Ledger Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            View GL imports and transactions by company, book, and period.
          </p>
        </div>
        {hasPermission("GENERAL_LEDGER_UPLOAD_CREATE") && (
          <Button onClick={() => window.location.assign("/general-ledger/upload")}>
            Upload New GL
          </Button>
        )}
      </header>

      {assignFormatMutation.isError && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {assignFormatMutation.error?.message || "Failed to assign GL format"}
        </section>
      )}

      {queueActionError && (
        <section className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {queueActionError}
        </section>
      )}

      {queueActionMessage && (
        <section className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-400/40 dark:bg-blue-950/40 dark:text-blue-200">
          {queueActionMessage}
        </section>
      )}

      <GLUploadQueuePanel
        jobs={uploadQueue}
        isLoading={isUploadQueueLoading}
        total={uploadQueueData?.total}
        hasMore={Boolean(hasNextUploadQueuePage)}
        isLoadingMore={isFetchingNextUploadQueuePage}
        onLoadMore={() => void fetchNextUploadQueuePage()}
        onRefresh={() => void refetchUploadQueue()}
        onOpenPreview={(token) => {
          window.location.assign(
            `/general-ledger/upload?dry_run_preview_token=${encodeURIComponent(token)}#import-review`
          );
        }}
        onCancelJob={(jobId) => handleCancelQueueJob(jobId)}
        cancelingJobId={cancelingQueueJobId}
        onDeleteJob={(jobId) => handleDeleteQueueJob(jobId)}
        onDeleteJobs={handleDeleteQueueJobs}
        deletingJobId={deletingQueueJobId}
      />

      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <Label>Company</Label>
            <Select value={companyId} onValueChange={setCompanyId}>
              <SelectTrigger>
                <SelectValue placeholder="All Companies" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={String(company.id)} value={String(company.id)}>
                    {company.name} ({company.entity || "No Entity"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Period</Label>
            <Select value={period} onValueChange={(val) => setPeriod(val as PeriodType)}>
              <SelectTrigger>
                <SelectValue placeholder="Select Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Months</SelectLabel>
                  <SelectItem value="january">January</SelectItem>
                  <SelectItem value="february">February</SelectItem>
                  <SelectItem value="march">March</SelectItem>
                  <SelectItem value="april">April</SelectItem>
                  <SelectItem value="may">May</SelectItem>
                  <SelectItem value="june">June</SelectItem>
                  <SelectItem value="july">July</SelectItem>
                  <SelectItem value="august">August</SelectItem>
                  <SelectItem value="september">September</SelectItem>
                  <SelectItem value="october">October</SelectItem>
                  <SelectItem value="november">November</SelectItem>
                  <SelectItem value="december">December</SelectItem>
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>Quarters</SelectLabel>
                  <SelectItem value="q1">Q1</SelectItem>
                  <SelectItem value="q2">Q2</SelectItem>
                  <SelectItem value="q3">Q3</SelectItem>
                  <SelectItem value="q4">Q4</SelectItem>
                </SelectGroup>
                <SelectItem value="year">Year</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Year</Label>
            <Select value={String(year)} onValueChange={(val) => setYear(Number(val))}>
              <SelectTrigger>
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2026">2026</SelectItem>
                <SelectItem value="2027">2027</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Book / Entity</Label>
            <Select value={entityFilter} onValueChange={setEntityFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Books" />
              </SelectTrigger>
              <SelectContent>
                {entities.map((entity) => (
                  <SelectItem key={entity} value={entity}>
                    {entity === "all" ? "All Books" : entity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Companies" value={filteredCards.length} />
        <MetricCard
          label="Imports"
          value={filteredCards.reduce((sum, c) => sum + c.import_count, 0)}
        />
        <MetricCard
          label="GL Lines"
          value={filteredCards.reduce((sum, c) => sum + c.gl_entry_lines, 0)}
        />
        <MetricCard
          label="Bank Lines"
          value={filteredCards.reduce((sum, c) => sum + c.bank_lines, 0)}
        />
      </section>

      {cardsError ? (
        <EmptyState text={cardsError.message || "Failed to load GL cards"} />
      ) : loadingCards ? (
        <EmptyState text="Loading company GL cards..." />
      ) : filteredCards.length === 0 ? (
        <EmptyState text="No GL data found for this company and period." />
      ) : (
        <GLDataTable
          data={filteredCards}
          period={period}
          year={year}
          formats={formats}
          assignFormatMutation={assignFormatMutation}
        />
      )}
    </main>
  );
}

function GLDataTable({
  data,
  period,
  year,
  formats,
  assignFormatMutation,
}: {
  data: CompanyGLCard[];
  period: PeriodType;
  year: number;
  formats: GLExtractionFormat[];
  assignFormatMutation: any;
}) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});

  const columns = useMemo<ColumnDef<CompanyGLCard>[]>(
    () => [
      {
        accessorKey: "company_name",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Company Name
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium">{row.original.company_name}</span>
            <span className="text-xs text-muted-foreground">{row.original.entity || "No Entity"}</span>
          </div>
        ),
      },
      {
        accessorKey: "default_format_name",
        header: "GL Format",
        cell: ({ row }) => (
          <FormatCell
            card={row.original}
            formats={formats}
            isAssigning={assignFormatMutation.isPending && assignFormatMutation.variables?.companyId === row.original.company_id}
            onAssignFormat={(companyId, formatId) => assignFormatMutation.mutate({ companyId, formatId })}
          />
        ),
      },
      {
        accessorKey: "import_count",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Imports
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: "gl_entry_lines",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            GL Lines
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        accessorKey: "bank_lines",
        header: ({ column }) => (
          <Button variant="ghost" className="px-0 font-semibold" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Bank Lines
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        cell: ({ row }) => {
          const card = row.original;
          const hasFormat = card.default_format_id != null;
          return (
            <Button
              variant="outline"
              size="sm"
              disabled={!hasFormat}
              onClick={() =>
                window.location.assign(
                  `/general-ledger/company/${card.company_id}?period=${period}&year=${year}`
                )
              }
            >
              {hasFormat ? "View Transactions" : "Assign format"}
            </Button>
          );
        },
      },
    ],
    [formats, assignFormatMutation, period, year]
  );

  const table = useReactTable({
    data,
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
    <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
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
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-3">
        <DataTablePagination table={table} noun="row(s)" />
      </div>
    </div>
  );
}

function FormatCell({
  card,
  formats,
  isAssigning,
  onAssignFormat,
}: {
  card: CompanyGLCard;
  formats: GLExtractionFormat[];
  isAssigning: boolean;
  onAssignFormat: (companyId: number, formatId: number) => void;
}) {
  const currentFormatId = card.default_format_id == null ? "" : String(card.default_format_id);
  const [selectedFormatId, setSelectedFormatId] = useState<string>(currentFormatId);
  const hasFormat = card.default_format_id != null;
  const canSaveFormat =
    selectedFormatId !== "" && selectedFormatId !== currentFormatId && !isAssigning;

  useEffect(() => {
    setSelectedFormatId(currentFormatId);
  }, [currentFormatId]);

  return (
    <div className="flex items-center gap-2">
      <Select
        value={selectedFormatId || undefined}
        onValueChange={setSelectedFormatId}
        disabled={isAssigning || formats.length === 0}
      >
        <SelectTrigger className="w-[180px] bg-background">
          <SelectValue placeholder="Select a format" />
        </SelectTrigger>
        <SelectContent>
          {formats.map((f) => (
            <SelectItem key={String(f.id)} value={String(f.id)}>
              {f.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="outline"
        disabled={!canSaveFormat}
        onClick={() => onAssignFormat(card.company_id, Number(selectedFormatId))}
      >
        {isAssigning ? "Saving..." : hasFormat ? "Update" : "Assign"}
      </Button>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}
