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

  return isLedgerBankOrCard || isSplitBankOrCard || !!row.is_bank_line;
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
  // If it's a dry run, we prefer the suggestion over anything else
  if (isDryRun && (row.account_review?.suggested_account_name || row.account_review?.suggested_account_number)) {
    const sNum = row.account_review.suggested_account_number;
    const sName = row.account_review.suggested_account_name;
    if (sNum && sName && String(sName).indexOf(String(sNum)) === -1) return `${sNum} · ${sName}`;
    return sNum && sName ? `${sNum} · ${sName}` : sNum || sName || null;
  }

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

  let tNum: string | null = null;
  let tName: string | null = null;
  const extra = row as any;

  // If the ledger is bank/card, the target is the split
  if (isLedgerBankOrCard) {
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

  if (tNum && tName && String(tName).indexOf(String(tNum)) === -1) return `${tNum} · ${tName}`;
  if (tNum && tName) return `${tNum} · ${tName}`;
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
    
    // First try: Match by transaction number
    let matchedExpRows: (ImportPreviewRow & { _excel_row: number })[] = [];
    let matchedSameLines: (ImportPreviewRow & { _excel_row: number })[] = [];

    if (origRow.transaction_number) {
      const sameTxn = unmatchedExpected.filter(e => e.transaction_number === origRow.transaction_number);
      if (sameTxn.length > 0) {
        let bankLines = sameTxn.filter(e => isBankOrCreditCard(e));
        let expenseLines = sameTxn.filter(e => !isBankOrCreditCard(e));
        
        if (expenseLines.length === 0 && bankLines.length > 1) {
          const origSign = Math.sign(origAmount) || 1;
          expenseLines = bankLines.filter(e => Math.sign(getAmount(e)) !== origSign && getAmount(e) !== 0);
          bankLines = bankLines.filter(e => Math.sign(getAmount(e)) === origSign || getAmount(e) === 0);
        }
        
        if (expenseLines.length > 0) {
          matchedExpRows = expenseLines;
          matchedSameLines = bankLines; // We will remove these from unmatched so they don't show as NOT FOUND
        } else if (bankLines.length > 0) {
          matchedExpRows = [bankLines[0]];
          matchedSameLines = bankLines.slice(1);
        } else if (sameTxn.length > 0) {
          matchedExpRows = [sameTxn[0]];
          matchedSameLines = sameTxn.slice(1);
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
        // Fallback for QBO exports parsed as Amex statements (no transaction numbers):
        // Find adjacent rows with the same Date and exactly the OPPOSITE amount.
        sameTxn = [expectedBankLine];
        const currentIndex = expectedRowsWithLine.findIndex(r => r._excel_row === expectedBankLine._excel_row);
        if (currentIndex !== -1) {
          const oppositeAmount = -getAmount(expectedBankLine);
          
          // Check up to 5 rows above and below
          for (const direction of [-1, 1]) {
            for (let i = 1; i <= 5; i++) {
              const idx = currentIndex + (i * direction);
              if (idx < 0 || idx >= expectedRowsWithLine.length) break;
              
              const r = expectedRowsWithLine[idx];
              if (r.date !== expectedBankLine.date) break; // Break if we leave the contiguous date block
              
              if (Math.abs(getAmount(r) - oppositeAmount) < 0.005) {
                const uMatch = unmatchedExpected.find(u => u._excel_row === r._excel_row);
                if (uMatch && uMatch._excel_row !== expectedBankLine._excel_row) {
                  sameTxn.push(uMatch);
                }
              }
            }
          }
        }
      }

      let bankLines = sameTxn.filter(e => isBankOrCreditCard(e));
      let expenseLines = sameTxn.filter(e => !isBankOrCreditCard(e));
      
      // If the expected file was forcefully parsed as a bank statement, EVERYTHING is a bank line.
      // We must fallback to using mathematical signs to separate the true bank line from the true expense line.
      if (expenseLines.length === 0 && bankLines.length > 1) {
        const origSign = Math.sign(origAmount) || 1;
        expenseLines = bankLines.filter(e => Math.sign(getAmount(e)) !== origSign && getAmount(e) !== 0);
        bankLines = bankLines.filter(e => Math.sign(getAmount(e)) === origSign || getAmount(e) === 0);
      }
      
      if (expenseLines.length > 0) {
        matchedExpRows = expenseLines;
        matchedSameLines = bankLines;
      } else if (bankLines.length > 0) {
        matchedExpRows = [bankLines[0]];
        matchedSameLines = bankLines.slice(1);
      } else if (sameTxn.length > 0) {
        matchedExpRows = [sameTxn[0]];
        matchedSameLines = sameTxn.slice(1);
      }
    };

    // Second try: Exact match (1-to-1) using findIndex to avoid capturing duplicates
    if (matchedExpRows.length === 0) {
      const exactIndex = unmatchedExpected.findIndex(
        (exp) => exp.date === origDate && Math.abs(getAmount(exp) - origAmount) < 0.005 && normalizeText(exp.name) === origNormName
      );
      if (exactIndex !== -1) {
        extractSplitsFromExpectedBankLine(unmatchedExpected[exactIndex]);
      }
    }

    // Third try: Match by date and amount only (1-to-1)
    if (matchedExpRows.length === 0) {
      const partialIndex = unmatchedExpected.findIndex(
        (exp) => exp.date === origDate && Math.abs(getAmount(exp) - origAmount) < 0.005
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

    const expectedAccount = matchedExpRows.length === 1 
      ? getTargetAccount(matchedExpRows[0])
      : matchedExpRows.length > 1 ? matchedExpRows.map(e => getTargetAccount(e)).filter(Boolean).join(" | ") : null;
    
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
      debit: origRow.debit,
      credit: origRow.credit,
      charge_account: getChargeAccount(origRow),
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
