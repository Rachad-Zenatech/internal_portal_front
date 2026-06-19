// src/services/bankAccountService.ts
import type { BankAccount, BankAccounts } from '../types/bankAccount';
import { apiClient } from './apiClient';

export const getBankAccount = async (id: number) => {
  return apiClient.get<BankAccount>(`/accounting/bank-accounts/${id}`);
}

export const getBankAccounts = async () => {
  return apiClient.get<BankAccounts>(`/accounting/bank-accounts`);
}