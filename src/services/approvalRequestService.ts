// src/services/approvalRequestService.ts
import type { ApprovalRequests } from "../types/approval";
import { apiClient } from "./apiClient";

export const getPendingApprovals = async () => {
  return apiClient.get<ApprovalRequests>(`/approval/pending`);
};

export const approveRequest = async (id: string) => {
  return apiClient.post<any>(`/approval/${id}/approve`);
};