export interface Company {
  id: number;
  name: string;
  entity: string | null;
  description: string | null;
  created_at: string;
}
 
export interface Bank {
  id: number;
  name: string;
  type: string;
  notes: string | null;
  created_at: string;
}
 
export interface BankAccount {
  id: number;
  company_id: number;
  bank_id: number;
  account_number: string;
  created_at: string;
  company_name: string;
  bank_name: string;
  bank_type: string;  // joined from bank.type
}
 
export interface BankStatement {
  id: number;
  account_id: number;
  statement_date: string;
  statement_year: number;
  statement_month: number;
  statement_quarter: number;
  beginning_balance: number;
  total_additions: number;
  total_subtractions: number;
  ending_balance: number;
  created_at: string;
  company_name: string;
  bank_name: string;
  account_number: string;
}
 
export interface CheckTransaction {
  id: number;
  statement_id: number;
  section: string;
  date: string | null;
  check_number: string | null;
  type: string | null;
  paid_to: string | null;
  reference: string | null;
  amount: number | null;
}
 
export interface DepositTransaction {
  id: number;
  statement_id: number;
  section: string;
  date: string | null;
  deposit_id: string | null;
  received_from: string | null;
  reference: string | null;
  amount: number | null;
}
 
export interface QuarterlySummary {
  company_name: string;
  account_number: string;
  bank_name: string;
  statement_year: number;
  statement_quarter: number;
  total_in: number;
  total_out: number;
  closing_balance: number;
  statement_count: number;
}
 
// ─── Statement preview (parse-only, not yet persisted) ─────────────────────────

export interface PreviewCheckTransaction {
  section: string;
  date: string | null;
  check_number: string | null;
  type: string | null;
  paid_to: string | null;
  reference: string | null;
  amount: number | null;
}

export interface PreviewDepositTransaction {
  section: string;
  date: string | null;
  deposit_id: string | null;
  received_from: string | null;
  reference: string | null;
  amount: number | null;
}

export interface StatementPreview {
  account_id: number;
  company_name: string | null;
  bank_name: string | null;
  account_number: string | null;
  statement_date: string;
  beginning_balance: number;
  total_additions: number;
  total_subtractions: number;
  ending_balance: number;
  checks: PreviewCheckTransaction[];
  deposits: PreviewDepositTransaction[];
}

// ─── Request payload types ────────────────────────────────────────────────────
 
export interface CompanyCreate     { name: string; entity?: string | null; description?: string | null; }
export interface CompanyUpdate     { name?: string; entity?: string | null; description?: string | null; }
export interface BankCreate        { name: string; type: string; notes?: string | null; }
export interface BankUpdate        { name?: string; type?: string; notes?: string | null; }
export interface BankAccountCreate { company_id: number; bank_id: number; account_number: string; }
export interface BankAccountUpdate { company_id?: number; bank_id?: number; account_number?: string; }
export interface StatementCreate {
  account_id: number; statement_date: string;
  beginning_balance: number; total_additions: number;
  total_subtractions: number; ending_balance: number;
}
export interface StatementUpdate {
  beginning_balance?: number; total_additions?: number;
  total_subtractions?: number; ending_balance?: number;
}
export interface CheckCreate {
  statement_id: number; section: string; date?: string | null;
  check_number?: string | null; type?: string | null;
  paid_to?: string | null; reference?: string | null; amount?: number | null;
}
export interface CheckUpdate {
  section?: string; date?: string | null; check_number?: string | null;
  type?: string | null; paid_to?: string | null; reference?: string | null; amount?: number | null;
}
export interface DepositCreate {
  statement_id: number; section: string; date?: string | null;
  deposit_id?: string | null; received_from?: string | null;
  reference?: string | null; amount?: number | null;
}
export interface DepositUpdate {
  section?: string; date?: string | null; deposit_id?: string | null;
  received_from?: string | null; reference?: string | null; amount?: number | null;
}