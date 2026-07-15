import { apiClient } from "./apiClient";
import type { XgboostModelStatus, XgboostModelTree, XgboostTrainingExamples, XgboostTransactionExplanation, XgboostTransactionInput } from "@/types/classification";

export const classificationService = {
  getXgboostStatus: () => apiClient.get<XgboostModelStatus>("/classification/status"),
  getXgboostTree: (treeIndex: number) => apiClient.get<XgboostModelTree>(`/classification/tree/${treeIndex}`),
  getTrainingExamples: (accountNumber: string) => apiClient.get<XgboostTrainingExamples>(`/classification/training-examples/${encodeURIComponent(accountNumber)}?limit=50`),
  explainTransaction: (input: XgboostTransactionInput) => apiClient.post<XgboostTransactionExplanation>("/classification/explain", input),
};
