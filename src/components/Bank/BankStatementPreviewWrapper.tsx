import { useEffect, useState } from "react";
import { toast } from "sonner";
import { apiClient } from "@/services/apiClient";
import type { StatementPreview } from "@/types/bank";
import StatementPreviewReview from "./StatementPreviewReview";
import { Skeleton } from "@/components/ui/skeleton";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  statementId: string;
  onBack: () => void;
}

export default function BankStatementPreviewWrapper({ statementId, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [previews, setPreviews] = useState<StatementPreview[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    async function fetchPreview() {
      try {
        const data = await apiClient.get<any>(`/api/bank-statements/${statementId}`);
        if (data && data.extracted_data) {
          const parsed = typeof data.extracted_data === 'string' 
            ? JSON.parse(data.extracted_data) 
            : data.extracted_data;
          setPreviews(Array.isArray(parsed) ? parsed : [parsed]);
        } else {
          toast.error("No extracted data found for this statement.");
          onBack();
        }
      } catch (err) {
        toast.error("Failed to load preview");
        onBack();
      } finally {
        setLoading(false);
      }
    }
    fetchPreview();
  }, [statementId, onBack]);

  async function handleConfirm(approvedPreviews: StatementPreview[]) {
    try {
      await apiClient.post(`/api/bank-statements/${statementId}/save`, { previews: approvedPreviews });
      toast.success("Statement saved successfully!");
      // Refetch both finalized statements and queue
      queryClient.invalidateQueries({ queryKey: ["statements"] });
      queryClient.invalidateQueries({ queryKey: ["bankStatementQueue"] });
      onBack();
    } catch (err) {
      toast.error("Failed to save statement");
    }
  }

  async function handleCancel() {
    onBack();
  }

  if (loading) {
    return (
      <div className="space-y-4 p-4 animate-pulse">
        <Skeleton className="h-8 w-24 rounded-lg" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-12 w-96 rounded-xl" />
      </div>
    );
  }

  return (
    <StatementPreviewReview 
      previews={previews}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  );
}
