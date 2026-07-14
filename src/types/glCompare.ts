import type { ImportPreviewRow } from "./gl";

export type GLSplitCompareStatus =
  | "MATCH"
  | "SUSPICIOUS"
  | "NOT_FOUND"
  | "POSSIBLE_MATCH"
  | "AMOUNT_MISMATCH"
  | "ACCOUNT_MISMATCH"
  | "LOW_CONFIDENCE"
  | "SPLIT_TOTAL_MISMATCH";

export interface GLSplitComparisonRow {
  row_number: number;
  date: string | null;
  transaction_type: string | null;
  name: string | null;
  memo: string | null;
  description: string;
  amount: number;
  debit?: number | null;
  credit?: number | null;
  charge_account?: string | null;
  expected_account: string | null;
  dry_run_account: string | null;
  source: string | null;
  confidence: number | null;
  status: GLSplitCompareStatus;
  difference_reason: string | null;
  is_suspicious: boolean;
  
  original_row?: ImportPreviewRow | null;
  expected_rows?: ImportPreviewRow[];
}

export interface AccuracyBySource {
  source: string;
  total: number;
  matched: number;
  match_rate: number;
}

export interface GLSplitComparisonSummary {
  total_rows: number;
  matched_rows: number;
  suspicious_rows: number;
  missing_rows: number;
  account_mismatch_rows: number;
  amount_mismatch_rows: number;
  match_rate: number;
  accuracy_by_source: AccuracyBySource[];
  status_counts: Record<string, number>;
}

export interface GLSplitComparisonResult {
  summary: GLSplitComparisonSummary;
  rows: GLSplitComparisonRow[];
}
