import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { GLService } from "@/services/glService";
import { compareGLSplitResults } from "@/utils/glCompare";
import { Checkbox } from "@/components/ui/checkbox";
import type { GLSplitComparisonResult, GLSplitComparisonRow } from "@/types/glCompare";
import type { CompanyBook, GLAccountSuggestion } from "@/types/gl";
import { toast } from "sonner";
import { Loader2, FileSpreadsheet } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { ColumnDef, SortingState } from "@tanstack/react-table";

interface GLSplitCompareDialogProps {
  books: CompanyBook[];
  bookId?: number | null;
  localPreview?: any; // ImportPreview
  localSuggestions?: GLAccountSuggestion[];
}

export function GLSplitCompareDialog({ books, bookId, localPreview, localSuggestions }: GLSplitCompareDialogProps) {
  const [open, setOpen] = useState(false);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [expectedFile, setExpectedFile] = useState<File | null>(null);
  const [companyBookId, setCompanyBookId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [reviewProgress, setReviewProgress] = useState<number | null>(null);
  const [skipAi, setSkipAi] = useState(false);
  const [result, setResult] = useState<GLSplitComparisonResult | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [tab, setTab] = useState("suspicious");

  const handleCompare = async () => {
    const activeBookId = localPreview ? String(bookId || "") : companyBookId;
    if ((!localPreview && !originalFile) || !expectedFile || !activeBookId) {
      toast.error("Please select a book and both files.");
      return;
    }

    setIsLoading(true);
    setReviewProgress(null);
    setResult(null);

    try {
      let origRows = localPreview?.rows || [];
      if (localPreview && localSuggestions && localSuggestions.length > 0) {
        // Deep copy rows to prevent mutating the original parent state
        origRows = JSON.parse(JSON.stringify(origRows));
        origRows.forEach((row: any, idx: number) => {
          const suggestion = localSuggestions.find(s => s.row_number === idx + 1);
          if (suggestion) {
            row.account_review = {
              status: "predicted",
              source: suggestion.review_source || "unknown",
              categorized: true,
              target_field: suggestion.target_field || "split_account",
              current_target_account_number: null,
              current_target_account_name: null,
              suggested_account_number: suggestion.suggested_split_account_number || suggestion.suggested_account_number,
              suggested_account_name: suggestion.suggested_split_account_name || suggestion.suggested_account_name,
              suggested_payee: null,
              suggested_memo: null,
              confidence: suggestion.confidence,
              requires_ai_review: false,
              requires_human_review: suggestion.requires_manual_review,
              reason: suggestion.reason,
              matched_rule: (suggestion as any).rule || null,
              applied_actions: [],
              xgboost_candidate: null,
              ai_context: null,
              is_bank_transaction: row.account_review?.is_bank_transaction ?? row.is_bank_transaction ?? false,
            };
          }
        });
      }
      let origRes: any = null;

      // 1. Parse Original File (if no localPreview)
      if (!localPreview) {
        origRes = await GLService.parseImport({
          companyBookId: Number(activeBookId),
          file: originalFile!,
          dryRun: true,
        });
        origRows = origRes.preview?.rows || [];
      }

      // 2. Parse Expected File
      const expRes = await GLService.parseImport({
        companyBookId: Number(activeBookId),
        file: expectedFile,
        dryRun: true,
      });

      const expRows = expRes.preview?.rows || [];

      if (!origRows.length || !expRows.length) {
        toast.error("One of the files contained no parsable rows.");
        setIsLoading(false);
        return;
      }

      // 3. Run Dry-Run Account Suggestions (XGBoost/Rules/AI) on Original File if we don't have localPreview
      if (!localPreview && origRes) {
        const origToken = origRes.dry_run_preview_token || origRes.preview?.pagination?.preview_token;
        if (origToken) {
          const formatCode = books.find(b => String(b.book_id) === activeBookId)?.format_code || "";
          const queued = await GLService.queueAccountSuggestions({
            previewToken: origToken,
            companyId: origRes.summary.company_id,
            formatCode,
            includeAll: true,
            useAi: !skipAi, // Toggle AI review based on checkbox
          });

          const jobId = queued.backgroundJobId ?? queued.jobId;
          if (jobId) {
            while (true) {
              const job = await GLService.getAccountSuggestionsJob(jobId);
              if (job.progress !== undefined && job.progress !== null) {
                setReviewProgress(job.progress);
              }
              if (job.status === "completed") {
                const suggestions = job.result?.suggestions || [];
                // Map suggestions back to origRows
                origRows.forEach((row: any, idx: number) => {
                  const suggestion = suggestions.find(s => s.row_number === idx + 1);
                  if (suggestion) {
                    row.account_review = {
                      status: "predicted",
                      source: suggestion.review_source || "unknown",
                      categorized: true,
                      target_field: suggestion.target_field || "split_account",
                      current_target_account_number: null,
                      current_target_account_name: null,
                      suggested_account_number: suggestion.suggested_split_account_number || suggestion.suggested_account_number,
                      suggested_account_name: suggestion.suggested_split_account_name || suggestion.suggested_account_name,
                      suggested_payee: null,
                      suggested_memo: null,
                      confidence: suggestion.confidence,
                      requires_ai_review: false,
                      requires_human_review: suggestion.requires_manual_review,
                      reason: suggestion.reason,
                      matched_rule: (suggestion as any).rule || null,
                      applied_actions: [],
                      xgboost_candidate: null,
                      ai_context: null,
                      is_bank_transaction: row.account_review?.is_bank_transaction ?? row.is_bank_transaction ?? false,
                    };
                  }
                });
                break;
              } else if (["failed", "cancel_requested", "canceled", "discarded"].includes(job.status)) {
                toast.error(job.error?.message || "Account review failed, continuing with basic parsing...");
                break;
              }
              await new Promise(r => setTimeout(r, 2000));
            }
          }
        }
      }

      // 4. Compare Results
      const comparison = compareGLSplitResults(origRows, expRows);
      setResult(comparison);
      toast.success("Comparison complete.");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to parse files.");
    } finally {
      setIsLoading(false);
    }
  };

  const columns = useMemo<ColumnDef<GLSplitComparisonRow>[]>(() => [
    { accessorKey: "row_number", header: "Row #" },
    { accessorKey: "expected_row_number", header: "Expected Row #", cell: ({ row }) => row.original.expected_rows?.map((r: any) => r._excel_row).filter(Boolean).join(", ") || "-" },
    { accessorKey: "date", header: "Date" },
    { accessorKey: "transaction_type", header: "Type" },
    { accessorKey: "name", header: "Name" },
    { accessorKey: "memo", header: "Memo", cell: ({ row }) => <div className="max-w-[200px] whitespace-normal break-words">{row.original.memo}</div> },
    { accessorKey: "amount", header: "Amount", cell: ({ row }) => row.original.amount.toFixed(2) },
    { accessorKey: "expected_account", header: "Expected Account" },
    { accessorKey: "dry_run_account", header: "Dry-Run Account" },
    { accessorKey: "source", header: "Applied By", cell: ({ row }) => <span className="capitalize">{String(row.original.source || "unknown").replace(/_/g, " ")}</span> },
    { accessorKey: "confidence", header: "Confidence", cell: ({ row }) => row.original.confidence ? (row.original.confidence * 100).toFixed(1) + "%" : "-" },
    { accessorKey: "status", header: "Status", cell: ({ row }) => (
        <span className={`font-semibold ${
          row.original.status === "MATCH" ? "text-green-600" :
          row.original.is_suspicious ? "text-red-600" : "text-yellow-600"
        }`}>
          {row.original.status}
        </span>
      )
    },
    { accessorKey: "difference_reason", header: "Reason", cell: ({ row }) => <div className="text-xs max-w-[250px] truncate" title={row.original.difference_reason || ""}>{row.original.difference_reason}</div> },
  ], []);

  const data = useMemo(() => {
    if (!result) return [];
    if (tab === "suspicious") return result.rows.filter((r) => r.is_suspicious);
    return result.rows;
  }, [result, tab]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const handleExportCSV = () => {
    if (!result) return;
    const headers = [
      "Row #", "Expected Row #", "Date", "Type", "Name", "Memo", "Amount", "Expected Account",
      "Dry-Run Account", "Applied By", "Confidence", "Status", "Difference Reason"
    ];

    const rows = result.rows.map(r => [
      r.row_number,
      `"${(r.expected_rows?.map((exp: any) => exp._excel_row).filter(Boolean).join(", ") || "-")}"`,
      r.date || "",
      r.transaction_type || "",
      `"${(r.name || "").replace(/"/g, '""')}"`,
      `"${(r.memo || "").replace(/"/g, '""')}"`,
      r.amount.toFixed(2),
      `"${(r.expected_account || "").replace(/"/g, '""')}"`,
      `"${(r.dry_run_account || "").replace(/"/g, '""')}"`,
      r.source || "",
      r.confidence !== null ? (r.confidence * 100).toFixed(1) + "%" : "",
      r.status,
      `"${(r.difference_reason || "").replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "GL_Comparison_Result.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileSpreadsheet className="h-4 w-4" />
          Compare Split
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-[95vw] max-h-[90vh] overflow-hidden flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl">Compare General Ledger Split Results</DialogTitle>
          <DialogDescription>
            Compare an Original GL file (without splits) against an Expected GL file (with splits).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-4 flex-shrink-0">
          {!localPreview && (
            <>
              <div className="space-y-2 min-w-0">
                <Label className="truncate block">Company Book</Label>
                <Select value={companyBookId} onValueChange={setCompanyBookId}>
                  <SelectTrigger className="w-full truncate">
                    <SelectValue placeholder="Select Book..." />
                  </SelectTrigger>
                  <SelectContent>
                    {books.map((b) => (
                      <SelectItem key={b.book_id} value={String(b.book_id)}>
                        {b.company_name} - {b.book_name} ({b.format_name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 min-w-0">
                <Label className="truncate block">Original GL File (No Splits)</Label>
                <Input type="file" accept=".csv,.xlsx,.xls" className="w-full truncate" onChange={(e) => setOriginalFile(e.target.files?.[0] || null)} />
              </div>
            </>
          )}
          <div className="space-y-2 min-w-0">
            <Label className="truncate block">Expected GL File (With Splits)</Label>
            <Input type="file" accept=".csv,.xlsx,.xls" className="w-full truncate" onChange={(e) => setExpectedFile(e.target.files?.[0] || null)} />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b flex-shrink-0">
          <div className="flex items-center gap-4">
            <Button onClick={handleCompare} disabled={(!localPreview && (!originalFile || !companyBookId)) || !expectedFile || isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Run Comparison
            </Button>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="skipAi" checked={skipAi} onCheckedChange={(checked) => setSkipAi(!!checked)} />
            <label htmlFor="skipAi" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Skip AI Review (Fast XGBoost/Rules only)
            </label>
          </div>
        </div>

        {isLoading && (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-500">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p>
              {reviewProgress !== null && reviewProgress < 100
                ? `Running Review (${reviewProgress}%)...`
                : "Parsing files and running split comparison..."}
            </p>
          </div>
        )}

        {!isLoading && result && (
          <div className="flex-1 overflow-hidden flex flex-col mt-4">
            <Tabs value={tab} onValueChange={setTab} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between">
                <TabsList>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="suspicious">Suspicious Rows ({result.summary.suspicious_rows})</TabsTrigger>
                  <TabsTrigger value="all">All Rows ({result.summary.total_rows})</TabsTrigger>
                </TabsList>
                <Button onClick={handleExportCSV} variant="outline" size="sm" className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Export to CSV
                </Button>
              </div>
              
              <TabsContent value="summary" className="p-4 flex-1 overflow-auto">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <Card><CardContent className="p-6 text-center"><div className="text-sm text-slate-500">Total Rows</div><div className="text-3xl font-bold">{result.summary.total_rows}</div></CardContent></Card>
                  <Card><CardContent className="p-6 text-center"><div className="text-sm text-slate-500">Matched Rows</div><div className="text-3xl font-bold text-green-600">{result.summary.matched_rows}</div></CardContent></Card>
                  <Card><CardContent className="p-6 text-center"><div className="text-sm text-slate-500">Suspicious Rows</div><div className="text-3xl font-bold text-red-600">{result.summary.suspicious_rows}</div></CardContent></Card>
                </div>

                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Status Breakdown Table */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Rows by Match Status</h3>
                    <div className="border rounded-md">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Count</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(result.summary.status_counts).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                            <TableRow key={status}>
                              <TableCell className="font-medium">{status.replace(/_/g, " ")}</TableCell>
                              <TableCell className="text-right">{count}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  {/* Accuracy by Source Table */}
                  {result.summary.accuracy_by_source && result.summary.accuracy_by_source.length > 0 && (
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Accuracy by Workflow Stage</h3>
                      <div className="border rounded-md">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Stage (Source)</TableHead>
                              <TableHead className="text-right">Total</TableHead>
                              <TableHead className="text-right">Matches</TableHead>
                              <TableHead className="text-right">Accuracy</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {result.summary.accuracy_by_source.map((acc) => (
                              <TableRow key={acc.source}>
                                <TableCell className="font-medium">{acc.source || "Unknown"}</TableCell>
                                <TableCell className="text-right">{acc.total}</TableCell>
                                <TableCell className="text-right text-green-600 font-medium">{acc.matched}</TableCell>
                                <TableCell className="text-right">{acc.match_rate.toFixed(1)}%</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {(tab === "all" || tab === "suspicious") && (
                <TabsContent value={tab} className="flex-1 flex flex-col overflow-hidden m-0 p-0">
                  <div className="flex-1 overflow-auto border rounded-md mt-4">
                    <Table>
                      <TableHeader>
                        {table.getHeaderGroups().map((headerGroup) => (
                          <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <TableHead key={header.id}>
                                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                              </TableHead>
                            ))}
                          </TableRow>
                        ))}
                      </TableHeader>
                      <TableBody>
                        {table.getRowModel().rows?.length ? (
                          table.getRowModel().rows.map((row) => (
                            <TableRow key={row.id} className={row.original.is_suspicious ? "bg-red-50/50 dark:bg-red-950/20" : "bg-green-50/50 dark:bg-green-950/20"}>
                              {row.getVisibleCells().map((cell) => (
                                <TableCell key={cell.id} className="py-2">
                                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                </TableCell>
                              ))}
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={columns.length} className="h-24 text-center">No results.</TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-3 mt-2">
                    <DataTablePagination table={table} noun="row(s)" />
                  </div>
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
