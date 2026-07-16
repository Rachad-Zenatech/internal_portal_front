import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, BASE_URL } from "@/services/apiClient";

import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, FileText, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import StatementPreviewReview from "@/components/Bank/StatementPreviewReview";
import { useCommitStatement } from "@/hooks/useBank";
import type { StatementPreview } from "@/types/bank";
import { toast } from "sonner";

interface BankStatement {
  id: string;
  user_id: number;
  file_url: string;
  file_name: string;
  processing_status: "uploaded" | "queued" | "extracting" | "ready" | "failed";
  extracted_text: string | null;
  extracted_data: any | null;
  error_message: string | null;
  created_at: string;
}

function useBankStatement(id: string) {
  return useQuery({
    queryKey: ["bank-statement", id],
    queryFn: () => apiClient.get<BankStatement>(`/api/bank-statements/${id}`),
    retry: 0, // Do not retry on 404
    refetchInterval: (query) => {
      // Poll every 2 seconds if still processing
      const status = query.state.data?.processing_status;
      if (status === "uploaded" || status === "queued" || status === "extracting") {
        return 2000;
      }
      return false;
    }
  });
}

export default function BankStatementPreview() {
  const { bankStatementId } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: statement, isLoading, error } = useBankStatement(bankStatementId!);
  const commitMut = useCommitStatement();
  
  const isSavedOrCanceledRef = useRef(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      setTimeout(() => {
        if (!isMountedRef.current && !isSavedOrCanceledRef.current && bankStatementId) {
          // Send a delete request when leaving ungracefully
          fetch(`${BASE_URL}/api/bank-statements/${bankStatementId}`, {
            method: 'DELETE',
            keepalive: true,
            credentials: 'include',
          }).catch(() => {});
          
          // Remove from local cache so user can't navigate back and see stale data
          qc.removeQueries({ queryKey: ["bank-statement", bankStatementId] });
        }
      }, 100);
    };
  }, [bankStatementId, qc]);

  useEffect(() => {
    if (statement?.file_name) {
      document.dispatchEvent(new CustomEvent("set-breadcrumb-title", {
        detail: { path: `/bank-statements/${statement.id}`, title: statement.file_name }
      }));
      document.dispatchEvent(new CustomEvent("set-breadcrumb-title", {
        detail: { path: `/bank-statements/${statement.id}/preview`, title: "Preview" }
      }));
    }
  }, [statement?.file_name, statement?.id]);

  async function handleConfirm(editedPreviews: StatementPreview[]) {
    try {
      isSavedOrCanceledRef.current = true;
      const stmts = await commitMut.mutateAsync(editedPreviews);
      toast.success("Statements added to the database", {
        description: `Successfully added ${stmts.length} statements.`,
      });
      navigate('/bank-statements');
    } catch (err) {
      isSavedOrCanceledRef.current = false;
      toast.error("Failed to add statements", {
        description: (err as Error).message,
      });
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <h3 className="text-xl font-semibold">Loading statement details...</h3>
      </div>
    );
  }

  if (error || !statement) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Alert variant="destructive" className="rounded-xl">
          <AlertCircle className="h-5 w-5" />
          <AlertTitle className="text-lg">Error</AlertTitle>
          <AlertDescription>
            Could not load the bank statement. It may have been deleted or there is a network issue.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate(-1)} className="mt-4" variant="outline">
          Go Back
        </Button>
      </div>
    );
  }

  const renderStatus = () => {
    switch (statement.processing_status) {
      case "queued":
      case "uploaded":
        return (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-muted/20 rounded-xl border border-dashed border-border/60">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Queued for Processing</h3>
            <p className="text-muted-foreground max-w-sm">
              Your bank statement is queued for processing. You will receive a notification when it’s ready.
            </p>
          </div>
        );
      case "extracting":
        return (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-blue-50/50 dark:bg-blue-900/10 rounded-xl border border-dashed border-blue-200 dark:border-blue-800">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin mb-4" />
            <h3 className="text-xl font-semibold text-blue-700 dark:text-blue-400 mb-2">Extracting your bank statement...</h3>
            <p className="text-blue-600/80 dark:text-blue-400/80 max-w-sm">
              Our OCR engine is currently reading the document. This usually takes a few moments.
            </p>
          </div>
        );
      case "ready": {
        let previews: StatementPreview[] = [];
        try {
          previews = typeof statement.extracted_data === 'string' 
            ? JSON.parse(statement.extracted_data) 
            : statement.extracted_data;
          
          if (!Array.isArray(previews)) {
            previews = [previews];
          }
        } catch(e) {
          console.error("Failed to parse extracted data", e);
        }
        
        return (
          <div className="flex flex-col h-[calc(100vh-120px)] space-y-6 min-h-0">
            <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl shrink-0">
              <CheckCircle2 className="h-6 w-6 shrink-0" />
              <div>
                <p className="font-medium text-emerald-800 dark:text-emerald-400">Extraction Complete</p>
                <p className="text-sm opacity-90 text-emerald-700 dark:text-emerald-500">The document was successfully parsed. Please review the details below before saving.</p>
              </div>
            </div>
            
            <div className="flex-1 min-h-0 flex flex-col pb-6">
              <StatementPreviewReview 
                previews={previews} 
                pdfUrl={statement.file_url ? (statement.file_url.startsWith("http") ? statement.file_url : BASE_URL + statement.file_url) : undefined}
                onCancel={() => navigate('/bank-statements')}
                onConfirm={handleConfirm}
              />
            </div>
          </div>
        );
      }
      case "failed":
        return (
          <div className="flex flex-col items-center justify-center p-12 text-center bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-800">
            <div className="h-16 w-16 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h3 className="text-xl font-semibold text-red-700 dark:text-red-400 mb-2">Extraction failed</h3>
            <p className="text-red-600/80 dark:text-red-400/80 max-w-sm mb-6">
              {statement.error_message || "We couldn’t extract this bank statement. Please try again."}
            </p>
            <Button variant="outline" className="border-red-200 hover:bg-red-100 text-red-700" onClick={() => navigate('/bank')}>
              Return to Bank
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <FileText className="h-8 w-8 text-blue-500" />
            Statement Preview
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            {statement.file_name}
          </p>
        </div>
      </div>
      
      {renderStatus()}
    </div>
  );
}
