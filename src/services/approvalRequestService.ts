// src/services/approvalRequestService.ts

import type {
  ApprovalRequest,
  ApprovalRequests,
} from "../types/approval";

export const getPendingApprovals =
  async () => {
    return fetch(
      `${import.meta.env.VITE_API_BASE_URL}/approval/pending`
    ).then(
      (res) =>
        res.json() as Promise<ApprovalRequests>
    );
  };

export const approveRequest =
  async (id: string) => {
    return fetch(
      `${import.meta.env.VITE_API_BASE_URL}/approval/${id}/approve`,
      {
        method: "POST",
      }
    ).then((res) => res.json());
  };