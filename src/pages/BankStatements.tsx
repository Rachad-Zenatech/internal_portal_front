import { useState } from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import StatementList   from "@/components/Bank/StatementList";
import StatementDetail from "@/components/Bank/StatementDetail";
import SummaryPage     from "@/components/Bank/Summary";
import UploadStatement from "@/components/Bank/UploadStatement";
import { useGlobalProgress } from "@/lib/GlobalProgressContext";
import { BankStatementQueuePanel } from "@/components/Bank/BankStatementQueuePanel";
import BankStatementPreviewWrapper from "@/components/Bank/BankStatementPreviewWrapper";
import { useBankStatementQueue, useCancelBankStatementQueueJob, useDeleteBankStatementQueueJob } from "@/hooks/useBank";

export default function BankStatements() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab,  setActiveTab]  = useState<string>("statements");
  
  // Drawer and Upload State
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const { addJob } = useGlobalProgress();

  const { data: queueData, isLoading: isQueueLoading, refetch: refetchQueue } = useBankStatementQueue(10);
  const queueJobs = queueData?.jobs ?? [];
  const cancelQueueJobMutation = useCancelBankStatementQueueJob();
  const deleteQueueJobMutation = useDeleteBankStatementQueueJob();
  const [cancelingQueueJobId, setCancelingQueueJobId] = useState<number | null>(null);
  const [deletingQueueJobId, setDeletingQueueJobId] = useState<number | null>(null);

  async function handleCancelQueueJob(jobId: number) {
    setCancelingQueueJobId(jobId);
    try {
      await cancelQueueJobMutation.mutateAsync({ jobId });
      toast.success("Upload canceled");
      void refetchQueue();
    } catch (err) {
      toast.error("Failed to cancel upload");
    } finally {
      setCancelingQueueJobId(null);
    }
  }

  async function handleDeleteQueueJob(jobId: number) {
    setDeletingQueueJobId(jobId);
    try {
      await deleteQueueJobMutation.mutateAsync({ jobId });
      toast.success("Upload removed from queue");
      void refetchQueue();
    } catch (err) {
      toast.error("Failed to delete upload from queue");
    } finally {
      setDeletingQueueJobId(null);
    }
  }

  function handleOpenPreview(token: string) {
    setIsDrawerOpen(false);
    setActiveTab('statements');
    setSelectedId(token);
  }

  function handleTabChange(value: string) {
    setActiveTab(value);
    setSelectedId(null);
  }

  function handleUploadStart(file: File, promise: Promise<any>) {
    addJob(file.name, promise, { description: "Processing Bank Statement...", type: "document" });
    setIsDrawerOpen(false); // Close drawer immediately

    promise.then(() => {
      toast.success("Bank statement uploaded", {
        description: `Successfully uploaded ${file.name}. It is now processing in the background.`,
      });
      void refetchQueue();
    }).catch((err) => {
      toast.error("Upload failed", {
        description: err instanceof Error ? err.message : "Failed to start upload process",
      });
    });
  }

  return (
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Bank Statements</h1>
          <p className="text-muted-foreground mt-1">
            Upload bank statements, review the extracted data, and confirm before
            saving to the database.
          </p>
        </div>
        <Button onClick={() => setIsDrawerOpen(true)} className="gap-2 font-bold shadow-sm">
          <Upload className="h-4 w-4" />
          Upload Statement
        </Button>
      </div>

      <div className="flex mb-6 gap-2">
        <button
          onClick={() => handleTabChange('statements')}
          className={`relative px-6 py-3 text-sm font-semibold transition-colors duration-200 focus:outline-none
            ${activeTab === 'statements'
              ? 'text-primary after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Statements
        </button>
        <button
          onClick={() => handleTabChange('summary')}
          className={`relative px-6 py-3 text-sm font-semibold transition-colors duration-200 focus:outline-none
            ${activeTab === 'summary'
              ? 'text-primary after:absolute after:bottom-0 after:left-0 after:w-full after:h-0.5 after:bg-primary'
              : 'text-muted-foreground hover:text-foreground'
            }`}
        >
          Summary
        </button>
      </div>

      {activeTab === 'statements' && (
        <div className="mt-0 outline-none transition-all duration-300 animate-in fade-in-30 slide-in-from-bottom-2">
          {queueJobs.length > 0 && (
            <div className="mb-6">
              <BankStatementQueuePanel
                jobs={queueJobs}
                isLoading={isQueueLoading}
                onRefresh={refetchQueue}
                onOpenPreview={handleOpenPreview}
                onCancelJob={handleCancelQueueJob}
                cancelingJobId={cancelingQueueJobId}
                onDeleteJob={handleDeleteQueueJob}
                deletingJobId={deletingQueueJobId}
              />
            </div>
          )}
          {selectedId == null ? (
            <StatementList onSelect={setSelectedId} />
          ) : selectedId.length > 20 ? (
            <BankStatementPreviewWrapper
              statementId={selectedId}
              onBack={() => setSelectedId(null)}
            />
          ) : (
            <StatementDetail
              statementId={selectedId}
              onBack={() => setSelectedId(null)}
            />
          )}
        </div>
      )}

      {activeTab === 'summary' && (
        <div className="mt-0 outline-none transition-all duration-300 animate-in fade-in-30 slide-in-from-bottom-2">
          <SummaryPage />
        </div>
      )}

      {/* Right-side Drawer for Uploading */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-md md:max-w-lg overflow-y-auto border-l shadow-2xl sm:p-8">
          <SheetHeader className="mb-8 border-b pb-6">
            <SheetTitle className="text-2xl font-bold">Upload Statement</SheetTitle>
            <SheetDescription>
              Select a target company and statement account, then deploy the document pipeline tracker.
            </SheetDescription>
          </SheetHeader>
          
          <UploadStatement onUploadStart={handleUploadStart} isUploading={false} />
        </SheetContent>
      </Sheet>
    </div>
  );
}
