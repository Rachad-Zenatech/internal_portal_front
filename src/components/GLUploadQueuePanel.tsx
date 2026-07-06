import type { GLUploadQueueItem } from "@/types/gl";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, X } from "lucide-react";

export function GLUploadQueuePanel({
  jobs,
  isLoading,
  onRefresh,
  onOpenPreview,
  onCancelJob,
  cancelingJobId = null,
  onDeleteJob,
  deletingJobId = null,
}: {
  jobs: GLUploadQueueItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenPreview: (token: string) => void;
  onCancelJob?: (jobId: number) => void;
  cancelingJobId?: number | null;
  onDeleteJob?: (jobId: number) => void;
  deletingJobId?: number | null;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-medium">Server GL Upload Queue</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Backend dry-run parses that continue while you use the site.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={onRefresh}>
            Refresh
          </Button>
        </div>

        {isLoading && jobs.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Loading upload queue...
          </div>
        ) : jobs.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No background GL uploads yet.
          </div>
        ) : (
          <div className="divide-y rounded-md border">
            {jobs.map((job) => (
              <div key={job.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium">
                      {job.filename || `Upload job #${job.id}`}
                    </span>
                    <Badge variant={queueStatusVariant(job.status)}>
                      {queueStatusLabel(job.status)}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {job.company_name ? `${job.company_name} / ` : ""}
                    {job.gl_entry_lines != null
                      ? `${job.gl_entry_lines.toLocaleString("en-US")} rows / `
                      : ""}
                    {job.status === "failed" ? job.error_message || "Failed" : queueProgressText(job)}
                  </div>
                  {shouldShowQueueProgress(job) && (
                    <div
                      className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                      aria-label={`${queueProgressPercent(job)}% complete`}
                    >
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${queueProgressPercent(job)}%` }}
                      />
                    </div>
                  )}
                  <div className="mt-1 text-xs text-muted-foreground">
                    Started {formatQueueDate(job.created_at)}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {job.can_cancel && onCancelJob && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => onCancelJob(job.id)}
                      disabled={cancelingJobId === job.id || job.status === "cancel_requested"}
                      title={
                        job.status === "cancel_requested"
                          ? "Cancel request has been sent"
                          : "Stop this GL upload"
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                      {cancelingJobId === job.id || job.status === "cancel_requested"
                        ? "Canceling..."
                        : "Cancel"}
                    </Button>
                  )}
                  {job.preview_token ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => onOpenPreview(job.preview_token as string)}
                    >
                      Open Preview
                    </Button>
                  ) : (
                    <Button type="button" size="sm" variant="outline" disabled>
                      Preview pending
                    </Button>
                  )}
                  {job.can_delete && onDeleteJob && (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="destructive"
                      onClick={() => onDeleteJob(job.id)}
                      disabled={deletingJobId === job.id}
                      title="Delete this dry-run preview"
                      aria-label="Delete this dry-run preview"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function queueStatusLabel(status: string) {
  if (status === "queued" || status === "queued_local") return "Queued";
  if (status === "processing") return "Backend processing";
  if (status === "cancel_requested") return "Canceling";
  if (status === "canceled") return "Canceled";
  if (status === "discarded") return "Deleted";
  if (status === "completed") return "Ready";
  if (status === "failed") return "Failed";
  return status || "Unknown";
}

function queueStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default";
  if (status === "failed") return "destructive";
  if (status === "processing" || status === "cancel_requested") return "secondary";
  return "outline";
}

function queueProgressPercent(job: GLUploadQueueItem) {
  if (job.status === "completed") return 100;
  return Math.max(0, Math.min(100, Number(job.progress) || 0));
}

function queueProgressText(job: GLUploadQueueItem) {
  if (job.status === "queued" || job.status === "queued_local") return "Waiting for backend worker";
  if (job.status === "cancel_requested") return "Stopping upload...";
  if (job.status === "canceled") return "Upload stopped";
  if (job.status === "processing") {
    const progress = queueProgressPercent(job);
    return progress <= 1 ? "Backend worker starting..." : `${progress}% complete`;
  }
  if (job.status === "completed") return "Ready to open";
  return `${queueProgressPercent(job)}% complete`;
}

function shouldShowQueueProgress(job: GLUploadQueueItem) {
  return job.status === "processing" || job.status === "cancel_requested" || job.status === "completed";
}

function formatQueueDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
