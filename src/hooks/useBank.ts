import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  companyService, bankService, bankAccountService, statementService, checkService, depositService,
} from "../services/bankService";
import {
  
  type Company, type CompanyCreate, type CompanyUpdate,
  type Bank, type BankCreate, type BankUpdate,
  type BankAccount, type BankAccountCreate, type BankAccountUpdate,
  type BankStatement, type StatementCreate, type StatementUpdate,
  type CheckTransaction, type CheckCreate, type CheckUpdate,
  type DepositTransaction, type DepositCreate, type DepositUpdate,
  type QuarterlySummary, type StatementPreview,
  type Summary, type SummaryPeriod
} from "../types/bank";
import { queryKeys } from '../services/queryKeys';

// ─── Company ──────────────────────────────────────────────────────────────────
 
export function useCompanies() {
  return useQuery<Company[]>({ queryKey: queryKeys.companies(), queryFn: companyService.getCompanies });
}

export function useCompanyEntities() {
  return useQuery<string[]>({
    queryKey: queryKeys.companyEntities(),
    queryFn: companyService.getEntities,
  });
}
 
export function useCompany(id: number | null) {
  return useQuery<Company>({
    queryKey: queryKeys.company(id!),
    queryFn:  () => companyService.getCompany(id!),
    enabled:  id != null,
  });
}
 
export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation<Company, Error, CompanyCreate>({
    mutationFn: companyService.createCompany,
    onSuccess:  () => qc.invalidateQueries({ queryKey: queryKeys.companies() }),
  });
}
 
export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation<Company, Error, { id: number; data: CompanyUpdate }>({
    mutationFn: ({ id, data }) => companyService.updateCompany(id, data),
    onSuccess:  (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.companies() });
      qc.invalidateQueries({ queryKey: queryKeys.company(id) });
    },
  });
}
 
export function useDeleteCompany() {
  const qc = useQueryClient();
  return useMutation<null, Error, number>({
    mutationFn: companyService.deleteCompany,
    onSuccess:  () => qc.invalidateQueries({ queryKey: queryKeys.companies() }),
  });
}
 
// ─── Bank ─────────────────────────────────────────────────────────────────────
 
export function useBanks() {
  return useQuery<Bank[]>({ queryKey: queryKeys.banks(), queryFn: bankService.getBanks });
}
 
export function useBank(id: number | null) {
  return useQuery<Bank>({
    queryKey: queryKeys.bank(id!),
    queryFn:  () => bankService.getBank(id!),
    enabled:  id != null,
  });
}
 
export function useCreateBank() {
  const qc = useQueryClient();
  return useMutation<Bank, Error, BankCreate>({
    mutationFn: bankService.createBank,
    onSuccess:  () => qc.invalidateQueries({ queryKey: queryKeys.banks() }),
  });
}
 
export function useUpdateBank() {
  const qc = useQueryClient();
  return useMutation<Bank, Error, { id: number; data: BankUpdate }>({
    mutationFn: ({ id, data }) => bankService.updateBank(id, data),
    onSuccess:  (_, { id }) => {
      qc.invalidateQueries({ queryKey: queryKeys.banks() });
      qc.invalidateQueries({ queryKey: queryKeys.bank(id) });
    },
  });
}
 
export function useDeleteBank() {
  const qc = useQueryClient();
  return useMutation<null, Error, number>({
    mutationFn: bankService.deleteBank,
    onSuccess:  () => qc.invalidateQueries({ queryKey: queryKeys.banks() }),
  });
}
 
// ─── Bank Account ─────────────────────────────────────────────────────────────
 
export function useBankAccounts(companyId?: number | null) {
  return useQuery<BankAccount[]>({
    queryKey: queryKeys.bankAccounts(companyId),
    queryFn:  () => bankAccountService.getBankAccounts(companyId),
  });
}
 
export function useBankAccount(id: number | null) {
  return useQuery<BankAccount>({
    queryKey: queryKeys.bankAccount(id!),
    queryFn:  () => bankAccountService.getBankAccount(id!),
    enabled:  id != null,
  });
}
 
export function useCreateBankAccount() {
  const qc = useQueryClient();
  return useMutation<BankAccount, Error, BankAccountCreate>({
    mutationFn: bankAccountService.createBankAccount,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["bank-accounts"] }),
  });
}
 
export function useUpdateBankAccount() {
  const qc = useQueryClient();
  return useMutation<BankAccount, Error, { id: number; data: BankAccountUpdate }>({
    mutationFn: ({ id, data }) => bankAccountService.updateBankAccount(id, data),
    onSuccess:  (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["bank-accounts"] });
      qc.invalidateQueries({ queryKey: queryKeys.bankAccount(id) });
    },
  });
}
 
export function useDeleteBankAccount() {
  const qc = useQueryClient();
  return useMutation<null, Error, number>({
    mutationFn: bankAccountService.deleteBankAccount,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["bank-accounts"] }),
  });
}
 
// ─── Bank Statement ───────────────────────────────────────────────────────────
 
export function useStatements(accountId?: number | null) {
  return useQuery<BankStatement[]>({
    queryKey: queryKeys.statements(accountId),
    queryFn:  () => statementService.getStatements(accountId),
  });
}
 
export function useStatement(id: number | null) {
  return useQuery<BankStatement>({
    queryKey: queryKeys.statement(id!),
    queryFn:  () => statementService.getStatement(id!),
    enabled:  id != null,
  });
}
 
export function useStatementsByQuarter(year: number, quarter: number, accountId?: number | null) {
  return useQuery<BankStatement[]>({
    queryKey: queryKeys.byQuarter(year, quarter, accountId),
    queryFn:  () => statementService.getStatementsByQuarter(year, quarter, accountId),
    enabled:  !!year && !!quarter,
  });
}
 
