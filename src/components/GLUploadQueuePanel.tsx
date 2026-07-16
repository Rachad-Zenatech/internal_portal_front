import type { GLUploadQueueItem } from "@/types/gl";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, X, ChevronUp, ChevronDown, Play, RefreshCw, Sparkles } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";

export function GLUploadQueuePanel({
  jobs,
  isLoading,
  onRefresh,
  onOpenPreview,
  onCancelJob,
  cancelingJobId = null,
  onDeleteJob,
  onDeleteJobs,
  deletingJobId = null,
  isPreviewLoading = false,
  headerAction,
}: {
  jobs: GLUploadQueueItem[];
  isLoading: boolean;
  onRefresh: () => void;
  onOpenPreview: (token: string) => void;
  onCancelJob?: (jobId: number) => void;
  cancelingJobId?: number | null;
  onDeleteJob?: (jobId: number) => void;
  onDeleteJobs?: (jobIds: number[]) => void;
  deletingJobId?: number | null;
  isPreviewLoading?: boolean;
  headerAction?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [selectedJobIds, setSelectedJobIds] = useState<Set<number>>(new Set());

  const toggleJobSelect = (jobId: number) => {
    const next = new Set(selectedJobIds);
    if (next.has(jobId)) {
      next.delete(jobId);
    } else {
      next.add(jobId);
    }
    setSelectedJobIds(next);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="w-full">
      <Card>
        <CardContent className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="w-9 p-0">
                  {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  <span className="sr-only">Toggle Queue</span>
                </Button>
              </CollapsibleTrigger>
              <div>
                <h2 className="text-base font-medium">Server GL Upload Queue</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Backend dry-run parses that continue while you use the site.
                </p>
              </div>
            </div>
              <div className="flex items-center gap-2">
                {headerAction}
                {selectedJobIds.size > 0 && onDeleteJobs && (
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      onDeleteJobs(Array.from(selectedJobIds));
                      setSelectedJobIds(new Set());
                    }}
                    title="Delete Selected"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete Selected ({selectedJobIds.size})
                  </Button>
                )}
                <Button type="button" variant="outline" size="sm" onClick={onRefresh} title="Refresh queue">
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
          </div>

          <CollapsibleContent>
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
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {onDeleteJobs && job.can_delete && (
                    <Checkbox
                      checked={selectedJobIds.has(job.id)}
                      onCheckedChange={() => toggleJobSelect(job.id)}
                      aria-label={`Select upload job ${job.id}`}
                    />
                  )}
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
                  <div className="mt-2 rounded-md border bg-muted/30 px-2.5 py-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <Sparkles className="h-3.5 w-3.5 text-violet-600" />
                      <span className="font-medium">{aiReviewStatusLabel(job)}</span>
                      {job.ai_review_status && (
                        <Badge variant={aiReviewStatusVariant(job.ai_review_status)}>
                          {aiReviewBadgeLabel(job.ai_review_status)}
                        </Badge>
                      )}
                    </div>
                    {job.ai_review_error_message && (
                      <div className="mt-1 text-xs text-red-600 dark:text-red-300">
                        {job.ai_review_error_message}
                      </div>
                    )}
                    {isAiReviewActive(job.ai_review_status) && (
                      <div
                        className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
                        aria-label={`AI review ${aiReviewProgressPercent(job)}% complete`}
                      >
                        <div
                          className="h-full rounded-full bg-violet-600 transition-all"
                          style={{ width: `${aiReviewProgressPercent(job)}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Started {formatQueueDate(job.created_at)}
                  </div>
                </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {job.can_cancel && onCancelJob && (
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => onCancelJob(job.id)}
                      disabled={cancelingJobId === job.id}
                      className="gap-1 bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                    >
                      <X className="h-3.5 w-3.5" />
                      {cancelingJobId === job.id
                        ? "Canceling..."
                        : job.status === "cancel_requested"
                        ? "Force Cancel"
                        : "Cancel"}
                    </Button>
                  )}
                  {job.preview_token ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => onOpenPreview(job.preview_token as string)}
                        title="Dry-run Preview"
                        disabled={isPreviewLoading}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                  ) : (
                    <Button type="button" size="sm" variant="outline" disabled title="Preview pending">
                      <Play className="h-4 w-4 opacity-50" />
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
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
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

function isAiReviewActive(status?: string | null) {
  return Boolean(
    status && ["queued", "queued_local", "processing", "cancel_requested"].includes(status)
  );
}

function aiReviewProgressPercent(job: GLUploadQueueItem) {
  if (job.ai_review_status === "completed") return 100;
  return Math.max(0, Math.min(100, Number(job.ai_review_progress) || 0));
}

function aiReviewBadgeLabel(status: string) {
  if (status === "queued" || status === "queued_local") return "Queued";
  if (status === "processing") return "Reviewing";
  if (status === "completed") return "Complete";
  if (status === "failed" || status === "failed_to_start") return "Failed";
  if (status === "cancel_requested") return "Stopping";
  return status;
}

function aiReviewStatusVariant(
  status: string
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "completed") return "default";
  if (status === "failed" || status === "failed_to_start") return "destructive";
  if (status === "processing") return "secondary";
  return "outline";
}

function aiReviewStatusLabel(job: GLUploadQueueItem) {
  const status = job.ai_review_status;
  if (!status) {
    if (["queued", "queued_local"].includes(job.status)) {
      return "AI review waits for the upload worker";
    }
    if (["processing", "cancel_requested"].includes(job.status)) {
      return "AI review starts as soon as parsed rows are ready";
    }
    return "AI review is starting";
  }
  if (status === "queued" || status === "queued_local") return "Parsed rows ready; AI review queued";
  if (status === "processing") return `AI reviewing parsed chunks ? ${aiReviewProgressPercent(job)}%`;
  if (status === "completed") return "AI review completed before preview opened";
  if (status === "failed" || status === "failed_to_start") return "AI review could not complete";
  if (status === "cancel_requested") return "AI review is stopping";
  return `AI review: ${status}`;
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
