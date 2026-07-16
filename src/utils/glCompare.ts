import type { ImportPreviewRow } from "@/types/gl";
import type { GLSplitComparisonResult, GLSplitComparisonRow, GLSplitCompareStatus, GLSplitComparisonSummary } from "@/types/glCompare";

function normalizeText(text?: string | null): string {
  return (text || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

const WORKFLOW_LABELS = {
  CONTACTS: "A/R customers, A/P Payees",
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
  
  if (src.includes("contact")) {
    return WORKFLOW_LABELS.CONTACTS;
  }
  
  if (
    src.includes("lookup") ||
    src.includes("semantic") ||
    src.includes("coa_semantic_match")
  ) {
    return WORKFLOW_LABELS.LOOKUP;
  }
  
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
  const ledgerType = (
    (row as any).ledger_account_type ||
    (row as any).account_type ||
    ""
  ).toLowerCase().trim().replace(/[\s_-]+/g, "");

  const splitType = (
    (row as any).split_account_type ||
    ""
  ).toLowerCase().trim().replace(/[\s_-]+/g, "");

  if (ledgerType) {
    return ledgerType === "bank" || ledgerType === "creditcard" || ledgerType === "cc";
  }

  const isSplitBankOrCard = splitType === "bank" || splitType === "creditcard";
  const bankNameRegex = /\b(boa|bank of america|checking|savings|money market|bank|cash|credit card)\b/i;
  const ledgerName = String((row as any).ledger_account_name || "").toLowerCase();
  const isNameBankOrCard = bankNameRegex.test(ledgerName);

  return isSplitBankOrCard || isNameBankOrCard || !!row.is_bank_line;
}

export function getChargeAccount(row: ImportPreviewRow): string {
  const ledgerType = (
    (row as any).ledger_account_type ||
    (row as any).account_type ||
    ""
  ).toLowerCase().trim().replace(/[\s_-]+/g, "");

  const splitType = (
    (row as any).split_account_type ||
    ""
  ).toLowerCase().trim().replace(/[\s_-]+/g, "");

  const isLedgerBankOrCard = ledgerType === "bank" || ledgerType === "creditcard";
  const isSplitBankOrCard = splitType === "bank" || splitType === "creditcard";

  const formatAccount = (num: string | null | undefined, name: string | null | undefined) => {
    if (num && name && String(name).indexOf(String(num)) === -1) return `${num} · ${name}`;
    if (num && name) return `${num} · ${name}`;
    return num || name || "Unassigned Bank Account";
  };

  if (isLedgerBankOrCard) {
    return formatAccount((row as any).ledger_account_number || row.account_number, (row as any).ledger_account_name || row.account_name);
  }
  if (isSplitBankOrCard) {
    const extra = row as any;
    return formatAccount(extra.split_account_number || row.account_number, extra.split_account_name || row.account_name);
  }
  return formatAccount((row as any).ledger_account_number || row.account_number, (row as any).ledger_account_name || row.account_name);
}

export function getTargetAccount(row: ImportPreviewRow, isDryRun: boolean = false): string | null {
  // If we have a user/AI approved state change, it strongly overrides anything else
  if (isDryRun && row.account_review?.approved_account) {
    return row.account_review.approved_account;
  }

  // If it's a dry run, we prefer the suggestion over anything else
  if (isDryRun && (row.account_review?.suggested_account_name || row.account_review?.suggested_account_number)) {
    const sNum = row.account_review.suggested_account_number;
    const sName = row.account_review.suggested_account_name;
    if (sNum && sName && String(sName).indexOf(String(sNum)) === -1) return `${sNum} ${sName}`;
    return sNum && sName ? `${sNum} ${sName}` : sNum || sName || null;
  }


  const splitType = (
    (row as any).split_account_type ||
    ""
  ).toLowerCase().trim().replace(/[\s_-]+/g, "");

  const isLedgerBankOrCard = isBankOrCreditCard(row);
  const isSplitBankOrCard = splitType === "bank" || splitType === "creditcard";

  let tNum: string | null = null;
  let tName: string | null = null;
  const extra = row as any;

  if (isDryRun) {
    tNum = row.account_review?.current_target_account_number || null;
    tName = row.account_review?.current_target_account_name || null;
  }
  // If the ledger is bank/card, the target is the split
  else if (isLedgerBankOrCard) {
    tNum = extra.split_account_number || row.account_review?.current_target_account_number || null;
    tName = extra.Split || extra.split || extra.split_account_name || row.account_review?.current_target_account_name || null;
  }
  // If the split is bank/card, the target is the ledger
  else if (isSplitBankOrCard) {
    tNum = row.account_number || null;
    tName = row.account_name || null;
  }
  // Fallback
  else {
    tNum = extra.split_account_number || row.account_number || null;
    tName = extra.split_account_name || row.account_name || null;
  }

  if (tNum && tName && String(tName).indexOf(String(tNum)) === -1) return `${tNum} ${tName}`;
  if (tNum && tName) return `${tNum} ${tName}`;
  return tNum || tName || null;
}

export function compareGLSplitResults(
  originalRowsAll: ImportPreviewRow[],
  expectedRowsAll: ImportPreviewRow[]
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
    
    // No grouping logic: purely match exactly 1 expected row per original row
    let matchedExpRow: (ImportPreviewRow & { _excel_row: number }) | undefined;

    // First try: Match by transaction number and amount
    if (origRow.transaction_number) {
      matchedExpRow = unmatchedExpected.find(e => e.transaction_number === origRow.transaction_number && Math.abs(getAmount(e) - origAmount) < 0.005 && isBankOrCreditCard(e));
      if (!matchedExpRow) {
         matchedExpRow = unmatchedExpected.find(e => e.transaction_number === origRow.transaction_number && Math.abs(getAmount(e) - origAmount) < 0.005);
      }
    }

    // Second try: Exact match date, amount, name
    if (!matchedExpRow) {
      matchedExpRow = unmatchedExpected.find(
        (exp) => exp.date === origDate && Math.abs(getAmount(exp) - origAmount) < 0.005 && normalizeText(exp.name) === origNormName && isBankOrCreditCard(exp)
      );
      if (!matchedExpRow) {
         matchedExpRow = unmatchedExpected.find(
           (exp) => exp.date === origDate && Math.abs(getAmount(exp) - origAmount) < 0.005 && normalizeText(exp.name) === origNormName
         );
      }
    }

    // Third try: Date and amount
    if (!matchedExpRow) {
      matchedExpRow = unmatchedExpected.find(e => 
        e.date === origRow.date && Math.abs(getAmount(e) - origAmount) < 0.005 && isBankOrCreditCard(e)
      );
      if (!matchedExpRow) {
         matchedExpRow = unmatchedExpected.find(e => 
           e.date === origRow.date && Math.abs(getAmount(e) - origAmount) < 0.005
         );
      }
    }

    let matchedExpRows: (ImportPreviewRow & { _excel_row: number })[] = [];
    let matchedSameLines: (ImportPreviewRow & { _excel_row: number })[] = [];
    
    if (matchedExpRow) {
      matchedExpRows = [matchedExpRow];
      // Remove matched from unmatched pool
      const idx = unmatchedExpected.indexOf(matchedExpRow);
      if (idx !== -1) unmatchedExpected.splice(idx, 1);
    }

    const getExpectedTargetAccount = (exp: ImportPreviewRow & { _excel_row: number }) => {
      if (isBankOrCreditCard(exp)) return getTargetAccount(exp);
      const extra = exp as any;
      const eNum = exp.account_number || extra.ledger_account_number;
      const eName = exp.account_name || extra.ledger_account_name;
      
      if (eNum && eName && String(eName).indexOf(String(eNum)) === -1) return `${eNum} ${eName}`;
      return eNum && eName ? `${eNum} ${eName}` : eNum || eName || null;
    };

    let expectedAccount: string | null = null;
    const matchedBankLine = matchedSameLines.find(e => isBankOrCreditCard(e)) || matchedExpRows.find(e => isBankOrCreditCard(e));
    
    if (matchedBankLine) {
      const extra = matchedBankLine as any;
      const tName = extra.Split || extra.split || extra.split_account_name || null;
      const tNum = extra.split_account_number || matchedBankLine.account_review?.current_target_account_number || null;
      if (tNum && tName && String(tName).indexOf(String(tNum)) === -1) {
        expectedAccount = `${tNum} ${tName}`;
      } else {
        expectedAccount = tNum && tName ? `${tNum} ${tName}` : tNum || tName || null;
      }
      
      // If the Excel file literally had a blank Split column, we respect that and leave expectedAccount as null/blank
      if (!tName && !tNum) {
        expectedAccount = null;
      }
    } else {
      expectedAccount = matchedExpRows.length === 1 
        ? getExpectedTargetAccount(matchedExpRows[0])
        : matchedExpRows.length > 1 ? matchedExpRows.map(e => getExpectedTargetAccount(e)).filter(Boolean).join(" | ") : null;
    }
    
    // The dry run account comes from account_review or fallback to account_name
    const dryRunAccount = getTargetAccount(origRow, true);

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
      } else {
        const getSplitCount = (acc: string | null, rows?: any[]) => {
          if (!acc || acc.trim() === "" || acc === "-") return 0;
          if (rows && rows.length > 1) return rows.length;
          if (acc.includes(" | ")) return acc.split(" | ").length;
          return 1;
        };

        const expCount = getSplitCount(expectedAccount, matchedExpRows);
        const dryCount = getSplitCount(dryRunAccount);

        const isExpMulti = expCount > 1;
        const isDryMulti = dryCount > 1;
        const isExpZero = expCount === 0;
        const isDryZero = dryCount === 0;

        if (isExpZero && !isDryZero) {
          status = "MISSING_SPLIT";
          differenceReason = `Expected file has no account, but Suggested Account is: ${dryRunAccount}.`;
          isSuspicious = true;
          summary.account_mismatch_rows++;
        } else if (isDryZero && !isExpZero) {
          status = "MISSING_SPLIT";
          differenceReason = `Suggested Account is empty, but Expected file has: ${expectedAccount}.`;
          isSuspicious = true;
          summary.account_mismatch_rows++;
        } else if (!isExpMulti && isDryMulti) {
          status = "MISSING_SPLIT";
          differenceReason = `Expected file has a single account, but Suggested Account is a split: ${dryRunAccount}.`;
          isSuspicious = true;
          summary.account_mismatch_rows++;
        } else if (!isDryMulti && isExpMulti) {
          status = "MISSING_SPLIT";
          differenceReason = `Suggested Account is a single account, but Expected file is a split: ${expectedAccount}.`;
          isSuspicious = true;
          summary.account_mismatch_rows++;
        } else if (expectedAccount !== dryRunAccount) {
          status = "ACCOUNT_MISMATCH";
          differenceReason = `Expected account '${expectedAccount}' does not match Suggested Account '${dryRunAccount}'.`;
          isSuspicious = true;
          summary.account_mismatch_rows++;
        } else if (!origRow.date) {
          status = "SUSPICIOUS";
          differenceReason = "Date is missing.";
          isSuspicious = true;
        }
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
      transaction_type: origRow.type || (origRow as any).transaction_type || null,
      name: origRow.name || null,
      memo: origRow.memo || null,
      description: origRow.name || origRow.memo || "",
      amount: origAmount,
      debit: origRow.debit,
      credit: origRow.credit,
      charge_account: getChargeAccount(origRow),
      expected_account: expectedAccount,
      dry_run_account: dryRunAccount,
      source: source === "ai" ? "AI Review" : source,
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
      transaction_type: exp.type || (exp as any).transaction_type || null,
      name: exp.name || null,
      memo: exp.memo || null,
      description: exp.name || exp.memo || "",
      amount: expAmount,
      debit: exp.debit,
      credit: exp.credit,
      charge_account: getChargeAccount(exp),
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
    [WORKFLOW_LABELS.CONTACTS]: { total: 0, matched: 0 },
    [WORKFLOW_LABELS.QB_RULES]: { total: 0, matched: 0 },
    [WORKFLOW_LABELS.LOOKUP]: { total: 0, matched: 0 },
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