export function useQuarterlySummary(
  year: number | null,
  companyId?: number | null,
  accountId?: number | null,
) {
  return useQuery<QuarterlySummary[]>({
    queryKey: queryKeys.quarterlySummary(year!, companyId, accountId),
    queryFn:  () => statementService.getQuarterlySummary(year!, companyId, accountId),
    enabled:  year != null,
  });
}

export function useSummary(
  period: SummaryPeriod,
  year: number | null,
  companyId?: number | null,
  accountId?: number | null,
) {
  return useQuery<Summary[]>({
    queryKey: queryKeys.summary(period, year!, companyId, accountId),
    queryFn:  () => statementService.getSummary(period, year!, companyId, accountId),
    enabled:  year != null,
  });
}
 
export function useCreateStatement() {
  const qc = useQueryClient();
  return useMutation<BankStatement, Error, StatementCreate>({
    mutationFn: statementService.createStatement,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["statements"] }),
  });
}
 
export function useUpdateStatement() {
  const qc = useQueryClient();
  return useMutation<BankStatement, Error, { id: number; data: StatementUpdate }>({
    mutationFn: ({ id, data }) => statementService.updateStatement(id, data),
    onSuccess:  (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["statements"] });
      qc.invalidateQueries({ queryKey: queryKeys.statement(id) });
    },
  });
}
 
export function useDeleteStatement() {
  const qc = useQueryClient();
  return useMutation<null, Error, number>({
    mutationFn: statementService.deleteStatement,
    onSuccess:  () => qc.invalidateQueries({ queryKey: ["statements"] }),
  });
}
 
export function useUploadStatement() {
  const qc = useQueryClient();
  return useMutation<
    BankStatement[],
    Error,
    { accountId: number; bankType: string; file: File; tesseractCmd?: string | null }
  >({
    mutationFn: ({ accountId, bankType, file, tesseractCmd }) =>
      statementService.uploadStatement(accountId, bankType, file, tesseractCmd),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["statements"] }),
  });
}

// Parse a PDF for review — returns extracted data without persisting it.
export function usePreviewStatement() {
  return useMutation<
    StatementPreview[],
    Error,
    { accountId: number; bankType: string; file: File; tesseractCmd?: string | null }
  >({
    mutationFn: ({ accountId, bankType, file, tesseractCmd }) =>
      statementService.previewStatement(accountId, bankType, file, tesseractCmd),
  });
}

// Persist a reviewed preview to the database.
export function useCommitStatement() {
  const qc = useQueryClient();
  return useMutation<BankStatement[], Error, StatementPreview[]>({
    mutationFn: statementService.commitStatement,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["statements"] }),
  });
}
 
// ─── Check Transactions ───────────────────────────────────────────────────────
 
export function useChecks(statementId: number | null, section?: string | null) {
  return useQuery<CheckTransaction[]>({
    queryKey: queryKeys.statementChecks(statementId!, section),
    queryFn:  () => checkService.getChecks(statementId!, section),
    enabled:  statementId != null,
  });
}
 
export function useCreateCheck() {
  const qc = useQueryClient();
  return useMutation<CheckTransaction, Error, CheckCreate>({
    mutationFn: checkService.createCheck,
    onSuccess:  (_, vars) =>
      qc.invalidateQueries({ queryKey: ["statements", vars.statement_id, "checks"] }),
  });
}
 
export function useUpdateCheck() {
  const qc = useQueryClient();
  return useMutation<CheckTransaction, Error, { id: number; data: CheckUpdate }>({
    mutationFn: ({ id, data }) => checkService.updateCheck(id, data),
    onSuccess:  (res) =>
      qc.invalidateQueries({ queryKey: ["statements", res.statement_id, "checks"] }),
  });
}
 
export function useDeleteCheck() {
  const qc = useQueryClient();
  return useMutation<null, Error, { id: number; statementId: number }>({
    mutationFn: ({ id }) => checkService.deleteCheck(id),
    onSuccess:  (_, { statementId }) =>
      qc.invalidateQueries({ queryKey: ["statements", statementId, "checks"] }),
  });
}
 
// ─── Deposit Transactions ─────────────────────────────────────────────────────
 
export function useDeposits(statementId: number | null, section?: string | null) {
  return useQuery<DepositTransaction[]>({
    queryKey: queryKeys.statementDeposits(statementId!, section),
    queryFn:  () => depositService.getDeposits(statementId!, section),
    enabled:  statementId != null,
  });
}
 
export function useCreateDeposit() {
  const qc = useQueryClient();
  return useMutation<DepositTransaction, Error, DepositCreate>({
    mutationFn: depositService.createDeposit,
    onSuccess:  (_, vars) =>
      qc.invalidateQueries({ queryKey: ["statements", vars.statement_id, "deposits"] }),
  });
}
 
export function useUpdateDeposit() {
  const qc = useQueryClient();
  return useMutation<DepositTransaction, Error, { id: number; data: DepositUpdate }>({
    mutationFn: ({ id, data }) => depositService.updateDeposit(id, data),
    onSuccess:  (res) =>
      qc.invalidateQueries({ queryKey: ["statements", res.statement_id, "deposits"] }),
  });
}
 
export function useDeleteDeposit() {
  const qc = useQueryClient();
  return useMutation<null, Error, { id: number; statementId: number }>({
    mutationFn: ({ id }) => depositService.deleteDeposit(id),
    onSuccess:  (_, { statementId }) =>
      qc.invalidateQueries({ queryKey: ["statements", statementId, "deposits"] }),
  });
}
