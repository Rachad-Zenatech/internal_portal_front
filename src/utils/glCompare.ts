import type { ImportPreviewRow } from "@/types/gl";
import type { GLSplitComparisonResult, GLSplitComparisonRow, GLSplitCompareStatus, GLSplitComparisonSummary } from "@/types/glCompare";

function normalizeText(text?: string | null): string {
  return (text || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

const WORKFLOW_LABELS = {
  LOOKUP: "1-to-1 Mappings (Lookups)",
  QB_RULES: "QuickBooks Rules (from the approved rules cache)",
  BANK_RULES: "Bank Transfer",
  XGBOOST: "XGBoost Machine Learning Predictions",
  AI: "AI Review (strictly for the 1000-1099 bank/credit card scope)",
  MANUAL: "Manual Fallback",
} as const;

function getFriendlyLabel(source: string | null, matchedRule: unknown): string {
  if (!source) return WORKFLOW_LABELS.MANUAL;
  
  const src = source.toLowerCase();
  if (src.includes("lookup")) return WORKFLOW_LABELS.LOOKUP;
  if (src.includes("xgboost")) return WORKFLOW_LABELS.XGBOOST;
  if (src.includes("ai")) return WORKFLOW_LABELS.AI;

  if (
    src.includes("internal bank") ||
    src.includes("bank rule") ||
    src.includes("bank feed") ||
    src.includes("bank_transfer")
  ) {
    return WORKFLOW_LABELS.BANK_RULES;
  }

  if (src.includes("rule")) {
    let ruleStr = "";
    if (typeof matchedRule === "string") {
      ruleStr = matchedRule.toLowerCase();
    } else if (matchedRule && typeof matchedRule === "object") {
      ruleStr = JSON.stringify(matchedRule).toLowerCase();
    }
    
    if (ruleStr.includes("bank_transfer") || ruleStr.includes("bank_service_charge") || ruleStr.includes("internal_bank")) {
      return WORKFLOW_LABELS.BANK_RULES;
    }
    return WORKFLOW_LABELS.QB_RULES;
  }
  return WORKFLOW_LABELS.MANUAL;
}

function getAmount(row: ImportPreviewRow): number {
  return (row.debit || 0) - (row.credit || 0);
}

export function isBankOrCreditCard(row: ImportPreviewRow): boolean {
  if (typeof row.is_bank_line === "boolean") {
    return row.is_bank_line;
  }

  const code = (row.account_number || "").trim();
  const numericStr = code.replace(/\D/g, "");
  if (numericStr) {
    const num = parseInt(numericStr, 10);
    if (num >= 1000 && num <= 1099) return true;
    const strNum = num.toString();
    if (strNum.startsWith("10") && strNum.length >= 4) {
      const prefix = parseInt(strNum.substring(0, 4), 10);
      if (prefix >= 1000 && prefix <= 1099) return true;
    }
  }

  // Check account type if it exists in the raw data
  const type = ((row as ImportPreviewRow & { account_type?: string }).account_type || "").toLowerCase();
  if (type === "bank" || type === "creditcard" || type === "credit card") {
    return true;
  }

  // Fallback to checking account_name for keywords, but exclude common expense keywords
  const name = (row.account_name || "").toLowerCase();
  const hasBankKeyword = /\b(bank|checking|savings|cash|credit\s*card|visa|mastercard|amex|discover)\b/.test(name);
  const hasExpenseKeyword = /\b(fee|fees|charge|charges|interest|expense|payable)\b/.test(name);
  
  if (hasBankKeyword && !hasExpenseKeyword) {
    return true;
  }
  
  return false;
}

export function compareGLSplitResults(
  originalRowsAll: ImportPreviewRow[],
  expectedRowsAll: ImportPreviewRow[],
  confidenceThreshold: number = 0.75
): GLSplitComparisonResult {
  const originalRowsWithLine = originalRowsAll.map((r, i) => ({ ...r, _excel_row: i + 1 }));
  const originalRows = originalRowsWithLine.filter(isBankOrCreditCard);
  const expectedRowsWithLine = expectedRowsAll.map((r, i) => ({ ...r, _excel_row: i + 1 }));
  const unmatchedExpected = [...expectedRowsWithLine]; // Keep all rows for matching splits

  const summary: GLSplitComparisonSummary = {
    total_rows: originalRows.length,
    matched_rows: 0,
    suspicious_rows: 0,
    missing_rows: 0,
    account_mismatch_rows: 0,
    amount_mismatch_rows: 0,
    match_rate: 0,
    status_counts: {},
    accuracy_by_source: [],
  };

  const results: GLSplitComparisonRow[] = [];

  originalRows.forEach((origRow) => {
    const origAmount = getAmount(origRow);
    const origDate = origRow.date;
    const origNormName = normalizeText(origRow.name);
    
    // First try: Match by transaction number
    let matchedExpRows: (ImportPreviewRow & { _excel_row: number })[] = [];
    let matchedSameLines: (ImportPreviewRow & { _excel_row: number })[] = [];

    if (origRow.transaction_number) {
      const sameTxn = unmatchedExpected.filter(e => e.transaction_number === origRow.transaction_number);
      if (sameTxn.length > 0) {
        const origSign = Math.sign(origAmount) || 1;
        const oppositeLines = sameTxn.filter(e => Math.sign(getAmount(e)) !== origSign && getAmount(e) !== 0);
        const sameLines = sameTxn.filter(e => Math.sign(getAmount(e)) === origSign || getAmount(e) === 0);
        
        if (oppositeLines.length > 0) {
          // The opposite lines represent the actual target accounts (splits)
          matchedExpRows = oppositeLines;
          matchedSameLines = sameLines; // We will remove these from unmatched so they don't show as NOT FOUND
        } else if (sameLines.length > 0) {
          matchedExpRows = [sameLines[0]];
        }
      }
    }

    const extractSplitsFromExpectedBankLine = (expectedBankLine: ImportPreviewRow & { _excel_row: number }) => {
      let sameTxn: (ImportPreviewRow & { _excel_row: number })[];
      // Use gl_id to reliably find all lines of the split transaction, even if transaction_number is missing
      if (expectedBankLine.gl_id !== undefined && expectedBankLine.gl_id !== null) {
        sameTxn = unmatchedExpected.filter(e => e.gl_id === expectedBankLine.gl_id);
      } else if (expectedBankLine.transaction_number) {
        sameTxn = unmatchedExpected.filter(e => e.transaction_number === expectedBankLine.transaction_number);
      } else {
        sameTxn = [expectedBankLine];
      }

      const origSign = Math.sign(origAmount) || 1;
      const oppositeLines = sameTxn.filter(e => Math.sign(getAmount(e)) !== origSign && getAmount(e) !== 0);
      const sameLines = sameTxn.filter(e => Math.sign(getAmount(e)) === origSign || getAmount(e) === 0);
      
      if (oppositeLines.length > 0) {
        matchedExpRows = oppositeLines;
        matchedSameLines = sameLines;
      } else if (sameLines.length > 0) {
        matchedExpRows = [sameLines[0]];
      }
    };

    // Second try: Exact match (1-to-1) using findIndex to avoid capturing duplicates
    if (matchedExpRows.length === 0) {
      const exactIndex = unmatchedExpected.findIndex(
        (exp) => exp.date === origDate && getAmount(exp) === origAmount && normalizeText(exp.name) === origNormName
      );
      if (exactIndex !== -1) {
        extractSplitsFromExpectedBankLine(unmatchedExpected[exactIndex]);
      }
    }

    // Third try: Match by date and amount only (1-to-1)
    if (matchedExpRows.length === 0) {
      const partialIndex = unmatchedExpected.findIndex(
        (exp) => exp.date === origDate && getAmount(exp) === origAmount
      );
      if (partialIndex !== -1) {
        extractSplitsFromExpectedBankLine(unmatchedExpected[partialIndex]);
      }
    }

    // Remove matched from unmatched pool
    [...matchedExpRows, ...matchedSameLines].forEach((exp) => {
      const idx = unmatchedExpected.indexOf(exp);
      if (idx !== -1) unmatchedExpected.splice(idx, 1);
    });

    const getExpectedAccount = (e: ImportPreviewRow) => {
      const extra = e as ImportPreviewRow & { Split?: string; split?: string; split_account_name?: string };
      return extra.Split || extra.split || extra.split_account_name || e.account_review?.current_target_account_name || e.account_review?.current_target_account_number || e.account_name || e.account_number;
    };

    const expectedAccount = matchedExpRows.length === 1 
      ? getExpectedAccount(matchedExpRows[0])
      : matchedExpRows.length > 1 ? matchedExpRows.map(e => getExpectedAccount(e)).filter(Boolean).join(" | ") : null;
    // The dry run account comes from account_review or fallback to account_name
    const dryRunAccount = origRow.account_review?.suggested_account_name 
      || origRow.account_review?.suggested_account_number 
      || origRow.account_name 
      || origRow.account_number;

    let source = origRow.account_review?.source || null;

    // Check if the source or matched rule indicates an internal bank/bank transfer rule
    const ruleStr = (() => {
      const matchedRule = origRow.account_review?.matched_rule as unknown;
      if (typeof matchedRule === "string") return matchedRule.toLowerCase();
      if (matchedRule && typeof matchedRule === "object") return JSON.stringify(matchedRule).toLowerCase();
      return "";
    })();

    const isInternalBankRule = (
      (source && (
        source.toLowerCase().includes("internal bank") ||
        source.toLowerCase().includes("bank rule") ||
        source.toLowerCase().includes("bank feed") ||
        source.toLowerCase().includes("bank_transfer")
      )) ||
      ruleStr.includes("bank_transfer") ||
      ruleStr.includes("bank_service_charge") ||
      ruleStr.includes("internal_bank")
    );

    if (isInternalBankRule) {
      source = "bank_transfer";
    }

    const confidence = origRow.account_review?.confidence || null;

    let status: GLSplitCompareStatus = "MATCH";
    let differenceReason: string | null = null;
    let isSuspicious = false;

    if (matchedExpRows.length === 0) {
      status = "NOT_FOUND";
      differenceReason = "Row not found in expected file.";
      isSuspicious = true;
      summary.missing_rows++;
    } else {
      // Compare absolute sums to handle opposite lines
      const expSum = matchedExpRows.reduce((acc, exp) => acc + getAmount(exp), 0);
      if (Math.abs(Math.abs(expSum) - Math.abs(origAmount)) >= 0.01) {
        status = "AMOUNT_MISMATCH";
        differenceReason = `Amount mismatch: Expected absolute ${Math.abs(expSum).toFixed(2)}, got ${Math.abs(origAmount).toFixed(2)}`;
        isSuspicious = true;
        summary.amount_mismatch_rows++;
      } else if (matchedExpRows.length > 1 && (!dryRunAccount || !dryRunAccount.includes("|"))) {
        status = "SPLIT_TOTAL_MISMATCH";
        differenceReason = `Original transaction predicted '${dryRunAccount}', but expected file is split: ${expectedAccount}.`;
        isSuspicious = true;
        summary.account_mismatch_rows++;
      } else if (expectedAccount !== dryRunAccount && expectedAccount !== null) {
        status = "ACCOUNT_MISMATCH";
        differenceReason = `Expected account '${expectedAccount}' but dry-run assigned '${dryRunAccount}'.`;
        isSuspicious = true;
        summary.account_mismatch_rows++;
      } else if (confidence !== null && confidence < confidenceThreshold) {
        status = "LOW_CONFIDENCE";
        differenceReason = `Confidence (${confidence.toFixed(2)}) is below threshold (${confidenceThreshold}).`;
        isSuspicious = true;
      } else if (!origRow.date) {
        status = "SUSPICIOUS";
        differenceReason = "Date is missing.";
        isSuspicious = true;
      }
    }

    if (isSuspicious) {
      summary.suspicious_rows++;
    } else {
      summary.matched_rows++;
    }

    if (!source) {
      const extra = origRow as ImportPreviewRow & { split_account_number?: string; ledger_account_number?: string };
      if (extra.split_account_number || extra.ledger_account_number) {
        source = "lookup";
      } else {
        source = "unmapped";
      }
    }

    results.push({
      row_number: (origRow as ImportPreviewRow & { _excel_row: number })._excel_row,
      date: origDate,
      transaction_type: origRow.type || null,
      name: origRow.name || null,
      memo: origRow.memo || null,
      description: origRow.name || origRow.memo || "",
      amount: origAmount,
      expected_account: expectedAccount,
      dry_run_account: dryRunAccount,
      source,
      confidence,
      status,
      difference_reason: differenceReason,
      is_suspicious: isSuspicious,
      original_row: origRow,
      expected_rows: matchedExpRows,
    });
  });

  // Add any leftover unmatched expected rows as missing in dry run
  // Only report missing BANK transactions to keep the summary isolated to bank rows.
  unmatchedExpected.filter(isBankOrCreditCard).forEach((exp) => {
    const expAmount = getAmount(exp);
    results.push({
      row_number: results.length + 1,
      date: exp.date || null,
      transaction_type: exp.type || null,
      name: exp.name || null,
      memo: exp.memo || null,
      description: exp.name || exp.memo || "",
      amount: expAmount,
      expected_account: exp.account_name || exp.account_number,
      dry_run_account: null,
      source: null,
      confidence: null,
      status: "NOT_FOUND",
      difference_reason: "Row exists in expected file but not in original file.",
      is_suspicious: true,
      original_row: null,
      expected_rows: [exp],
    });
    summary.missing_rows++;
    summary.suspicious_rows++;
  });

  summary.total_rows = originalRows.length;
  summary.match_rate = summary.total_rows > 0 ? (summary.matched_rows / summary.total_rows) * 100 : 0;

  const sourceStats: Record<string, { total: number; matched: number }> = {
    [WORKFLOW_LABELS.LOOKUP]: { total: 0, matched: 0 },
    [WORKFLOW_LABELS.QB_RULES]: { total: 0, matched: 0 },
    [WORKFLOW_LABELS.BANK_RULES]: { total: 0, matched: 0 },
    [WORKFLOW_LABELS.XGBOOST]: { total: 0, matched: 0 },
    [WORKFLOW_LABELS.AI]: { total: 0, matched: 0 },
    [WORKFLOW_LABELS.MANUAL]: { total: 0, matched: 0 },
  };

  results.forEach((row) => {
    // Only track accuracy for rows that had a prediction
    if (row.status === "NOT_FOUND" && !row.dry_run_account) return;
    
    const label = getFriendlyLabel(row.source, row.original_row?.account_review?.matched_rule);
    sourceStats[label].total++;
    if (row.status === "MATCH") {
      sourceStats[label].matched++;
    }
  });

  const accuracy_by_source = Object.entries(sourceStats).map(([source, stats]) => ({
    source,
    total: stats.total,
    matched: stats.matched,
    match_rate: stats.total > 0 ? (stats.matched / stats.total) * 100 : 0,
  }));

  const status_counts: Record<string, number> = {};
  results.forEach(row => {
    status_counts[row.status] = (status_counts[row.status] || 0) + 1;
  });

  summary.status_counts = status_counts;
  summary.accuracy_by_source = accuracy_by_source;

  return {
    summary,
    rows: results,
  };
}
