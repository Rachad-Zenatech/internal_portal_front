// src/types/approval.ts

export interface ApprovalRequest {
  id: string;

  vendor: string;

  amount: number;

  description: string;

  predicted_account: string;

  confidence: number;

  status: string;

  auto_approved: boolean;

  review_required: boolean;

  created_at: string;

  approved_at: string | null;

  approved_by: string | null;

  approved_account: string | null;
}

export interface ApprovalRequests {
  message: string;

  pending_count: number;

  approvals: ApprovalRequest[];
}