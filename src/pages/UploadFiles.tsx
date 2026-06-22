import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Archive,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  type ArchivedUpload,
  type UploadType,
  uploadArchiveService,
} from "@/services/uploadArchiveService";

type FilterValue = "all" | UploadType;

export default function UploadFiles() {
  const [files, setFiles] = useState<ArchivedUpload[]>([]);
  const [uploadTypes, setUploadTypes] = useState<
    { value: UploadType; label: string }[]
  >([]);
  const [filter, setFilter] = useState<FilterValue>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<ArchivedUpload | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const totals = useMemo(() => {
    return files.reduce(
      (acc, file) => {
        acc.original += file.original_size;
        acc.compressed += file.compressed_size;
        return acc;
      },
      { original: 0, compressed: 0 }
    );
  }, [files]);

  const filterOptions = useMemo(
    () => [{ value: "all" as const, label: "All" }, ...uploadTypes],
    [uploadTypes]
  );

  const loadFiles = useCallback(async (nextFilter: FilterValue = filter) => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await uploadArchiveService.list(
        nextFilter === "all" ? undefined : nextFilter
      );
      setFiles(data.files);
      setUploadTypes(data.upload_types);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load uploaded files"
      );
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    void loadFiles(filter);
  }, [filter, loadFiles]);

  async function handlePreview(file: ArchivedUpload) {
    setPreviewFile(file);
    setPreviewError(null);
    setPreviewText(null);

    if (!isTextPreview(file)) return;

    setIsPreviewLoading(true);
    try {
      const response = await fetch(uploadArchiveService.viewUrl(file.id));
      if (!response.ok) throw new Error("Failed to load preview");
      setPreviewText(await response.text());
    } catch (err) {
      setPreviewError(
        err instanceof Error ? err.message : "Failed to load preview"
      );
    } finally {
      setIsPreviewLoading(false);
    }
  }

  async function handleDelete(file: ArchivedUpload) {
    const confirmed = window.confirm(`Delete ${file.filename}?`);
    if (!confirmed) return;

    try {
      await uploadArchiveService.remove(file.id);
      await loadFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete file");
    }
  }

  return (
    <main className="space-y-6 p-8">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Upload Files</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-muted-foreground">
            <span>{files.length} files</span>
            <span>Original {formatBytes(totals.original)}</span>
            <span>Stored {formatBytes(totals.compressed)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border bg-muted p-1">
            {filterOptions.map((option) => (
              <Button
                key={option.value}
                type="button"
                variant={filter === option.value ? "default" : "ghost"}
                size="sm"
                className="h-7"
                onClick={() => setFilter(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => void loadFiles()}
            disabled={isLoading}
            title="Refresh uploads"
          >
            <RefreshCw className={isLoading ? "animate-spin" : ""} />
            <span className="sr-only">Refresh uploads</span>
          </Button>
        </div>
      </header>

      {error && (
        <Alert variant="destructive">
          <Archive className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <section className="overflow-hidden rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Context</TableHead>
              <TableHead>Uploaded</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead className="text-right">Stored</TableHead>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="h-28 text-center">
                  Loading uploads...
                </TableCell>
              </TableRow>
            ) : files.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="h-28 text-center text-muted-foreground"
                >
                  No uploads found.
                </TableCell>
              </TableRow>
            ) : (
              files.map((file) => (
                <TableRow key={file.id}>
                  <TableCell className="max-w-[280px]">
                    <div className="flex items-center gap-2">
                      <FileTypeIcon file={file} />
                      <span className="truncate font-medium">
                        {file.filename}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{file.upload_type_label}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[260px] truncate text-muted-foreground">
                    {getContext(file) || "-"}
                  </TableCell>
                  <TableCell>{formatDate(file.stored_at)}</TableCell>
                  <TableCell className="text-right">
                    {formatBytes(file.original_size)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium">
                      {formatBytes(file.compressed_size)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCompression(file.compression_percent)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => void handlePreview(file)}
                        title="View file"
                      >
                        <Eye />
                        <span className="sr-only">View file</span>
                      </Button>

                      <Button
                        asChild
                        variant="ghost"
                        size="icon-sm"
                        title="Download file"
                      >
                        <a href={uploadArchiveService.downloadUrl(file.id)}>
                          <Download />
                          <span className="sr-only">Download file</span>
                        </a>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => void handleDelete(file)}
                        title="Delete file"
                      >
                        <Trash2 />
                        <span className="sr-only">Delete file</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>

      <Dialog
        open={previewFile !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPreviewFile(null);
            setPreviewText(null);
            setPreviewError(null);
          }
        }}
      >
        {previewFile && (
          <DialogContent className="h-[88vh] max-w-[min(1100px,calc(100vw-2rem))] grid-rows-[auto_1fr]">
            <DialogHeader>
              <DialogTitle className="truncate pr-8">
                {previewFile.filename}
              </DialogTitle>
              <DialogDescription>
                {previewFile.upload_type_label} /{" "}
                {formatBytes(previewFile.original_size)}
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 overflow-hidden rounded-lg border bg-background">
              {isPdfPreview(previewFile) ? (
                <iframe
                  src={uploadArchiveService.viewUrl(previewFile.id)}
                  title={previewFile.filename}
                  className="h-full w-full border-0"
                />
              ) : isTextPreview(previewFile) ? (
                <pre className="h-full overflow-auto whitespace-pre-wrap p-4 text-xs">
                  {isPreviewLoading
                    ? "Loading preview..."
                    : previewError || previewText}
                </pre>
              ) : (
                <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
                  Inline preview is not available for this file type.
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </main>
  );
}

function FileTypeIcon({ file }: { file: ArchivedUpload }) {
  if (file.upload_type === "general-ledger") {
    return <FileSpreadsheet className="h-4 w-4 text-emerald-700" />;
  }

  return <FileText className="h-4 w-4 text-sky-700" />;
}

function isPdfPreview(file: ArchivedUpload) {
  return file.content_type === "application/pdf" || file.filename.endsWith(".pdf");
}

function isTextPreview(file: ArchivedUpload) {
  return (
    file.content_type.startsWith("text/") ||
    file.filename.endsWith(".csv") ||
    file.filename.endsWith(".txt")
  );
}

function getContext(file: ArchivedUpload) {
  const values = [
    getMetadataValue(file, "company_name"),
    getMetadataValue(file, "bank_name"),
    getMetadataValue(file, "format_name"),
  ].filter(Boolean);

  return values.join(" / ");
}

function getMetadataValue(file: ArchivedUpload, key: string) {
  const value = file.metadata[key];
  return typeof value === "string" || typeof value === "number"
    ? String(value)
    : null;
}

function formatBytes(bytes: number) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatCompression(percent: number) {
  if (percent > 0) return `${percent}% saved`;
  if (percent < 0) return `${Math.abs(percent)}% larger`;
  return "0% saved";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
