import { useMutation, useQuery } from "@tanstack/react-query";
import { classificationService } from "@/services/classificationService";

export function useXgboostStatus() {
  return useQuery({
    queryKey: ["classification", "xgboost-status"],
    queryFn: classificationService.getXgboostStatus,
    refetchInterval: 30_000,
  });
}

export function useXgboostTree(treeIndex: number | null) {
  return useQuery({
    queryKey: ["classification", "xgboost-tree", treeIndex],
    queryFn: () => classificationService.getXgboostTree(treeIndex as number),
    enabled: treeIndex !== null,
  });
}

export function useXgboostTrainingExamples(accountNumber: string | null) {
  return useQuery({
    queryKey: ["classification", "xgboost-training-examples", accountNumber],
    queryFn: () => classificationService.getTrainingExamples(accountNumber as string),
    enabled: accountNumber !== null,
  });
}

export function useExplainXgboostTransaction() {
  return useMutation({ mutationFn: classificationService.explainTransaction });
}
